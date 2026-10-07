import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState,type AppStateStatus} from 'react-native';
import {
  createContext,type PropsWithChildren,useCallback,useContext,useEffect,useMemo,useRef,useState,
} from 'react';

import {FALLBACK_QUOTES,type RuntimeIntradayPoint,type RuntimeQuote} from '../finance/financeSeed';
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
export type MarketRefreshResult='updated'|'unchanged'|'error';
export type MarketUpdateSource='AUTO';
export type EtfCatalogItem=TaiwanSecurityInfo;

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
  /** Monotonic Market Core publication version consumed by Finance/UI/Widget. */
  marketDataVersion:number;
  /** V3.2.49 compatibility alias for unresolved Market Core symbols. */
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

const RUNTIME_STORAGE_KEY='@tf-asset/v4-market-runtime';
const PRE_V4_STORAGE_KEY='@tf-asset/market-runtime-v231';
const LEGACY_STORAGE_KEY='@tf-asset/market-runtime';
const MarketRuntimeContext=createContext<MarketRuntimeValue|null>(null);

function fallbackCatalog():TaiwanSecurityInfo[]{
  return FALLBACK_QUOTES.map(row=>({
    symbol:row.symbol,name:row.name,companyName:null,market:'TWSE',industry:null,
    paidInCapitalTwd:null,issuedCommonShares:null,englishShortName:null,phone:null,website:null,
    listingDate:null,parValueText:null,chairman:null,generalManager:null,address:null,source:'bootstrap-only',
  }));
}
const sameStrings=(a:readonly string[],b:readonly string[])=>a.length===b.length&&a.every((value,index)=>value===b[index]);
const persistedPointSource=(source:string):RuntimeIntradayPoint['source']=>
  source==='FUGLE'||source==='TWSE_MIS'||source==='YAHOO'||source==='SHIOAJI'?source:'YAHOO';
