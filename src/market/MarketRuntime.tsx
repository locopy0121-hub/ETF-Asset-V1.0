import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState,type AppStateStatus} from 'react-native';
import {
  createContext,type PropsWithChildren,useCallback,useContext,useEffect,useMemo,useRef,useState,
} from 'react';

import {FALLBACK_QUOTES,type RuntimeQuote} from '../finance/financeSeed';
import {
  clearNativeFugleApiKey,loadNativeFugleApiKey,nativeRuntimeAvailable,saveNativeFugleApiKey,
} from '../native/TfAssetNativeBridge';
import {
  MarketDataCenter,taipeiDate,type MarketQuote,type ProviderHealth,
} from './MarketCore';
import {FugleWebSocketProvider} from './FugleWebSocketProvider';
import {MarketPersistenceController,MarketPersistenceRepository} from './MarketPersistence';
import {TwseMisQuoteProvider,YahooQuoteProvider} from './MarketProviders';
import {
  fetchTaiwanSecurityCatalog,type TaiwanSecurityInfo,
} from './TaiwanSecurityCatalog';

export type MarketPhase='live'|'afterHours'|'offline';
export type MarketUpdateSource='AUTO';
export type EtfCatalogItem=TaiwanSecurityInfo;

export type MarketUpdateConfig=Readonly<{
  source:MarketUpdateSource;
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
  schema:4;
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
  providerHealth:readonly ProviderHealth[];
  unresolvedSymbols:readonly string[];
  fugleConfigured:boolean;
  setConfig:(next:MarketUpdateConfig)=>void;
  refresh:(options?:{force?:boolean})=>Promise<void>;
  refreshCatalog:()=>Promise<void>;
  setTrackedSymbols:(symbols:readonly string[])=>void;
  saveFugleApiKey:(apiKey:string)=>Promise<boolean>;
  clearFugleApiKey:()=>Promise<boolean>;
}>;

const RUNTIME_STORAGE_KEY='@tf-asset/v4-market-runtime';
const LEGACY_STORAGE_KEY='@tf-asset/market-runtime';
const MarketRuntimeContext=createContext<MarketRuntimeValue|null>(null);

function fallbackCatalog():TaiwanSecurityInfo[]{
  return FALLBACK_QUOTES.map(row=>({
    symbol:row.symbol,name:row.name,companyName:null,market:'TWSE',industry:null,
    paidInCapitalTwd:null,issuedCommonShares:null,englishShortName:null,phone:null,website:null,
    listingDate:null,parValueText:null,chairman:null,generalManager:null,address:null,source:'bootstrap-only',
  }));
}
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
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const get=(type:string)=>parts.find(part=>part.type===type)?.value??'';
    const weekday=get('weekday'),hour=Number(get('hour'))||0,minute=Number(get('minute'))||0;
    return {weekend:weekday==='Sat'||weekday==='Sun',minutes:hour*60+minute};
  }catch{
    const d=new Date();return {weekend:d.getDay()===0||d.getDay()===6,minutes:d.getHours()*60+d.getMinutes()};
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
function quoteClock(epochMillis:number):string{
  try{
    return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(epochMillis));
  }catch{return '';}
}
function toRuntimeQuotes(
  snapshot:ReadonlyMap<string,MarketQuote>,
  previous:readonly RuntimeQuote[],
  catalog:readonly TaiwanSecurityInfo[],
):RuntimeQuote[]{
  const oldMap=new Map(previous.map(row=>[row.symbol,row] as const));
  const names=new Map(catalog.map(row=>[row.symbol,row.name] as const));
  return [...snapshot.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol,'en')).map(quote=>{
    const old=oldMap.get(quote.symbol);
    const sameTick=old?.sourceTimestamp===quote.sourceTimestampEpochMillis;
    const sparkline=sameTick
      ?[...(old?.sparkline??[quote.price])]
      :[...(old?.sparkline??[]),quote.price].filter(value=>value>0).slice(-120);
    const seed=FALLBACK_QUOTES.find(row=>row.symbol===quote.symbol);
    const name=names.get(quote.symbol)??(quote.name!==quote.symbol?quote.name:undefined)??old?.name??seed?.name??quote.symbol;
    const latestDividendPerShare=old?.latestDividendPerShare??seed?.latestDividendPerShare;
    const pinned=old?.pinned??seed?.pinned;
    return {
      symbol:quote.symbol,name,currentPrice:quote.price,previousClose:quote.previousClose??old?.previousClose??quote.price,
      liquidationTradeMode:old?.liquidationTradeMode??seed?.liquidationTradeMode??'ROUND_LOT',
      dividendFrequency:old?.dividendFrequency??seed?.dividendFrequency??4,
      ...(latestDividendPerShare==null?{}:{latestDividendPerShare}),
      ...(pinned==null?{}:{pinned}),
      sparkline:sparkline.length?sparkline:[quote.price],
      marketSource:quote.source,quoteStatus:quote.quality,
      quoteDate:quote.sessionDate.replaceAll('-',''),quoteTime:quoteClock(quote.sourceTimestampEpochMillis),
      receivedAt:quote.receivedAtEpochMillis,sourceTimestamp:quote.sourceTimestampEpochMillis,
      sessionDate:quote.sessionDate,fallbackLevel:quote.fallbackLevel,
      ...(quote.sequence==null?{}:{sequence:quote.sequence}),
      ...(quote.exchange==null?{}:{exchange:quote.exchange}),
      ...(quote.market==null?{}:{market:quote.market}),
      ...(quote.volume==null?{}:{volume:quote.volume}),
      ...(quote.bid==null?{}:{bid:quote.bid}),
      ...(quote.ask==null?{}:{ask:quote.ask}),
      ...(quote.isClose==null?{}:{isClose:quote.isClose}),
      priceKind:quote.priceKind??'none',
    };
  });
}

