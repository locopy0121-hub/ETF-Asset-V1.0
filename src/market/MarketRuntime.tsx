import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState,type AppStateStatus} from 'react-native';
import {
  createContext,type PropsWithChildren,useCallback,useContext,useEffect,useMemo,useRef,useState,
} from 'react';

import {FALLBACK_QUOTES,type RuntimeIntradayPoint,type RuntimeQuote} from '../finance/financeSeed';
import {
  clearNativeFugleApiKey,loadNativeFugleApiKey,nativeRuntimeAvailable,
  loadUnifiedMarketData,refreshUnifiedMarketData,saveNativeFugleApiKey,
  type UnifiedMarketSnapshot,
} from '../native/TfAssetNativeBridge';
import {marketRowsToRuntimeQuotes} from './unifiedMarketAdapter';
import {fetchTaiwanSecurityCatalog,type TaiwanSecurityInfo} from './TaiwanSecurityCatalog';

export type MarketPhase='live'|'afterHours'|'offline';
export type MarketRefreshResult='updated'|'unchanged'|'error';
export type MarketUpdateSource='AUTO';
export type EtfCatalogItem=TaiwanSecurityInfo;

type ProviderHealth=Readonly<{
  source:'FUGLE'|'TWSE_MIS'|'YAHOO'|'CACHE';
  availability:'READY'|'THROTTLED'|'COOLDOWN';
  consecutiveFailures:number;
  lastAttemptEpochMillis:number|null;
  lastSuccessEpochMillis:number|null;
  nextAllowedEpochMillis:number;
  circuitState:'HEALTHY'|'DEGRADED'|'COOLDOWN'|'RECOVERING';
}>;

export type MarketUpdateConfig=Readonly<{
  source:MarketUpdateSource;
  backendUrl?:string;
  scheduleEnabled:boolean;
  refreshOnForeground:boolean;
  stopAll:boolean;
  live:Readonly<{enabled:boolean;start:string;end:string;refreshSeconds:number}>;
  afterHours:Readonly<{enabled:boolean;start:string;end:string;refreshSeconds:number}>;
}>;

export const DEFAULT_MARKET_UPDATE:MarketUpdateConfig={
  source:'AUTO',
  scheduleEnabled:true,
  refreshOnForeground:true,
  stopAll:false,
  live:{enabled:true,start:'09:00',end:'13:30',refreshSeconds:1},
  afterHours:{enabled:true,start:'13:31',end:'18:00',refreshSeconds:60},
};

type PersistedMarketRuntime=Readonly<{
  schema:5;
  config:MarketUpdateConfig;
  catalog:readonly TaiwanSecurityInfo[];
  lastSuccessAt:number|null;
}>;

type MarketRuntimeValue=Readonly<{
  hydrated:boolean;
  config:MarketUpdateConfig;
  quotes:readonly RuntimeQuote[];
  phase:MarketPhase;
  refreshing:boolean;
  lastSuccessAt:number|null;
  lastError:string|null;
  catalog:readonly TaiwanSecurityInfo[];
  catalogRefreshing:boolean;
  marketDataVersion:number;
  missingSymbols:readonly string[];
  providerHealth:readonly ProviderHealth[];
  unresolvedSymbols:readonly string[];
  fugleConfigured:boolean;
  setConfig:(next:MarketUpdateConfig)=>void;
  refresh:(options?:{force?:boolean;silent?:boolean})=>Promise<MarketRefreshResult>;
  refreshCatalog:()=>Promise<void>;
  setTrackedSymbols:(symbols:readonly string[])=>void;
  saveFugleApiKey:(apiKey:string)=>Promise<boolean>;
  clearFugleApiKey:()=>Promise<boolean>;
}>;

const RUNTIME_STORAGE_KEY='@tf-asset/v4-market-runtime-native-saietf';
const PREVIOUS_RUNTIME_STORAGE_KEY='@tf-asset/v4-market-runtime';
const MarketRuntimeContext=createContext<MarketRuntimeValue|null>(null);

