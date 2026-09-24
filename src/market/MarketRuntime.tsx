import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppState,
  type AppStateStatus,
} from 'react-native';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { FALLBACK_QUOTES, type RuntimeQuote } from '../finance/financeSeed';
import { hasUsableTwseQuote, pickBetterTwseRow, resolveTwseCurrentPrice, resolveTwsePreviousClose } from './twseQuoteParser';
import {isNewSourceTick,parseTwseQuoteSourceAt} from './quoteFreshness';
import {unifiedMarketCenterAvailable,loadUnifiedMarketData,refreshUnifiedMarketData,setNativeMarketBackendUrl} from '../native/TfAssetNativeBridge';
import {marketRowsToRuntimeQuotes} from './unifiedMarketAdapter';
import { mergeEtfCatalog, parseOfficialEtfRow, shouldRefreshEtfCatalog, type EtfCatalogItem } from './etfMetadata';
import {VERIFIED_ISSUER_DIVIDEND_POLICIES} from './issuerDividendPolicies';
export type { EtfCatalogItem } from './etfMetadata';

export type MarketPhase = 'live' | 'afterHours' | 'offline';
export type MarketSource = 'TWSE';

export type MarketUpdateConfig = Readonly<{
  source: MarketSource;
  /** Empty until an actual HTTPS backend is deployed and verified. */
  backendUrl?:string;
  scheduleEnabled: boolean;
  refreshOnForeground: boolean;
  stopAll: boolean;
  live: Readonly<{ enabled: boolean; start: string; end: string; refreshSeconds: number }>;
  afterHours: Readonly<{ enabled: boolean; start: string; end: string; refreshSeconds: number }>;
}>;

export const DEFAULT_MARKET_UPDATE: MarketUpdateConfig = {
  source: 'TWSE',
  backendUrl:'',
  scheduleEnabled: true,
  refreshOnForeground: true,
  stopAll: false,
  live: { enabled: true, start: '09:00', end: '13:30', refreshSeconds: 5 },
  afterHours: { enabled: true, start: '13:31', end: '18:00', refreshSeconds: 60 },
};

type PersistedMarketState = {
  schema: 1;
  config: MarketUpdateConfig;
  quotes: RuntimeQuote[];
  lastSuccessAt: number | null;
  /** Legacy receipt timestamps are not trusted when migrating to version 2. */
  quoteClockVersion?:2;
  catalog?: EtfCatalogItem[];
  catalogFetchedAt?: number | null; // Last refresh attempt; metadataVerifiedAt tracks successful official rows.
};

export type MarketRefreshResult='updated'|'unchanged'|'error';

type MarketRuntimeValue = {
  hydrated: boolean;
  config: MarketUpdateConfig;
  quotes: readonly RuntimeQuote[];
  phase: MarketPhase;
  refreshing: boolean;
  lastSuccessAt: number | null;
  lastError: string | null;
  catalog: readonly EtfCatalogItem[];
  catalogRefreshing: boolean;
  /** One SQLite commit version, shared across all React screens, Widget and Monitor. */
  marketDataVersion:number;
  missingSymbols:readonly string[];
  setConfig: (next: MarketUpdateConfig) => void;
  refresh: (options?:{ force?: boolean }) => Promise<MarketRefreshResult>;
  refreshCatalog: () => Promise<void>;
  setTrackedSymbols: (symbols: readonly string[]) => void;
};

const LEGACY_STORAGE_KEY='@tf-asset/market-runtime';
const STORAGE_KEY='@tf-asset/market-runtime-v231';
const MarketRuntimeContext=createContext<MarketRuntimeValue|null>(null);
const FALLBACK_CATALOG:EtfCatalogItem[]=mergeEtfCatalog(
  FALLBACK_QUOTES.map(x=>({symbol:x.symbol,name:x.name,market:'fallback'})),[],[],[],VERIFIED_ISSUER_DIVIDEND_POLICIES,
);