export function MarketRuntimeProvider({children}:PropsWithChildren){
  const [config,setConfigState]=useState<MarketUpdateConfig>(DEFAULT_MARKET_UPDATE);
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

  const configRef=useRef(config),quotesRef=useRef<RuntimeQuote[]>([]),symbolsRef=useRef<string[]>([]);
  const catalogRef=useRef<TaiwanSecurityInfo[]>(fallbackCatalog());
  const fugleKeyRef=useRef<string|null>(null);
  const centerRef=useRef<MarketDataCenter|null>(null);
  const fugleRef=useRef<FugleWebSocketProvider|null>(null);
  const persistenceRef=useRef<MarketPersistenceRepository|null>(null);
  const persistenceControllerRef=useRef<MarketPersistenceController|null>(null);
  const refreshPromiseRef=useRef<Promise<void>|null>(null);
  const centerUnsubscribeRef=useRef<(()=>void)|null>(null);
  const fugleUnsubscribeRef=useRef<(()=>void)|null>(null);

  useEffect(()=>{configRef.current=config;},[config]);
  useEffect(()=>{quotesRef.current=quotes;},[quotes]);
  useEffect(()=>{symbolsRef.current=trackedSymbols;},[trackedSymbols]);
  useEffect(()=>{catalogRef.current=catalog;},[catalog]);

  useEffect(()=>{
    let alive=true;
    void (async()=>{
      const [runtimeRaw,legacyRaw,nativeKey]=await Promise.all([
        AsyncStorage.getItem(RUNTIME_STORAGE_KEY).catch(()=>null),
        AsyncStorage.getItem(LEGACY_STORAGE_KEY).catch(()=>null),
        loadNativeFugleApiKey().catch(()=>null),
      ]);
      if(!alive)return;
      let persisted:Partial<PersistedMarketRuntime>|null=null;
      if(runtimeRaw){try{persisted=JSON.parse(runtimeRaw) as Partial<PersistedMarketRuntime>;}catch{}}
      if(persisted?.schema===4){
        setConfigState(normalizeConfig(persisted.config));
        if(Array.isArray(persisted.catalog)&&persisted.catalog.length){
          const next=[...persisted.catalog];setCatalog(next);catalogRef.current=next;
        }
        if(Number.isFinite(Number(persisted.lastSuccessAt)))setLastSuccessAt(Number(persisted.lastSuccessAt));
      }else if(legacyRaw){
        try{
          const legacy=JSON.parse(legacyRaw) as {config?:Partial<MarketUpdateConfig>;lastSuccessAt?:number};
          if(legacy.config)setConfigState(normalizeConfig(legacy.config));
          if(Number.isFinite(Number(legacy.lastSuccessAt)))setLastSuccessAt(Number(legacy.lastSuccessAt));
        }catch{}
      }

      fugleKeyRef.current=nativeKey?.trim()||null;setFugleConfigured(!!fugleKeyRef.current);
      const persistence=new MarketPersistenceRepository();persistenceRef.current=persistence;
      const persistedQuotes=await persistence.loadSnapshots();
      if(!alive)return;

      const twse=new TwseMisQuoteProvider();
      const yahoo=new YahooQuoteProvider(symbol=>catalogRef.current.find(row=>row.symbol===symbol)?.name);
      const center=new MarketDataCenter([twse,yahoo]);centerRef.current=center;
      if(persistedQuotes.length)center.seedCache(persistedQuotes,true);

      centerUnsubscribeRef.current=center.subscribe(snapshot=>{
        if(!alive)return;
        setQuotes(current=>{
          const next=toRuntimeQuotes(snapshot,current,catalogRef.current);quotesRef.current=next;return next;
        });
      });
      const initial=center.memoryQuotes();
      if(initial.size){
        const next=toRuntimeQuotes(initial,[],catalogRef.current);quotesRef.current=next;setQuotes(next);
      }
      persistenceControllerRef.current=new MarketPersistenceController(center,persistence);

      const fugle=new FugleWebSocketProvider(()=>fugleKeyRef.current);fugleRef.current=fugle;
      fugleUnsubscribeRef.current=fugle.onEvent(event=>{
        if(!alive)return;
        if(event.type==='quote')center.acceptStreamingQuote(event.quote);
        setProviderHealth(current=>{
          const without=current.filter(row=>row.source!=='FUGLE');
          return [event.type==='health'?event.health:fugle.health(Date.now()),...without];
        });
      });
      setProviderHealth([fugle.health(Date.now()),...center.providerHealthSnapshot(Date.now())]);
      setHydrated(true);
    })();
    return()=>{
      alive=false;
      centerUnsubscribeRef.current?.();centerUnsubscribeRef.current=null;
      fugleUnsubscribeRef.current?.();fugleUnsubscribeRef.current=null;
      void persistenceControllerRef.current?.flushNow();
      persistenceControllerRef.current?.dispose();persistenceControllerRef.current=null;
      fugleRef.current?.dispose();fugleRef.current=null;centerRef.current=null;
    };
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    const payload:PersistedMarketRuntime={schema:4,config,catalog,lastSuccessAt};
    AsyncStorage.setItem(RUNTIME_STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
  },[hydrated,config,catalog,lastSuccessAt]);

  const setConfig=useCallback((next:MarketUpdateConfig)=>setConfigState(normalizeConfig(next)),[]);
  const setTrackedSymbols=useCallback((symbols:readonly string[])=>{
    const normalized=symbols.map(symbol=>symbol.trim().toUpperCase()).filter(Boolean);
    setTrackedSymbolsState(current=>Array.from(new Set([...current,...normalized])).sort());
  },[]);

  const phase=resolveMarketPhase(config);

  const refresh=useCallback((options?:{force?:boolean})=>{
    if(refreshPromiseRef.current)return refreshPromiseRef.current;
    const task=(async()=>{
      const center=centerRef.current;if(!center)return;
      setRefreshing(true);setLastError(null);
      const now=Date.now(),date=taipeiDate(now);
      try{
        if(options?.force&&fugleRef.current&&fugleKeyRef.current)await fugleRef.current.replaceSubscriptions(new Set(symbolsRef.current));
        const batch=await center.refresh({
          symbols:new Set(symbolsRef.current),nowEpochMillis:now,currentTaipeiDate:date,tradingSessionActive:resolveMarketPhase(configRef.current)==='live',
        });
        const health=[...(fugleRef.current?[fugleRef.current.health(Date.now())]:[]),...batch.providerHealth];
        setProviderHealth(health);
        const unresolved=[...batch.unresolvedSymbols].sort();setUnresolvedSymbols(unresolved);
        if(batch.quotes.size>0)setLastSuccessAt(Date.now());
        if(unresolved.length)setLastError('未解析行情：'+unresolved.join(', '));
        else if(symbolsRef.current.length>0&&batch.quotes.size===0)setLastError('目前沒有可核實的本交易日行情，保留已標記品質的快取。');
      }catch(error){
        setLastError(error instanceof Error?error.message:String(error));
      }finally{setRefreshing(false);}
    })();
    refreshPromiseRef.current=task.finally(()=>{refreshPromiseRef.current=null;});
    return refreshPromiseRef.current;
  },[]);

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
    const normalized=apiKey.trim();if(!normalized)return false;
    const saved=await saveNativeFugleApiKey(normalized);
    if(saved){
      fugleKeyRef.current=normalized;setFugleConfigured(true);fugleRef.current?.onCredentialChanged();
      await fugleRef.current?.replaceSubscriptions(new Set(symbolsRef.current));
    }
    return saved;
  },[]);
  const clearFugleApiKey=useCallback(async()=>{
    if(!nativeRuntimeAvailable)return false;
    const cleared=await clearNativeFugleApiKey();
    if(cleared){fugleKeyRef.current=null;setFugleConfigured(false);fugleRef.current?.onCredentialChanged();}
    return cleared;
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    void fugleRef.current?.replaceSubscriptions(new Set(trackedSymbols));
    void refresh();
  },[hydrated,trackedSymbols,refresh]);

  useEffect(()=>{
    if(!hydrated||config.stopAll||!config.scheduleEnabled)return;
    const seconds=marketRefreshSeconds(config,phase);if(seconds<=0)return;
    const timer=setInterval(()=>{void refresh();},seconds*1000);return()=>clearInterval(timer);
  },[hydrated,config,phase,refresh]);

  useEffect(()=>{
    if(!hydrated)return;
    const sub=AppState.addEventListener('change',(next:AppStateStatus)=>{
      if(next==='active'){
        void fugleRef.current?.replaceSubscriptions(new Set(symbolsRef.current));
        if(configRef.current.refreshOnForeground)void refresh({force:true});
      }else{
        void persistenceControllerRef.current?.flushNow();
        void fugleRef.current?.disconnect();
      }
    });
    return()=>sub.remove();
  },[hydrated,refresh]);

  useEffect(()=>{
    if(hydrated&&(catalog.length<=FALLBACK_QUOTES.length||catalog.every(row=>row.source==='bootstrap-only')))void refreshCatalog();
  },[hydrated,catalog.length,refreshCatalog]);

  const value=useMemo<MarketRuntimeValue>(()=>({
    hydrated,config,quotes,phase,refreshing,lastSuccessAt,lastError,catalog,catalogRefreshing,
    providerHealth,unresolvedSymbols,fugleConfigured,setConfig,refresh,refreshCatalog,setTrackedSymbols,
    saveFugleApiKey,clearFugleApiKey,
  }),[
    hydrated,config,quotes,phase,refreshing,lastSuccessAt,lastError,catalog,catalogRefreshing,
    providerHealth,unresolvedSymbols,fugleConfigured,setConfig,refresh,refreshCatalog,setTrackedSymbols,
    saveFugleApiKey,clearFugleApiKey,
  ]);

  return <MarketRuntimeContext.Provider value={value}>{children}</MarketRuntimeContext.Provider>;
}

export function useMarketRuntime(){
  const value=useContext(MarketRuntimeContext);
  if(!value)throw new Error('useMarketRuntime must be used inside MarketRuntimeProvider');
  return value;
}