function fallbackCatalog():TaiwanSecurityInfo[]{
  return FALLBACK_QUOTES.map(row=>({
    symbol:row.symbol,name:row.name,companyName:null,market:'TWSE',industry:null,
    paidInCapitalTwd:null,issuedCommonShares:null,englishShortName:null,phone:null,website:null,
    listingDate:null,parValueText:null,chairman:null,generalManager:null,address:null,source:'bootstrap-only',
  }));
}
const sameStrings=(a:readonly string[],b:readonly string[])=>a.length===b.length&&a.every((value,index)=>value===b[index]);
const clampSeconds=(value:number)=>Math.max(1,Math.min(3600,Math.floor(Number(value)||1)));
const hhmm=(value:string)=>{
  const [hRaw='0',mRaw='0']=String(value||'00:00').split(':');
  const h=Number(hRaw),m=Number(mRaw);
  return Math.max(0,Math.min(1439,(Number.isFinite(h)?h:0)*60+(Number.isFinite(m)?m:0)));
};
const inWindow=(now:number,start:string,end:string)=>{
  const a=hhmm(start),b=hhmm(end);return a<=b?now>=a&&now<=b:now>=a||now<=b;
};
function taipeiClock(){
  try{
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:'Asia/Taipei',weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hourCycle:'h23',
    }).formatToParts(new Date());
    const get=(type:string)=>parts.find(part=>part.type===type)?.value??'';
    const weekday=get('weekday'),hour=Number(get('hour'))||0,minute=Number(get('minute'))||0;
    return {
      weekend:weekday==='Sat'||weekday==='Sun',
      minutes:hour*60+minute,
      date:`${get('year')}-${get('month')}-${get('day')}`,
    };
  }catch{
    const d=new Date();
    return {
      weekend:d.getDay()===0||d.getDay()===6,
      minutes:d.getHours()*60+d.getMinutes(),
      date:d.toISOString().slice(0,10),
    };
  }
}
export function resolveMarketPhase(config:MarketUpdateConfig):MarketPhase{
  if(config.stopAll||!config.scheduleEnabled)return 'offline';
  const clock=taipeiClock();if(clock.weekend)return 'offline';
  if(config.live.enabled&&inWindow(clock.minutes,config.live.start,config.live.end))return 'live';
  if(config.afterHours.enabled&&inWindow(clock.minutes,config.afterHours.start,config.afterHours.end))return 'afterHours';
  return 'offline';
}
export function marketRefreshSeconds(config:MarketUpdateConfig,phase:MarketPhase){
  return phase==='live'?clampSeconds(config.live.refreshSeconds):phase==='afterHours'?clampSeconds(config.afterHours.refreshSeconds):0;
}
function normalizeConfig(input:Partial<MarketUpdateConfig>|null|undefined):MarketUpdateConfig{
  return {
    source:'AUTO',
    ...(input?.backendUrl?{backendUrl:String(input.backendUrl).trim().replace(/\/$/,'')}:{}),
    scheduleEnabled:input?.scheduleEnabled??DEFAULT_MARKET_UPDATE.scheduleEnabled,
    refreshOnForeground:input?.refreshOnForeground??DEFAULT_MARKET_UPDATE.refreshOnForeground,
    stopAll:input?.stopAll??DEFAULT_MARKET_UPDATE.stopAll,
    live:{
      enabled:input?.live?.enabled??DEFAULT_MARKET_UPDATE.live.enabled,
      start:input?.live?.start??DEFAULT_MARKET_UPDATE.live.start,
      end:input?.live?.end??DEFAULT_MARKET_UPDATE.live.end,
      refreshSeconds:clampSeconds(input?.live?.refreshSeconds??DEFAULT_MARKET_UPDATE.live.refreshSeconds),
    },
    afterHours:{
      enabled:input?.afterHours?.enabled??DEFAULT_MARKET_UPDATE.afterHours.enabled,
      start:input?.afterHours?.start??DEFAULT_MARKET_UPDATE.afterHours.start,
      end:input?.afterHours?.end??DEFAULT_MARKET_UPDATE.afterHours.end,
      refreshSeconds:clampSeconds(input?.afterHours?.refreshSeconds??DEFAULT_MARKET_UPDATE.afterHours.refreshSeconds),
    },
  };
}
function resetRuntimeIntradaySession(rows:RuntimeQuote[],sessionDate:string):RuntimeQuote[]{
  let changed=false;
  const next=rows.map(row=>{
    if(row.intradayDate===sessionDate)return row;
    changed=true;
    return {...row,intraday:[],intradayDate:sessionDate,intradayPreviousClose:row.previousClose};
  });
  return changed?next:rows;
}
function appendNativeIntraday(
  previous:readonly RuntimeQuote[],
  next:RuntimeQuote[],
  sessionDate:string,
):RuntimeQuote[]{
  const prior=new Map(previous.map(row=>[row.symbol,row] as const));
  return next.map(row=>{
    const old=prior.get(row.symbol);
    const liveQuality=row.quality==='trade'||row.quality==='backup_realtime';
    const liveSource=row.source==='FUGLE'||row.source==='TWSE_MIS'||row.source==='YAHOO';
    const rawSourceQuoteAt=row.sourceQuoteAt;
    const sourceQuoteAt=typeof rawSourceQuoteAt==='number'&&Number.isFinite(rawSourceQuoteAt)?rawSourceQuoteAt:0;
    if(!liveQuality||!liveSource||sourceQuoteAt<=0)return row;
    const base=old?.intradayDate===sessionDate?[...(old.intraday??[])]:[];
    const point:RuntimeIntradayPoint={
      at:sourceQuoteAt,
      price:row.currentPrice,
      quality:row.quality==='trade'?'trade':'backup_realtime',
      source:row.source,
    };
    const byAt=new Map(base.map(item=>[item.at,item] as const));
    byAt.set(point.at,point);
    return {
      ...row,
      intraday:[...byAt.values()].sort((a,b)=>a.at-b.at).slice(-4000),
      intradayDate:sessionDate,
      intradayPreviousClose:row.previousClose,
    };
  });
}
function applyCatalogNames(rows:RuntimeQuote[],catalog:readonly TaiwanSecurityInfo[]):RuntimeQuote[]{
  const names=new Map(catalog.map(row=>[row.symbol,row.name] as const));
  return rows.map(row=>({...row,name:names.get(row.symbol)??row.name}));
}
function parseProviderHealth(snapshot:UnifiedMarketSnapshot):ProviderHealth[]{
  const rows=(snapshot.providerHealth??[]) as readonly ProviderHealth[];
  return rows.filter(row=>!!row&&typeof row.source==='string');
}