const clampSeconds=(value:number)=>Math.max(1,Math.min(3600,Math.floor(Number(value)||1)));
const hhmm=(value:string)=>{
  const parts=String(value||'00:00').split(':').map(Number);
  const h=parts[0]??0;
  const m=parts[1]??0;
  return Math.max(0,Math.min(1439,(Number.isFinite(h)?h:0)*60+(Number.isFinite(m)?m:0)));
};
const inWindow=(now:number,start:string,end:string)=>{
  const a=hhmm(start),b=hhmm(end);
  return a<=b?now>=a&&now<=b:now>=a||now<=b;
};
function taipeiClock(){
  try{
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const get=(type:string)=>parts.find(p=>p.type===type)?.value??'';
    const weekday=get('weekday');
    const day=weekday==='Sat'?6:weekday==='Sun'?0:1;
    const hour=Number(get('hour'))||0;
    const minute=Number(get('minute'))||0;
    return {weekend:day===0||day===6,minutes:hour*60+minute};
  }catch{
    const d=new Date();
    return {weekend:d.getDay()===0||d.getDay()===6,minutes:d.getHours()*60+d.getMinutes()};
  }
}
export function resolveMarketPhase(config:MarketUpdateConfig):MarketPhase{
  if(config.stopAll||!config.scheduleEnabled)return 'offline';
  const clock=taipeiClock();
  if(clock.weekend)return 'offline';
  if(config.live.enabled&&inWindow(clock.minutes,config.live.start,config.live.end))return 'live';
  if(config.afterHours.enabled&&inWindow(clock.minutes,config.afterHours.start,config.afterHours.end))return 'afterHours';
  return 'offline';
}
export function marketRefreshSeconds(config:MarketUpdateConfig,phase:MarketPhase){
  return phase==='live'?clampSeconds(config.live.refreshSeconds):phase==='afterHours'?clampSeconds(config.afterHours.refreshSeconds):0;
}
async function fetchEtfCatalog(previous:readonly EtfCatalogItem[]):Promise<EtfCatalogItem[]>{
  const rows:EtfCatalogItem[]=[];
  const official:NonNullable<ReturnType<typeof parseOfficialEtfRow>>[]=[];
  const push=(symbol:unknown,name:unknown,market:'TWSE'|'TPEx')=>{
    const code=String(symbol??'').trim().toUpperCase();
    const label=String(name??'').trim();
    if(!/^00[0-9A-Z]{2,6}$/.test(code)||!label)return;
    rows.push({symbol:code,name:label,market});
  };
  const requests=[
    fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',{headers:{Accept:'application/json'}})
      .then(async response=>{
        if(!response.ok)throw new Error('TWSE catalog HTTP '+response.status);
        const data=await response.json() as Array<Record<string,unknown>>;
        for(const row of Array.isArray(data)?data:[]) push(row.Code??row.code,row.Name??row.name,'TWSE');
      }),
    fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes',{headers:{Accept:'application/json'}})
      .then(async response=>{
        if(!response.ok)throw new Error('TPEx catalog HTTP '+response.status);
        const data=await response.json() as Array<Record<string,unknown>>;
        for(const row of Array.isArray(data)?data:[]) push(
          row.SecuritiesCompanyCode??row.Code??row.code??row.SecuritiesCode,
          row.CompanyName??row.Name??row.name??row.SecuritiesCompanyName,
          'TPEx',
        );
      }),
  ];
  await Promise.allSettled(requests);
  // Only record taxonomy and payout cadence when an official feed actually provides them.
  // Unavailable or unrecognized fields stay unknown instead of guessing from the ETF name.
  try{
    const response=await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap47_L',{headers:{Accept:'application/json'}});
    if(response.ok){
      const data=await response.json() as Array<Record<string,unknown>>;
      for(const raw of Array.isArray(data)?data:[]){
        const parsed=parseOfficialEtfRow(raw,Date.now());
        const etfType=parsed?.etfType;
        const dividendType=parsed?.dividendType;
        if(!etfType&&!dividendType)continue;
        if(parsed)official.push(parsed);
      }
    }
  }catch{ /* The catalog remains usable; missing taxonomy must remain explicitly unknown. */ }
  // Join metadata by symbol independently of quote rows, preserving last-known-good values.
  return mergeEtfCatalog(FALLBACK_CATALOG,previous,rows,official,VERIFIED_ISSUER_DIVIDEND_POLICIES);
}

