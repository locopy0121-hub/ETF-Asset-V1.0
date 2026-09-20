import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { FALLBACK_INSTRUMENTS, loadInstrumentRegistry, type Instrument } from './instrumentRegistry';

export type MarketSession='preopen'|'open'|'closed'|'holiday';
export type QuoteSource='TWSE'|'AUTO';
export type MarketQuote=Readonly<{
  symbol:string;
  name:string;
  currentPrice:number;
  previousClose:number;
  change:number;
  changePct:number;
  volume:number;
  updatedAt:number;
  source:'TWSE';
  session:MarketSession;
  stale:boolean;
}>;

export type MarketSettings=Readonly<{
  enabled:boolean;
  source:QuoteSource;
  openIntervalMs:number;
  closedIntervalMs:number;
  refreshOnForeground:boolean;
  staleAfterMs:number;
}>;

const DEFAULT_SETTINGS:MarketSettings={
  enabled:true,
  source:'AUTO',
  openIntervalMs:1000,
  closedIntervalMs:15*60*1000,
  refreshOnForeground:true,
  staleAfterMs:90*1000,
};
const SETTINGS_KEY='@tf-asset/market-settings-v1';
const QUOTE_CACHE='@tf-asset/market-quotes-v1';

type Ctx={
  hydrated:boolean;
  instruments:readonly Instrument[];
  quotes:readonly MarketQuote[];
  session:MarketSession;
  settings:MarketSettings;
  lastUpdatedAt:number|null;
  updateSettings:(patch:Partial<MarketSettings>)=>void;
  refresh:()=>Promise<void>;
};
const MarketContext=createContext<Ctx|null>(null);

function taipeiParts(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(date);
  const get=(type:string)=>parts.find(p=>p.type===type)?.value??'';
  return {weekday:get('weekday'),hour:Number(get('hour')),minute:Number(get('minute'))};
}
export function resolveMarketSession(date=new Date()):MarketSession{
  const {weekday,hour,minute}=taipeiParts(date);
  if(weekday==='Sat'||weekday==='Sun')return 'holiday';
  const minutes=hour*60+minute;
  if(minutes<9*60)return 'preopen';
  if(minutes<=13*60+30)return 'open';
  return 'closed';
}
const num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:0;};

async function fetchTwse(symbols:readonly string[],names:Map<string,string>,staleAfterMs:number):Promise<MarketQuote[]>{
  if(!symbols.length)return [];
  const channels=symbols.map(s=>'tse_'+s+'.tw').join('|');
  const url='https://mis.twse.com.tw/stock/api/getStockInfo.jsp?json=1&delay=0&ex_ch='+encodeURIComponent(channels)+'&_='+Date.now();
  const res=await fetch(url,{headers:{Accept:'application/json'}});
  if(!res.ok)throw new Error('TWSE '+res.status);
  const json=await res.json() as {msgArray?:Array<Record<string,unknown>>};
  const now=Date.now(),session=resolveMarketSession();
  return (json.msgArray??[]).map(row=>{
    const symbol=String(row.c??'').trim();
    const previousClose=num(row.y);
    let currentPrice=num(row.z);
    if(currentPrice<=0)currentPrice=num(row.o)||previousClose;
    const change=currentPrice-previousClose;
    return {
      symbol,
      name:String(row.n??names.get(symbol)??symbol),
      currentPrice,
      previousClose,
      change,
      changePct:previousClose>0?change/previousClose*100:0,
      volume:num(row.v),
      updatedAt:num(row.tlong)||now,
      source:'TWSE' as const,
      session,
      stale:session==='open'&&now-(num(row.tlong)||now)>staleAfterMs,
    };
  }).filter(x=>x.symbol&&x.currentPrice>0);
}

export function MarketProvider({children}:PropsWithChildren){
  const [hydrated,setHydrated]=useState(false);
  const [instruments,setInstruments]=useState<Instrument[]>([...FALLBACK_INSTRUMENTS]);
  const [quotes,setQuotes]=useState<MarketQuote[]>([]);
  const [settings,setSettingsState]=useState<MarketSettings>(DEFAULT_SETTINGS);
  const [lastUpdatedAt,setLastUpdatedAt]=useState<number|null>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const appState=useRef<AppStateStatus>(AppState.currentState);

  useEffect(()=>{(async()=>{
    try{
      const [rawSettings,rawQuotes,registry]=await Promise.all([
        AsyncStorage.getItem(SETTINGS_KEY),AsyncStorage.getItem(QUOTE_CACHE),loadInstrumentRegistry(),
      ]);
      if(rawSettings)setSettingsState({...DEFAULT_SETTINGS,...JSON.parse(rawSettings)});
      if(rawQuotes){
        const parsed=JSON.parse(rawQuotes) as MarketQuote[];
        if(Array.isArray(parsed))setQuotes(parsed);
      }
      setInstruments(registry);
    }catch{}finally{setHydrated(true);}
  })();},[]);

  const updateSettings=useCallback((patch:Partial<MarketSettings>)=>{
    setSettingsState(current=>{
      const next={...current,...patch};
      AsyncStorage.setItem(SETTINGS_KEY,JSON.stringify(next)).catch(()=>{});
      return next;
    });
  },[]);

  const refresh=useCallback(async()=>{
    if(!settings.enabled)return;
    try{
      const symbols=Array.from(new Set([...quotes.map(x=>x.symbol),...FALLBACK_INSTRUMENTS.map(x=>x.symbol)]));
      const names=new Map(instruments.map(x=>[x.symbol,x.name]));
      const fresh=await fetchTwse(symbols,names,settings.staleAfterMs);
      if(fresh.length){
        setQuotes(fresh);
        const stamp=Date.now();setLastUpdatedAt(stamp);
        AsyncStorage.setItem(QUOTE_CACHE,JSON.stringify(fresh)).catch(()=>{});
      }
    }catch{}
  },[settings.enabled,settings.staleAfterMs,instruments,quotes]);

  useEffect(()=>{
    if(!hydrated||!settings.enabled)return;
    let cancelled=false;
    const schedule=()=>{
      if(cancelled)return;
      if(timer.current)clearTimeout(timer.current);
      const session=resolveMarketSession();
      const delay=session==='open'?settings.openIntervalMs:settings.closedIntervalMs;
      timer.current=setTimeout(async()=>{await refresh();schedule();},Math.max(1000,delay));
    };
    refresh().finally(schedule);
    return()=>{cancelled=true;if(timer.current)clearTimeout(timer.current);};
  },[hydrated,settings.enabled,settings.openIntervalMs,settings.closedIntervalMs,refresh]);

  useEffect(()=>AppState.addEventListener('change',next=>{
    const was=appState.current;appState.current=next;
    if(settings.refreshOnForeground&&was!=='active'&&next==='active')refresh();
  }).remove,[settings.refreshOnForeground,refresh]);

  const value=useMemo<Ctx>(()=>({
    hydrated,instruments,quotes,session:resolveMarketSession(),settings,lastUpdatedAt,updateSettings,refresh,
  }),[hydrated,instruments,quotes,settings,lastUpdatedAt,updateSettings,refresh]);

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}
export function useMarket(){
  const value=useContext(MarketContext);
  if(!value)throw new Error('useMarket must be used inside MarketProvider');
  return value;
}