export function MarketRuntimeProvider({children}:PropsWithChildren){
  const [config,setConfigState]=useState<MarketUpdateConfig>(DEFAULT_MARKET_UPDATE);
  const [phase,setPhase]=useState<MarketPhase>(()=>resolveMarketPhase(DEFAULT_MARKET_UPDATE));
  const [quotes,setQuotes]=useState<RuntimeQuote[]>([]);
  const [trackedSymbols,setTrackedSymbolsState]=useState<string[]>([]);
  const [hydrated,setHydrated]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [lastSuccessAt,setLastSuccessAt]=useState<number|null>(null);
  const [lastError,setLastError]=useState<string|null>(null);
  const [catalog,setCatalog]=useState<TaiwanSecurityInfo[]>(fallbackCatalog);
  const [catalogRefreshing,setCatalogRefreshing]=useState(false);
  const [providerHealth,setProviderHealth]=useState<ProviderHealth[]>([]);
  const [unresolvedSymbols,setUnresolvedSymbols]=useState<string[]>([]);
  const [fugleConfigured,setFugleConfigured]=useState(false);
  const [marketDataVersion,setMarketDataVersion]=useState(0);

  const configRef=useRef(config),quotesRef=useRef<RuntimeQuote[]>([]),symbolsRef=useRef<string[]>([]);
  const catalogRef=useRef<TaiwanSecurityInfo[]>(fallbackCatalog());
  const refreshPromiseRef=useRef<Promise<MarketRefreshResult>|null>(null);
  const refreshVisibleRef=useRef(false);

  useEffect(()=>{configRef.current=config;},[config]);
  useEffect(()=>{quotesRef.current=quotes;},[quotes]);
  useEffect(()=>{symbolsRef.current=trackedSymbols;},[trackedSymbols]);
  useEffect(()=>{catalogRef.current=catalog;},[catalog]);

  const applySnapshot=useCallback((snapshot:UnifiedMarketSnapshot)=>{
    const version=Number.isFinite(snapshot.version)?snapshot.version:Date.now();
    setMarketDataVersion(version);
    const missing=Array.isArray(snapshot.missing)?[...snapshot.missing].sort():[];
    setUnresolvedSymbols(current=>sameStrings(current,missing)?current:missing);
    setProviderHealth(parseProviderHealth(snapshot));
    setQuotes(current=>{
      const normalized=marketRowsToRuntimeQuotes(snapshot,current);
      const named=applyCatalogNames(normalized,catalogRef.current);
      const next=appendNativeIntraday(current,named,taipeiClock().date);
      quotesRef.current=next;
      return next;
    });
    const newest=(snapshot.quotes??[]).reduce((max,row)=>Math.max(max,Number(row.sourceQuoteAt)||0),0);
    if(newest>0)setLastSuccessAt(current=>Math.max(current??0,newest));
  },[]);

  useEffect(()=>{
    let alive=true;
    void (async()=>{
      const [runtimeRaw,previousRaw,nativeKey]=await Promise.all([
        AsyncStorage.getItem(RUNTIME_STORAGE_KEY).catch(()=>null),
        AsyncStorage.getItem(PREVIOUS_RUNTIME_STORAGE_KEY).catch(()=>null),
        loadNativeFugleApiKey().catch(()=>null),
      ]);
      if(!alive)return;
      let persisted:Partial<PersistedMarketRuntime>|null=null;
      for(const raw of [runtimeRaw,previousRaw]){
        if(!raw)continue;
        try{persisted=JSON.parse(raw) as Partial<PersistedMarketRuntime>;break;}catch{}
      }
      if(persisted?.config)setConfigState(normalizeConfig(persisted.config));
      if(Array.isArray(persisted?.catalog)&&persisted.catalog.length){
        const next=[...persisted.catalog];catalogRef.current=next;setCatalog(next);
      }
      if(Number.isFinite(Number(persisted?.lastSuccessAt)))setLastSuccessAt(Number(persisted?.lastSuccessAt));
      setFugleConfigured(!!nativeKey?.trim());
      if(nativeRuntimeAvailable){
        try{
          const snapshot=await loadUnifiedMarketData();
          if(alive)applySnapshot(snapshot);
        }catch{}
      }
      if(alive)setHydrated(true);
    })();
    return()=>{alive=false;};
  },[applySnapshot]);

  useEffect(()=>{
    if(!hydrated)return;
    const payload:PersistedMarketRuntime={schema:5,config,catalog,lastSuccessAt};
    AsyncStorage.setItem(RUNTIME_STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
  },[hydrated,config,catalog,lastSuccessAt]);

  const setConfig=useCallback((next:MarketUpdateConfig)=>setConfigState(normalizeConfig(next)),[]);
  const setTrackedSymbols=useCallback((symbols:readonly string[])=>{
    const normalized=symbols.map(symbol=>symbol.trim().toUpperCase()).filter(Boolean);
    setTrackedSymbolsState(current=>Array.from(new Set([...current,...normalized])).sort());
  },[]);

  const refresh=useCallback((options?:{force?:boolean;silent?:boolean}):Promise<MarketRefreshResult>=>{
    const announce=options?.silent!==true;
    if(refreshPromiseRef.current){
      if(announce&&!refreshVisibleRef.current){refreshVisibleRef.current=true;setRefreshing(true);setLastError(null);}
      return refreshPromiseRef.current;
    }
    refreshVisibleRef.current=announce;
    const task=(async():Promise<MarketRefreshResult>=>{
      if(!nativeRuntimeAvailable)return 'error';
      if(announce){setRefreshing(true);setLastError(null);}
      try{
        const snapshot=await refreshUnifiedMarketData(symbolsRef.current);
        applySnapshot(snapshot);
        const missing=Array.isArray(snapshot.missing)?snapshot.missing:[];
        if(announce&&missing.length)setLastError('未解析行情：'+missing.join(', '));
        else if(announce&&symbolsRef.current.length>0&&(snapshot.quotes?.length??0)===0)
          setLastError('SaiETF 行情中心目前沒有可核實行情。');
        return (snapshot.quotes?.length??0)>0?'updated':'unchanged';
      }catch(error){
        if(announce)setLastError(error instanceof Error?error.message:String(error));
        return 'error';
      }finally{
        if(refreshVisibleRef.current)setRefreshing(false);
        refreshVisibleRef.current=false;
      }
    })();
    refreshPromiseRef.current=task.finally(()=>{refreshPromiseRef.current=null;});
    return refreshPromiseRef.current;
  },[applySnapshot]);

  const refreshCatalog=useCallback(async()=>{
    setCatalogRefreshing(true);
    try{
      const next=await fetchTaiwanSecurityCatalog();
      if(next.length){catalogRef.current=next;setCatalog(next);}
    }catch(error){
      setLastError(error instanceof Error?error.message:String(error));
    }finally{setCatalogRefreshing(false);}
  },[]);

  const saveFugleApiKey=useCallback(async(apiKey:string)=>{
    if(!nativeRuntimeAvailable)return false;
    const saved=await saveNativeFugleApiKey(apiKey.trim());
    if(saved){setFugleConfigured(true);void refresh({force:true,silent:true});}
    return saved;
  },[refresh]);
  const clearFugleApiKey=useCallback(async()=>{
    if(!nativeRuntimeAvailable)return false;
    const cleared=await clearNativeFugleApiKey();
    if(cleared)setFugleConfigured(false);
    return cleared;
  },[]);

  useEffect(()=>{
    if(!hydrated||trackedSymbols.length===0)return;
    void refresh({silent:true});
  },[hydrated,trackedSymbols,refresh]);

  useEffect(()=>{setPhase(resolveMarketPhase(config));},[config]);

  useEffect(()=>{
    if(!hydrated||config.stopAll||!config.scheduleEnabled)return;
    let disposed=false,lastPhase:MarketPhase|null=null,nextDueAt=0;
    const tick=()=>{
      const currentPhase=resolveMarketPhase(configRef.current);
      setPhase(current=>current===currentPhase?current:currentPhase);
      if(disposed||AppState.currentState!=='active')return;
      const now=Date.now();
      if(currentPhase==='live'){
        const sessionDate=taipeiClock().date;
        setQuotes(current=>{
          const next=resetRuntimeIntradaySession(current,sessionDate);
          if(next!==current)quotesRef.current=next;
          return next;
        });
      }
      const seconds=marketRefreshSeconds(configRef.current,currentPhase);
      if(seconds<=0){lastPhase=currentPhase;nextDueAt=0;return;}
      if(currentPhase!==lastPhase){lastPhase=currentPhase;nextDueAt=0;}
      if(now<nextDueAt)return;
      nextDueAt=now+seconds*1000;
      void refresh({silent:true});
    };
    tick();
    const timer=setInterval(tick,1000);
    return()=>{disposed=true;clearInterval(timer);};
  },[hydrated,config,refresh]);

  useEffect(()=>{
    if(!hydrated)return;
    const sub=AppState.addEventListener('change',(next:AppStateStatus)=>{
      if(next==='active'&&configRef.current.refreshOnForeground)void refresh({force:true,silent:true});
    });
    return()=>sub.remove();
  },[hydrated,refresh]);

  useEffect(()=>{
    if(hydrated&&(catalog.length<=FALLBACK_QUOTES.length||catalog.every(row=>row.source==='bootstrap-only')))
      void refreshCatalog();
  },[hydrated,catalog.length,refreshCatalog]);

  const value=useMemo<MarketRuntimeValue>(()=>({
    hydrated,config,quotes,phase,refreshing,lastSuccessAt,lastError,catalog,catalogRefreshing,
    marketDataVersion,missingSymbols:unresolvedSymbols,providerHealth,unresolvedSymbols,
    fugleConfigured,setConfig,refresh,refreshCatalog,setTrackedSymbols,saveFugleApiKey,clearFugleApiKey,
  }),[
    hydrated,config,quotes,phase,refreshing,lastSuccessAt,lastError,catalog,catalogRefreshing,
    marketDataVersion,providerHealth,unresolvedSymbols,fugleConfigured,setConfig,refresh,refreshCatalog,
    setTrackedSymbols,saveFugleApiKey,clearFugleApiKey,
  ]);

  return <MarketRuntimeContext.Provider value={value}>{children}</MarketRuntimeContext.Provider>;
}

export function useMarketRuntime(){
  const value=useContext(MarketRuntimeContext);
  if(!value)throw new Error('useMarketRuntime must be used inside MarketRuntimeProvider');
  return value;
}