async function fetchTwseQuotes(symbols:readonly string[],previous:readonly RuntimeQuote[],now=Date.now()):Promise<{quotes:RuntimeQuote[];updatedCount:number;usableCount:number;newestSourceAt:number|null;unresolved:string[]}>{
  if(!symbols.length)return {quotes:[...previous],updatedCount:0,usableCount:0,newestSourceAt:null,unresolved:[]};
  const channels=symbols.flatMap(symbol=>[`tse_${symbol}.tw`,`otc_${symbol}.tw`]).join('|');
  const url='https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch='+encodeURIComponent(channels)+'&json=1&delay=0&_='+Date.now();
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('TWSE HTTP '+response.status);
  const payload=await response.json() as {msgArray?:Array<Record<string,unknown>>};
  const rows=Array.isArray(payload.msgArray)?payload.msgArray:[];
  const bySymbol=new Map<string,Record<string,unknown>>();
  for(const row of rows){
    const symbol=String(row.c??'').trim();
    if(!symbol)continue;
    const existing=bySymbol.get(symbol);
    bySymbol.set(symbol,pickBetterTwseRow(existing,row));
  }
  const unresolved:string[]=[];
  let updatedCount=0,usableCount=0;
  let newestSourceAt:number|null=null;
  const next=symbols.map(symbol=>{
    const old=previous.find(x=>x.symbol===symbol)??FALLBACK_QUOTES.find(x=>x.symbol===symbol);
    const row=bySymbol.get(symbol);
    if(!hasUsableTwseQuote(row)){
      unresolved.push(symbol);
      if(old)return old;
      const missing:RuntimeQuote={
        symbol,
        name:symbol,
        currentPrice:0,
        previousClose:0,
        liquidationTradeMode:'ROUND_LOT',
        dividendFrequency:4,
        sparkline:[0],
      };
      return missing;
    }
    // A cached MIS row is NOT a new quote just because HTTP returned 200.
    const sourceQuoteAt=parseTwseQuoteSourceAt(row,now);
    if(sourceQuoteAt===null){
      unresolved.push(symbol+'(來源時間缺失)');
      const missing:RuntimeQuote={symbol,name:symbol,currentPrice:0,previousClose:0,
        liquidationTradeMode:'ROUND_LOT',dividendFrequency:4,sparkline:[0]};
      return old??missing;
    }
    usableCount+=1;
    if(!isNewSourceTick(sourceQuoteAt,old?.sourceQuoteAt))return old!;
    updatedCount+=1;
    newestSourceAt=Math.max(newestSourceAt??0,sourceQuoteAt);
    const currentPrice=resolveTwseCurrentPrice(row);
    const previousClose=resolveTwsePreviousClose(row)||old?.previousClose||currentPrice;
    const sparkline=[...(old?.sparkline??[]),currentPrice].filter(x=>x>0).slice(-30);
    return {
      symbol,
      name:String(row?.n??old?.name??symbol),
      currentPrice,
      previousClose,
      sourceQuoteAt,
      liquidationTradeMode:old?.liquidationTradeMode??'ROUND_LOT',
      dividendFrequency:old?.dividendFrequency??4,
      ...(old?.latestDividendPerShare==null?{}:{latestDividendPerShare:old.latestDividendPerShare}),
      ...(old?.pinned==null?{}:{pinned:old.pinned}),
      sparkline:sparkline.length?sparkline:[currentPrice],
    };
  });
  return {quotes:next,updatedCount,usableCount,newestSourceAt,unresolved};
}