function resetRuntimeIntradaySession(rows:readonly RuntimeQuote[],sessionDate:string):readonly RuntimeQuote[]{
  let changed=false;
  const next=rows.map(row=>{
    if(row.intradayDate===sessionDate)return row;
    changed=true;
    return {...row,intraday:[],intradayDate:sessionDate,intradayPreviousClose:row.previousClose};
  });
  return changed?next:rows;
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
function quoteClock(epochMillis:number):string{
  try{
    return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(epochMillis));
  }catch{return '';}
}
function runtimeQuality(quote:MarketQuote):NonNullable<RuntimeQuote['quality']>{
  if(quote.priceKind==='bid'||quote.priceKind==='ask')return 'bid_ask';
  if(quote.quality==='LIVE'&&(quote.priceKind==='lastTrade'||quote.source==='FUGLE'||quote.source==='TWSE_MIS'))return 'trade';
  if(quote.quality==='LIVE'||quote.quality==='DELAYED')return 'backup_realtime';
  return 'official_close';
}
function runtimePriceType(quote:MarketQuote):NonNullable<RuntimeQuote['priceType']>{
  if(quote.priceKind==='bid'||quote.priceKind==='ask')return 'BID_ASK';
  if(runtimeQuality(quote)==='trade')return 'REALTIME_TRADE';
  if(runtimeQuality(quote)==='backup_realtime')return 'BACKUP_REALTIME';
  return 'OFFICIAL_CLOSE';
}
function runtimeMarket(quote:MarketQuote):NonNullable<RuntimeQuote['market']>{
  const value=String(quote.market??quote.exchange??'').toUpperCase();
  if(value.includes('OTC')||value.includes('TPEX'))return 'OTC';
  if(value.includes('TSE')||value.includes('TWSE'))return 'TSE';
  return 'UNKNOWN';
}
function appendRuntimeIntraday(old:RuntimeQuote|undefined,quote:MarketQuote,quality:NonNullable<RuntimeQuote['quality']>){
  const source=quote.source;
  if((quality!=='trade'&&quality!=='backup_realtime')||source==='CACHE')return {
    date:old?.intradayDate??null,previousClose:old?.intradayPreviousClose??null,points:[...(old?.intraday??[])],
  };
  const date=quote.sessionDate;
  const base=old?.intradayDate===date?[...(old.intraday??[])]:[];
  const point:RuntimeIntradayPoint={
    at:quote.sourceTimestampEpochMillis,price:quote.price,
    quality:quality==='trade'?'trade':'backup_realtime',
    source,
  };
  const byAt=new Map(base.map(row=>[row.at,row] as const));byAt.set(point.at,point);
  return {
    date,previousClose:quote.previousClose??old?.intradayPreviousClose??null,
    points:[...byAt.values()].sort((a,b)=>a.at-b.at).slice(-4000),
  };
}
function toRuntimeQuotes(
  snapshot:ReadonlyMap<string,MarketQuote>,
  previous:readonly RuntimeQuote[],
  catalog:readonly TaiwanSecurityInfo[],
  marketDataVersion:number,
):RuntimeQuote[]{
  const oldMap=new Map(previous.map(row=>[row.symbol,row] as const));
  const names=new Map(catalog.map(row=>[row.symbol,row.name] as const));
  return [...snapshot.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol,'en')).map(quote=>{
    const old=oldMap.get(quote.symbol);
    const quality=runtimeQuality(quote);
    const intraday=appendRuntimeIntraday(old,quote,quality);
    const sameTick=old?.sourceQuoteAt===quote.sourceTimestampEpochMillis;
    const sparkline=sameTick
      ?[...(old?.sparkline??[quote.price])]
      :[...(old?.sparkline??[]),quote.price].filter(value=>value>0).slice(-120);
    const seed=FALLBACK_QUOTES.find(row=>row.symbol===quote.symbol);
    const name=names.get(quote.symbol)??(quote.name!==quote.symbol?quote.name:undefined)??old?.name??seed?.name??quote.symbol;
    const latestDividendPerShare=old?.latestDividendPerShare??seed?.latestDividendPerShare;
    const pinned=old?.pinned??seed?.pinned;
    const previousClose=quote.previousClose??old?.previousClose??quote.price;
    return {
      symbol:quote.symbol,name,currentPrice:quote.price,previousClose,
      liquidationTradeMode:old?.liquidationTradeMode??seed?.liquidationTradeMode??'ROUND_LOT',
      dividendFrequency:old?.dividendFrequency??seed?.dividendFrequency??4,
      ...(latestDividendPerShare==null?{}:{latestDividendPerShare}),
      ...(pinned==null?{}:{pinned}),
      sourceQuoteAt:quote.sourceTimestampEpochMillis,
      quality,
      previousCloseKnown:Number.isFinite(previousClose)&&previousClose>0,
      source:quote.source,
      priceType:runtimePriceType(quote),
      isFallback:quality!=='trade',
      officialTradePrice:quality==='trade'?quote.price:null,
      market:runtimeMarket(quote),
      statusMessage:`${quote.source} · ${quote.quality} · ${quote.priceKind??'price'}`,
      checkedAt:quote.receivedAtEpochMillis,
      marketDataVersion,
      marketSource:quote.source,
      quoteStatus:quote.quality,
      quoteDate:quote.sessionDate.replaceAll('-',''),
      quoteTime:quoteClock(quote.sourceTimestampEpochMillis),
      receivedAt:quote.receivedAtEpochMillis,
      sourceTimestamp:quote.sourceTimestampEpochMillis,
      sessionDate:quote.sessionDate,
      fallbackLevel:quote.fallbackLevel,
      ...(quote.sequence==null?{}:{sequence:quote.sequence}),
      ...(quote.exchange==null?{}:{exchange:quote.exchange}),
      ...(quote.bid==null?{}:{bid:quote.bid}),
      ...(quote.ask==null?{}:{ask:quote.ask}),
      ...(quote.isClose==null?{}:{isClose:quote.isClose}),
      priceKind:quote.priceKind??'none',
      volume:quote.volume??null,
      sparkline:sparkline.length?sparkline:[quote.price],
      intraday:intraday.points,
      intradayDate:intraday.date,
      intradayPreviousClose:intraday.previousClose,
    };
  });
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
  const fugleKeyRef=useRef<string|null>(null);
  const centerRef=useRef<MarketDataCenter|null>(null);
  const fugleRef=useRef<FugleWebSocketProvider|null>(null);
  const persistenceRef=useRef<MarketPersistenceRepository|null>(null);
  const persistenceControllerRef=useRef<MarketPersistenceController|null>(null);
  const refreshPromiseRef=useRef<Promise<MarketRefreshResult>|null>(null);
  const refreshVisibleRef=useRef(false);
  const marketDataVersionRef=useRef(0);
  const centerUnsubscribeRef=useRef<(()=>void)|null>(null);
  const fugleUnsubscribeRef=useRef<(()=>void)|null>(null);

  useEffect(()=>{configRef.current=config;},[config]);
  useEffect(()=>{quotesRef.current=quotes;},[quotes]);
  useEffect(()=>{symbolsRef.current=trackedSymbols;},[trackedSymbols]);
  useEffect(()=>{catalogRef.current=catalog;},[catalog]);

  useEffect(()=>{
    let alive=true;
    void (async()=>{
      const [runtimeRaw,preV4Raw,legacyRaw,nativeKey]=await Promise.all([
        AsyncStorage.getItem(RUNTIME_STORAGE_KEY).catch(()=>null),
        AsyncStorage.getItem(PRE_V4_STORAGE_KEY).catch(()=>null),
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
      }else if(preV4Raw||legacyRaw){
        try{
          const legacy=JSON.parse(preV4Raw??legacyRaw??'{}') as {config?:Partial<MarketUpdateConfig>;lastSuccessAt?:number};
          if(legacy.config)setConfigState(normalizeConfig(legacy.config));
          if(Number.isFinite(Number(legacy.lastSuccessAt)))setLastSuccessAt(Number(legacy.lastSuccessAt));
        }catch{}
      }

      fugleKeyRef.current=nativeKey?.trim()||null;setFugleConfigured(!!fugleKeyRef.current);
      const persistence=new MarketPersistenceRepository();persistenceRef.current=persistence;
      const persistedQuotes=await persistence.loadSnapshots();
      const persistedPointsBySymbol=new Map<string,RuntimeIntradayPoint[]>();
      await Promise.all(persistedQuotes.map(async quote=>{
        if(!quote.sessionDate)return;
        const candles=await persistence.loadCandles(quote.symbol,quote.sessionDate);
        if(!candles.length)return;
        persistedPointsBySymbol.set(quote.symbol,candles.map(row=>{
          const source=persistedPointSource(row.source);
          return {at:row.bucketEpochMillis,price:row.close,quality:source==='YAHOO'?'backup_realtime':'trade',source};
        }));
      }));
      if(!alive)return;

      const twse=new TwseMisQuoteProvider();
      const yahoo=new YahooQuoteProvider(symbol=>catalogRef.current.find(row=>row.symbol===symbol)?.name);
      const center=new MarketDataCenter([twse,yahoo]);centerRef.current=center;
      if(persistedQuotes.length)center.seedCache(persistedQuotes,true);

      centerUnsubscribeRef.current=center.subscribe(snapshot=>{
        if(!alive)return;
        const version=marketDataVersionRef.current+1;marketDataVersionRef.current=version;setMarketDataVersion(version);
        setQuotes(current=>{
          const next=toRuntimeQuotes(snapshot,current,catalogRef.current,version);quotesRef.current=next;return next;
        });
      });
      const initial=center.memoryQuotes();
      if(initial.size){
        const version=marketDataVersionRef.current+1;marketDataVersionRef.current=version;setMarketDataVersion(version);
        const next=toRuntimeQuotes(initial,[],catalogRef.current,version).map(row=>{
          const points=persistedPointsBySymbol.get(row.symbol);
          const snapshot=initial.get(row.symbol);
          if(!points?.length||!snapshot)return row;
          return {...row,intraday:points,intradayDate:snapshot.sessionDate,
            intradayPreviousClose:snapshot.previousClose??row.previousClose};
        });
        quotesRef.current=next;setQuotes(next);
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

  const refresh=useCallback((options?:{force?:boolean;silent?:boolean}):Promise<MarketRefreshResult>=>{
    const announce=options?.silent!==true;
    if(refreshPromiseRef.current){
      // A manual refresh joining the 1-second scheduler reuses the same request
      // and promotes that shared operation to visible UI state.
      if(announce&&!refreshVisibleRef.current){
        refreshVisibleRef.current=true;
        setRefreshing(true);
        setLastError(null);
      }
      return refreshPromiseRef.current;
    }
    refreshVisibleRef.current=announce;
    const task:Promise<MarketRefreshResult>=(async()=>{
      const center=centerRef.current;if(!center)return 'unchanged';
      if(announce)setRefreshing(true);
      if(announce)setLastError(null);
      const now=Date.now(),date=taipeiDate(now);
      try{
        if(options?.force&&fugleRef.current&&fugleKeyRef.current)await fugleRef.current.replaceSubscriptions(new Set(symbolsRef.current));
        const batch=await center.refresh({
          symbols:new Set(symbolsRef.current),nowEpochMillis:now,currentTaipeiDate:date,
          tradingSessionActive:resolveMarketPhase(configRef.current)==='live',
        });
        const health=[...(fugleRef.current?[fugleRef.current.health(Date.now())]:[]),...batch.providerHealth];
        setProviderHealth(health);
        const unresolved=[...batch.unresolvedSymbols].sort();setUnresolvedSymbols(current=>sameStrings(current,unresolved)?current:unresolved);
        if(batch.quotes.size>0){
          const newest=[...batch.quotes.values()].reduce((max,row)=>Math.max(max,row.sourceTimestampEpochMillis),0);
          if(newest>0)setLastSuccessAt(current=>Math.max(current??0,newest));
        }
        if(!options?.silent){
          if(unresolved.length)setLastError('未解析行情：'+unresolved.join(', '));
          else if(symbolsRef.current.length>0&&batch.quotes.size===0)setLastError('目前沒有可核實的本交易日行情，保留已標記品質的快取。');
        }
        return batch.quotes.size>0?'updated':'unchanged';
      }catch(error){
        if(!options?.silent)setLastError(error instanceof Error?error.message:String(error));
        return 'error';
      }finally{
        if(refreshVisibleRef.current)setRefreshing(false);
        refreshVisibleRef.current=false;
      }
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
    void refresh({silent:true});
  },[hydrated,trackedSymbols,refresh]);

  useEffect(()=>{
    setPhase(resolveMarketPhase(config));
  },[config]);

  useEffect(()=>{
    if(!hydrated||config.stopAll||!config.scheduleEnabled)return;
    let disposed=false;
    let lastPhase:MarketPhase|null=null;
    let nextDueAt=0;
    const tick=()=>{
      const currentPhase=resolveMarketPhase(configRef.current);
      setPhase(current=>current===currentPhase?current:currentPhase);
      if(disposed||AppState.currentState!=='active')return;
      const now=Date.now();
      if(currentPhase==='live'){
        const sessionDate=taipeiDate(now);
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
      if(next==='active'){
        void fugleRef.current?.replaceSubscriptions(new Set(symbolsRef.current));
        if(configRef.current.refreshOnForeground)void refresh({force:true,silent:true});
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
    marketDataVersion,missingSymbols:unresolvedSymbols,
    providerHealth,unresolvedSymbols,fugleConfigured,setConfig,refresh,refreshCatalog,setTrackedSymbols,
    saveFugleApiKey,clearFugleApiKey,
  }),[
    hydrated,config,quotes,phase,refreshing,lastSuccessAt,lastError,catalog,catalogRefreshing,marketDataVersion,
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
