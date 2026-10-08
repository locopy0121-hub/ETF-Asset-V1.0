import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState,type AppStateStatus} from 'react-native';
import {
  createContext,type PropsWithChildren,useCallback,useContext,useEffect,useMemo,useRef,useState,
} from 'react';

import {FALLBACK_QUOTES,type RuntimeIntradayPoint,type RuntimeQuote} from '../finance/financeSeed';
import {
  clearNativeFugleApiKey,loadNativeFugleApiKey,nativeRuntimeAvailable,
  loadUnifiedMarketData,refreshUnifiedMarketData,saveNativeFugleApiKey,subscribeUnifiedMarketData,updateNativeMarketSymbols,pauseNativeMarketStreaming,
  type UnifiedMarketSnapshot,
} from '../native/TfAssetNativeBridge';
import {marketRowsToRuntimeQuotes} from './unifiedMarketAdapter';
import {fetchTaiwanSecurityCatalog,type TaiwanSecurityInfo} from './TaiwanSecurityCatalog';

export type MarketPhase='live'|'afterHours'|'offline';
export type MarketRefreshResult='updated'|'unchanged'|'error';
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

type PersistedMarketRuntime=Readonly<{
  schema:6;
  catalog:readonly TaiwanSecurityInfo[];
  lastSuccessAt:number|null;
}>;

type MarketRuntimeValue=Readonly<{
  hydrated:boolean;
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
  refresh:(options?:{force?:boolean;silent?:boolean})=>Promise<MarketRefreshResult>;
  refreshCatalog:()=>Promise<void>;
  setTrackedSymbols:(symbols:readonly string[])=>void;
  saveFugleApiKey:(apiKey:string)=>Promise<boolean>;
  clearFugleApiKey:()=>Promise<boolean>;
}>;

const RUNTIME_STORAGE_KEY='@tf-asset/v4-market-runtime-native-saietf';
const PREVIOUS_RUNTIME_STORAGE_KEY='@tf-asset/v4-market-runtime';
const V3_RUNTIME_STORAGE_KEY='@tf-asset/market-runtime-v231';
const LEGACY_RUNTIME_STORAGE_KEY='@tf-asset/market-runtime';
const MarketRuntimeContext=createContext<MarketRuntimeValue|null>(null);