export function MarketRuntimeProvider({children}:PropsWithChildren){
  const [config,setConfigState]=useState<MarketUpdateConfig>(DEFAULT_MARKET_UPDATE);
  const [quotes,setQuotes]=useState<RuntimeQuote[]>(()=>[]);
  const [marketDataVersion,setMarketDataVersion]=useState(0);
  const marketVersionRef=useRef(0);
  const [missingSymbols,setMissingSymbols]=useState<string[]>([]);
  const [trackedSymbols,setTrackedSymbolsState]=useState<string[]>(()=>FALLBACK_QUOTES.map(x=>x.symbol));
  const [hydrated,setHydrated]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [lastSuccessAt,setLastSuccessAt]=useState<number|null>(null);
  // lastSuccessAt is now the latest verified exchange source tick, never Date.now().
  const [lastError,setLastError]=useState<string|null>(null);
  const [catalog,setCatalog]=useState<EtfCatalogItem[]>(FALLBACK_CATALOG);
  const [catalogFetchedAt,setCatalogFetchedAt]=useState<number|null>(null);
  const [catalogRefreshing,setCatalogRefreshing]=useState(false);
  const catalogRef=useRef<EtfCatalogItem[]>(FALLBACK_CATALOG);
  const catalogFetchedAtRef=useRef<number|null>(null);
  const catalogRefreshingRef=useRef(false);
  const refreshingRef=useRef(false);
  const refreshPromiseRef=useRef<Promise<MarketRefreshResult>|null>(null);
  const quotesRef=useRef<RuntimeQuote[]>([]);
  const symbolsRef=useRef<string[]>(FALLBACK_QUOTES.map(x=>x.symbol));

  useEffect(()=>{
    let alive=true;
    (async()=>{
      const current=await AsyncStorage.getItem(STORAGE_KEY);
      const legacy=current??await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      if(!alive)return;
      if(legacy){
        const parsed=JSON.parse(legacy) as Partial<PersistedMarketState>;
        if(parsed.schema===1){
          if(parsed.config){
            const next={...DEFAULT_MARKET_UPDATE,...parsed.config,
              live:{...DEFAULT_MARKET_UPDATE.live,...parsed.config.live},
              afterHours:{...DEFAULT_MARKET_UPDATE.afterHours,...parsed.config.afterHours}};
            // The persisted user-approved server URL is applied before the
            // first native read/refresh. Ledger migration is not involved.
            if(unifiedMarketCenterAvailable)await setNativeMarketBackendUrl(next.backendUrl??'');
            setConfigState(next);
          }
          if(Array.isArray(parsed.catalog)&&parsed.catalog.length){
            const restored=mergeEtfCatalog(FALLBACK_CATALOG,parsed.catalog,[],[],VERIFIED_ISSUER_DIVIDEND_POLICIES);
            catalogRef.current=restored;
            setCatalog(restored);
          }
          if(typeof parsed.catalogFetchedAt==='number'&&Number.isFinite(parsed.catalogFetchedAt)){
            setCatalogFetchedAt(parsed.catalogFetchedAt);
          }
          // V2.1.20 used some indicative book/seed prices. Never migrate that
          // unproven price cache into the new verified SQLite database.
          if(!unifiedMarketCenterAvailable&&Array.isArray(parsed.quotes)){
            const safe=parsed.quotes.filter(row=>row.currentPrice>0&&typeof row.sourceQuoteAt==='number'
              &&row.sourceQuoteAt>0&&row.sourceQuoteAt<Date.now()+120_000
              &&row.sourceQuoteAt>Date.now()-31*86_400_000);
            quotesRef.current=safe;
            setQuotes(safe);
          }
        }
      }
      if(unifiedMarketCenterAvailable){
        const snapshot=await loadUnifiedMarketData();
        if(!alive)return;
        const restored=marketRowsToRuntimeQuotes(snapshot,quotesRef.current);
        quotesRef.current=restored;
        setQuotes(restored);
        marketVersionRef.current=snapshot.version;
        setMarketDataVersion(snapshot.version);
        const latest=restored.reduce((max,row)=>Math.max(max,row.sourceQuoteAt??0),0);
        if(latest>0)setLastSuccessAt(latest);
      }
    })().catch(error=>{if(alive)setLastError('行情資料中心載入失敗：'+String(error));})
      .finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{ catalogRef.current=catalog; },[catalog]);
  useEffect(()=>{ catalogFetchedAtRef.current=catalogFetchedAt; },[catalogFetchedAt]);
  useEffect(()=>{ quotesRef.current=quotes; },[quotes]);
  useEffect(()=>{ symbolsRef.current=trackedSymbols; },[trackedSymbols]);

  useEffect(()=>{
    if(!hydrated)return;
    // Source of truth for Android quotes is SQLite; AsyncStorage stores only presentation/settings.
    const payload:PersistedMarketState={schema:1,quoteClockVersion:2,config,quotes:unifiedMarketCenterAvailable?[]:quotes,lastSuccessAt,catalog,catalogFetchedAt};
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
  },[hydrated,config,quotes,lastSuccessAt,catalog,catalogFetchedAt]);

  const setConfig=useCallback((next:MarketUpdateConfig)=>{
    setConfigState({
      ...next,
      live:{...next.live,refreshSeconds:clampSeconds(next.live.refreshSeconds)},
      afterHours:{...next.afterHours,refreshSeconds:clampSeconds(next.afterHours.refreshSeconds)},
    });
  },[]);

  const setTrackedSymbols=useCallback((symbols:readonly string[])=>{
    const normalized=symbols.map(x=>x.trim().toUpperCase()).filter(Boolean);
    // Follow the current holdings/watchlist rather than keeping sold securities forever.
    const next=normalized.length?Array.from(new Set(normalized)):FALLBACK_QUOTES.map(x=>x.symbol);
    setTrackedSymbolsState(current=>current.length===next.length&&current.every((code,i)=>code===next[i])?current:next);
  },[]);

  const refresh=useCallback((options?:{force?:boolean}):Promise<MarketRefreshResult>=>{
    if(refreshPromiseRef.current)return refreshPromiseRef.current;
    const task=(async():Promise<MarketRefreshResult>=>{
      refreshingRef.current=true;
      setRefreshing(true);
      setLastError(null);
      let lastFailure:unknown=null;
      try{
        const attempts=options?.force?3:2;
        for(let attempt=1;attempt<=attempts;attempt+=1){
          try{
            if(unifiedMarketCenterAvailable){
              // Native App and Widget call the same official fetcher; one SQLite
              // transaction publishes a single versioned snapshot to every screen.
              const state=await refreshUnifiedMarketData(symbolsRef.current);
              const next=marketRowsToRuntimeQuotes(state,quotesRef.current);
              const currentVersion=marketVersionRef.current;
              setMissingSymbols(Array.isArray(state.missing)?state.missing:[]);
              if(state.version>currentVersion){
                quotesRef.current=next;
                setQuotes(next);
                marketVersionRef.current=state.version;
                setMarketDataVersion(state.version);
                const newest=next.reduce((max,row)=>Math.max(max,row.sourceQuoteAt??0),0);
                if(newest>0)setLastSuccessAt(current=>Math.max(current??0,newest));
              }
              if(next.length===0){
                setLastError('交易所尚無可核實行情；原始帳務資料不受影響');
                return 'error';
              }
              const missing=Array.isArray(state.missing)?state.missing:[];
              const errors=Array.isArray(state.errors)?state.errors:[];
              setLastError(missing.length?'行情中心尚缺 '+missing.join('、'):(errors.length?errors[0]??null:null));
              return state.updatedCount&&state.updatedCount>0?'updated':'unchanged';
            }
            const result=await fetchTwseQuotes(symbolsRef.current,quotesRef.current);
            if(result.usableCount<=0)throw new Error('TWSE 無可靠報價時間或可用行情');
            if(result.updatedCount===0){
              // No source time advanced: do not alter finance, cached quotes, or 'last updated'.
              setLastError('行情來源尚無新資料（維持前次更新時間）');
              return 'unchanged';
            }
            quotesRef.current=result.quotes;
            setQuotes(result.quotes);
            if(result.newestSourceAt!==null)setLastSuccessAt(current=>Math.max(current??0,result.newestSourceAt!));
            setLastError(result.unresolved.length?'部分行情暫用上次資料：'+result.unresolved.join(','):null);
            return 'updated';
          }catch(error){
            lastFailure=error;
            if(attempt<attempts)await new Promise(resolve=>setTimeout(resolve,options?.force?350:650));
          }
        }
        throw lastFailure instanceof Error?lastFailure:new Error(String(lastFailure??'TWSE refresh failed'));
      }catch(error){
        setLastError(error instanceof Error?error.message:String(error));
        return 'error';
      }finally{
        refreshingRef.current=false;
        setRefreshing(false);
      }
    })();
    refreshPromiseRef.current=task.finally(()=>{refreshPromiseRef.current=null;});
    return refreshPromiseRef.current;
  },[]);

  const refreshCatalog=useCallback(async()=>{
    if(catalogRefreshingRef.current)return;
    catalogRefreshingRef.current=true;
    setCatalogRefreshing(true);
    try{
      const next=await fetchEtfCatalog(catalogRef.current);
      if(next.length){catalogRef.current=next;setCatalog(next);}
    }finally{
      // Throttle unsuccessful attempts too; retained rows keep their original verification times.
      setCatalogFetchedAt(Date.now());
      catalogRefreshingRef.current=false;
      setCatalogRefreshing(false);
    }
  },[]);

  // One backend event broadcasts the changed market version; native retrieves
  // and commits the authoritative server snapshot into the shared SQLite DB.
  // Android background may suspend this socket: no false 'live' status.
  useEffect(()=>{
    if(!hydrated||!unifiedMarketCenterAvailable)return;
    void setNativeMarketBackendUrl(config.backendUrl??'').then(()=>refresh({force:true}))
      .catch(error=>setLastError('行情中心網址設定失敗：'+String(error)));
  },[hydrated,config.backendUrl,refresh]);

  useEffect(()=>{
    const endpoint=config.backendUrl?.trim()??'';
    if(!hydrated||!endpoint.startsWith('https://')||!trackedSymbols.length)return;
    let socket:WebSocket|null=null;
    let closed=false;
    const open=()=>{
      if(closed||AppState.currentState!=='active')return;
      try{
        socket=new WebSocket(endpoint.replace(/^https:/,'wss:')+
          '/v1/market/events?symbols='+encodeURIComponent(trackedSymbols.join(',')));
        socket.onmessage=(event)=>{
          try{
            const incoming=JSON.parse(String(event.data)) as {type?:string;symbols?:string[]};
            if(incoming.type==='market_changed'&&incoming.symbols?.some(symbol=>trackedSymbols.includes(symbol)))
              void refresh({force:true});
          }catch{}
        };
      }catch(error){setLastError('行情中心推送暫時無法連線');}
    };
    open();
    const sub=AppState.addEventListener('change',next=>{
      if(next==='active')open();
      else{socket?.close();socket=null;}
    });
    return()=>{closed=true;sub.remove();socket?.close();};
  },[hydrated,config.backendUrl,trackedSymbols,refresh]);

  const phase=resolveMarketPhase(config);

  useEffect(()=>{
    if(hydrated&&shouldRefreshEtfCatalog(catalogFetchedAt))void refreshCatalog();
  },[hydrated,catalogFetchedAt,refreshCatalog]);

  useEffect(()=>{
    if(!hydrated)return;
    const sub=AppState.addEventListener('change',next=>{
      if(next==='active'&&shouldRefreshEtfCatalog(catalogFetchedAtRef.current))void refreshCatalog();
    });
    return()=>sub.remove();
  },[hydrated,refreshCatalog]);

  useEffect(()=>{
    if(!hydrated)return;
    void refresh();
  },[hydrated,trackedSymbols,refresh]);

  useEffect(()=>{
    if(!hydrated||config.stopAll||!config.scheduleEnabled)return;
    const seconds=marketRefreshSeconds(config,phase);
    if(seconds<=0)return;
    const timer=setInterval(()=>{void refresh();},seconds*1000);
    return()=>clearInterval(timer);
  },[hydrated,config,phase,refresh]);

  useEffect(()=>{
    if(!config.refreshOnForeground)return;
    const sub=AppState.addEventListener('change',(next:AppStateStatus)=>{if(next==='active')void refresh({force:true});});
    return()=>sub.remove();
  },[config.refreshOnForeground,refresh]);

  const value=useMemo<MarketRuntimeValue>(()=>({
    hydrated,config,quotes,phase,refreshing,lastSuccessAt,lastError,catalog,catalogRefreshing,marketDataVersion,missingSymbols,setConfig,refresh,refreshCatalog,setTrackedSymbols,
  }),[hydrated,config,quotes,phase,refreshing,lastSuccessAt,lastError,catalog,catalogRefreshing,marketDataVersion,missingSymbols,setConfig,refresh,refreshCatalog,setTrackedSymbols]);

  return <MarketRuntimeContext.Provider value={value}>{children}</MarketRuntimeContext.Provider>;
}

export function useMarketRuntime(){
  const value=useContext(MarketRuntimeContext);
  if(!value)throw new Error('useMarketRuntime must be used inside MarketRuntimeProvider');
  return value;
}
