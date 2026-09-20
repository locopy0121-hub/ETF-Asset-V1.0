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

export type MarketPhase = 'live' | 'afterHours' | 'offline';
export type MarketSource = 'TWSE';
export type EtfCatalogItem = Readonly<{ symbol:string; name:string; market:'TWSE'|'TPEx'|'fallback' }>;

export type MarketUpdateConfig = Readonly<{
  source: MarketSource;
  scheduleEnabled: boolean;
  refreshOnForeground: boolean;
  stopAll: boolean;
  live: Readonly<{ enabled: boolean; start: string; end: string; refreshSeconds: number }>;
  afterHours: Readonly<{ enabled: boolean; start: string; end: string; refreshSeconds: number }>;
}>;

export const DEFAULT_MARKET_UPDATE: MarketUpdateConfig = {
  source: 'TWSE',
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
  catalog?: EtfCatalogItem[];
};

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
  setConfig: (next: MarketUpdateConfig) => void;
  refresh: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  setTrackedSymbols: (symbols: readonly string[]) => void;
};

const STORAGE_KEY='@tf-asset/market-runtime';
const MarketRuntimeContext=createContext<MarketRuntimeValue|null>(null);
const FALLBACK_CATALOG:EtfCatalogItem[]=FALLBACK_QUOTES.map(x=>({symbol:x.symbol,name:x.name,market:'fallback'}));

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
const num=(value:unknown)=>{
  const n=Number(String(value??'').replace(/,/g,''));
  return Number.isFinite(n)?n:0;
};
async function fetchEtfCatalog():Promise<EtfCatalogItem[]>{
  const rows:EtfCatalogItem[]=[];
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
  const unique=new Map<string,EtfCatalogItem>();
  for(const item of [...FALLBACK_CATALOG,...rows]) unique.set(item.symbol,item);
  return [...unique.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol));
}

async function fetchTwseQuotes(symbols:readonly string[],previous:readonly RuntimeQuote[]):Promise<RuntimeQuote[]>{
  if(!symbols.length)return [...previous];
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
    const price=num(row.z)||num(row.y);
    const existing=bySymbol.get(symbol);
    const existingPrice=existing?(num(existing.z)||num(existing.y)):0;
    if(price>0||existingPrice<=0)bySymbol.set(symbol,row);
  }
  return symbols.map(symbol=>{
    const old=previous.find(x=>x.symbol===symbol)??FALLBACK_QUOTES.find(x=>x.symbol===symbol);
    const row=bySymbol.get(symbol);
    const currentPrice=num(row?.z)||num(row?.y)||old?.currentPrice||0;
    const previousClose=num(row?.y)||old?.previousClose||currentPrice;
    const sparkline=[...(old?.sparkline??[]),currentPrice].filter(x=>x>0).slice(-30);
    return {
      symbol,
      name:String(row?.n??old?.name??symbol),
      currentPrice,
      previousClose,
      liquidationTradeMode:old?.liquidationTradeMode??'ROUND_LOT',
      dividendFrequency:old?.dividendFrequency??4,
      ...(old?.latestDividendPerShare==null?{}:{latestDividendPerShare:old.latestDividendPerShare}),
      ...(old?.pinned==null?{}:{pinned:old.pinned}),
      sparkline:sparkline.length?sparkline:[currentPrice],
    };
  });
}