function fallbackCatalog():TaiwanSecurityInfo[]{
  return FALLBACK_QUOTES.map(row=>({
    symbol:row.symbol,name:row.name,companyName:null,market:'TWSE',industry:null,
    paidInCapitalTwd:null,issuedCommonShares:null,englishShortName:null,phone:null,website:null,
    listingDate:null,parValueText:null,chairman:null,generalManager:null,address:null,source:'bootstrap-only',
  }));
}
const sameStrings=(a:readonly string[],b:readonly string[])=>a.length===b.length&&a.every((value,index)=>value===b[index]);
function taipeiClock(){
  try{
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:'Asia/Taipei',weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',
    }).formatToParts(new Date());
    const get=(type:string)=>parts.find(part=>part.type===type)?.value??'';
    const weekday=get('weekday'),hour=Number(get('hour'))||0,minute=Number(get('minute'))||0,second=Number(get('second'))||0;
    return {
      weekend:weekday==='Sat'||weekday==='Sun',
      minutes:hour*60+minute+second/60,
      date:`${get('year')}-${get('month')}-${get('day')}`,
    };
  }catch{
    const d=new Date();
    return {
      weekend:d.getDay()===0||d.getDay()===6,
      minutes:d.getHours()*60+d.getMinutes()+d.getSeconds()/60,
      date:d.toISOString().slice(0,10),
    };
  }
}
export function resolveMarketPhase():MarketPhase{
  const clock=taipeiClock();
  return !clock.weekend&&clock.minutes>=540&&clock.minutes<=810?'live':'afterHours';
}
export function marketRefreshSeconds(phase:MarketPhase){
  return phase==='live'?1:30;
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
    if(!liveQuality||!liveSource||sourceQuoteAt<=0||row.sessionDate!==sessionDate)return row;
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
  const [phase,setPhase]=useState<MarketPhase>(resolveMarketPhase);
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

  const quotesRef=useRef<RuntimeQuote[]>([]),symbolsRef=useRef<string[]>([]);
  const catalogRef=useRef<TaiwanSecurityInfo[]>(fallbackCatalog());
  const refreshPromiseRef=useRef<Promise<MarketRefreshResult>|null>(null);
  const refreshVisibleRef=useRef(false);
  const latestSnapshotAtRef=useRef(0);
  const latestSnapshotVersionRef=useRef(0);

  useEffect(()=>{quotesRef.current=quotes;},[quotes]);
  useEffect(()=>{symbolsRef.current=trackedSymbols;},[trackedSymbols]);
  useEffect(()=>{catalogRef.current=catalog;},[catalog]);

  const applySnapshot=useCallback((snapshot:UnifiedMarketSnapshot)=>{
    const snapshotAt=Number(snapshot.queriedAt)||0;
    const version=Number.isFinite(snapshot.version)?snapshot.version:Date.now();
    if(version<latestSnapshotVersionRef.current||snapshotAt>0&&snapshotAt<latestSnapshotAtRef.current)return;
    latestSnapshotVersionRef.current=Math.max(latestSnapshotVersionRef.current,version);
    latestSnapshotAtRef.current=Math.max(latestSnapshotAtRef.current,snapshotAt);
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
      const [runtimeRaw,previousRaw,v3Raw,legacyRaw,nativeKey]=await Promise.all([
        AsyncStorage.getItem(RUNTIME_STORAGE_KEY).catch(()=>null),
        AsyncStorage.getItem(PREVIOUS_RUNTIME_STORAGE_KEY).catch(()=>null),
        AsyncStorage.getItem(V3_RUNTIME_STORAGE_KEY).catch(()=>null),
        AsyncStorage.getItem(LEGACY_RUNTIME_STORAGE_KEY).catch(()=>null),
        loadNativeFugleApiKey().catch(()=>null),
      ]);
      if(!alive)return;
      let persisted:Partial<PersistedMarketRuntime>|null=null;
      for(const raw of [runtimeRaw,previousRaw,v3Raw,legacyRaw]){
        if(!raw)continue;
        try{
          persisted=JSON.parse(raw) as Partial<PersistedMarketRuntime>;
          break;
        }catch{}
      }
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
    const payload:PersistedMarketRuntime={schema:6,catalog,lastSuccessAt};
    AsyncStorage.setItem(RUNTIME_STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
  },[hydrated,catalog,lastSuccessAt]);

  const setTrackedSymbols=useCallback((symbols:readonly string[])=>{
    const normalized=Array.from(new Set(symbols.map(symbol=>symbol.trim().toUpperCase()).filter(Boolean))).sort();
    if(!sameStrings(symbolsRef.current,normalized)){
      symbolsRef.current=normalized;
      void updateNativeMarketSymbols(normalized).catch(()=>{});
    }
    setTrackedSymbolsState(current=>sameStrings(current,normalized)?current:normalized);
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

  // SaiETF Memory Hot Store pushes Fugle ticks immediately. Polling below is
  // also retained for initial state, persisted chart data and bridge recovery.
  useEffect(()=>{
    if(!hydrated||!nativeRuntimeAvailable)return;
    return subscribeUnifiedMarketData(applySnapshot);
  },[hydrated,applySnapshot]);

  useEffect(()=>{
    if(!hydrated||!nativeRuntimeAvailable)return;
    let disposed=false,reading=false;
    const read=()=>{
      if(disposed||reading||AppState.currentState!=='active')return;
      reading=true;
      void loadUnifiedMarketData(symbolsRef.current).then(snapshot=>{if(!disposed)applySnapshot(snapshot);})
        .catch(()=>{}).finally(()=>{reading=false;});
    };
    read();
    const timer=setInterval(read,1000);
    return()=>{disposed=true;clearInterval(timer);};
  },[hydrated,applySnapshot]);

  useEffect(()=>{
    if(!hydrated)return;
    let disposed=false,lastPhase:MarketPhase|null=null,nextDueAt=0;
    const tick=()=>{
      const currentPhase=resolveMarketPhase();
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
      const seconds=marketRefreshSeconds(currentPhase);
      if(currentPhase!==lastPhase){lastPhase=currentPhase;nextDueAt=0;}
      if(now<nextDueAt)return;
      nextDueAt=now+seconds*1000;
      void refresh({silent:true});
    };
    tick();
    const timer=setInterval(tick,1000);
    return()=>{disposed=true;clearInterval(timer);};
  },[hydrated,refresh]);

  useEffect(()=>{
    if(!hydrated)return;
    const sub=AppState.addEventListener('change',(next:AppStateStatus)=>{
      if(next==='active'){
        void updateNativeMarketSymbols(symbolsRef.current).catch(()=>{});
        void refresh({force:true,silent:true});
      }else if(next==='background'||next==='inactive')void pauseNativeMarketStreaming().catch(()=>{});
    });
    return()=>sub.remove();
  },[hydrated,refresh]);

  useEffect(()=>{
    if(hydrated&&(catalog.length<=FALLBACK_QUOTES.length||catalog.every(row=>row.source==='bootstrap-only')))
      void refreshCatalog();
  },[hydrated,catalog.length,refreshCatalog]);

  const value=useMemo<MarketRuntimeValue>(()=>({
    hydrated,quotes,phase,refreshing,lastSuccessAt,lastError,catalog,catalogRefreshing,
    marketDataVersion,missingSymbols:unresolvedSymbols,providerHealth,unresolvedSymbols,
    fugleConfigured,refresh,refreshCatalog,setTrackedSymbols,saveFugleApiKey,clearFugleApiKey,
  }),[
    hydrated,quotes,phase,refreshing,lastSuccessAt,lastError,catalog,catalogRefreshing,
    marketDataVersion,providerHealth,unresolvedSymbols,fugleConfigured,refresh,refreshCatalog,
    setTrackedSymbols,saveFugleApiKey,clearFugleApiKey,
  ]);

  return <MarketRuntimeContext.Provider value={value}>{children}</MarketRuntimeContext.Provider>;
}

export function useMarketRuntime(){
  const value=useContext(MarketRuntimeContext);
  if(!value)throw new Error('useMarketRuntime must be used inside MarketRuntimeProvider');
  return value;
}