export function MarketRuntimeProvider({children}:PropsWithChildren){
  const [config,setConfigState]=useState<MarketUpdateConfig>(DEFAULT_MARKET_UPDATE);
  const [quotes,setQuotes]=useState<RuntimeQuote[]>(()=>[...FALLBACK_QUOTES]);
  const [trackedSymbols,setTrackedSymbolsState]=useState<string[]>(()=>FALLBACK_QUOTES.map(x=>x.symbol));
  const [hydrated,setHydrated]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [lastSuccessAt,setLastSuccessAt]=useState<number|null>(null);
  const [lastError,setLastError]=useState<string|null>(null);
  const [catalog,setCatalog]=useState<EtfCatalogItem[]>(FALLBACK_CATALOG);
  const [catalogRefreshing,setCatalogRefreshing]=useState(false);
  const refreshingRef=useRef(false);
  const quotesRef=useRef<RuntimeQuote[]>([...FALLBACK_QUOTES]);
  const symbolsRef=useRef<string[]>(FALLBACK_QUOTES.map(x=>x.symbol));

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw=>{
      if(!alive||!raw)return;
      const parsed=JSON.parse(raw) as Partial<PersistedMarketState>;
      if(parsed.schema===1){
        if(parsed.config)setConfigState({...DEFAULT_MARKET_UPDATE,...parsed.config,live:{...DEFAULT_MARKET_UPDATE.live,...parsed.config.live},afterHours:{...DEFAULT_MARKET_UPDATE.afterHours,...parsed.config.afterHours}});
        if(Array.isArray(parsed.quotes)&&parsed.quotes.length)setQuotes(parsed.quotes);
        if(Number.isFinite(Number(parsed.lastSuccessAt)))setLastSuccessAt(Number(parsed.lastSuccessAt));
        if(Array.isArray(parsed.catalog)&&parsed.catalog.length)setCatalog(parsed.catalog);
      }
    }).catch(()=>{}).finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{ quotesRef.current=quotes; },[quotes]);
  useEffect(()=>{ symbolsRef.current=trackedSymbols; },[trackedSymbols]);

  useEffect(()=>{
    if(!hydrated)return;
    const payload:PersistedMarketState={schema:1,config,quotes,lastSuccessAt,catalog};
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
  },[hydrated,config,quotes,lastSuccessAt,catalog]);

  const setConfig=useCallback((next:MarketUpdateConfig)=>{
    setConfigState({
      ...next,
      live:{...next.live,refreshSeconds:clampSeconds(next.live.refreshSeconds)},
      afterHours:{...next.afterHours,refreshSeconds:clampSeconds(next.afterHours.refreshSeconds)},
    });
  },[]);

  const setTrackedSymbols=useCallback((symbols:readonly string[])=>{
    const normalized=symbols.map(x=>x.trim().toUpperCase()).filter(Boolean);
    setTrackedSymbolsState(current=>Array.from(new Set([...current,...normalized])));
  },[]);

  const refresh=useCallback(async()=>{
    if(refreshingRef.current)return;
    refreshingRef.current=true;
    setRefreshing(true);
    setLastError(null);
    try{
      const next=await fetchTwseQuotes(symbolsRef.current,quotesRef.current);
      setQuotes(next);
      setLastSuccessAt(Date.now());
    }catch(error){
      setLastError(error instanceof Error?error.message:String(error));
    }finally{
      refreshingRef.current=false;
      setRefreshing(false);
    }
  },[]);

  const refreshCatalog=useCallback(async()=>{
    setCatalogRefreshing(true);
    try{
      const next=await fetchEtfCatalog();
      if(next.length)setCatalog(next);
    }finally{
      setCatalogRefreshing(false);
    }
  },[]);

  const phase=resolveMarketPhase(config);

  useEffect(()=>{ if(hydrated&&catalog.length<=FALLBACK_CATALOG.length)void refreshCatalog(); },[hydrated,catalog.length,refreshCatalog]);

  useEffect(()=>{
    if(!hydrated||config.stopAll||!config.scheduleEnabled)return;
    const seconds=marketRefreshSeconds(config,phase);
    if(seconds<=0)return;
    void refresh();
    const timer=setInterval(()=>{void refresh();},seconds*1000);
    return()=>clearInterval(timer);
  },[hydrated,config,phase,refresh]);

  useEffect(()=>{
    if(!config.refreshOnForeground)return;
    const sub=AppState.addEventListener('change',(next:AppStateStatus)=>{if(next==='active')void refresh();});
    return()=>sub.remove();
  },[config.refreshOnForeground,refresh]);

  const value=useMemo<MarketRuntimeValue>(()=>({
    hydrated,config,quotes,phase,refreshing,lastSuccessAt,lastError,catalog,catalogRefreshing,setConfig,refresh,refreshCatalog,setTrackedSymbols,
  }),[hydrated,config,quotes,phase,refreshing,lastSuccessAt,lastError,catalog,catalogRefreshing,setConfig,refresh,refreshCatalog,setTrackedSymbols]);

  return <MarketRuntimeContext.Provider value={value}>{children}</MarketRuntimeContext.Provider>;
}

export function useMarketRuntime(){
  const value=useContext(MarketRuntimeContext);
  if(!value)throw new Error('useMarketRuntime must be used inside MarketRuntimeProvider');
  return value;
}
