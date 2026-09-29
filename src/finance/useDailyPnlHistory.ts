import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useMemo,useState} from 'react';
import type {CanonicalLedgerEntry,CanonicalLedgerSnapshot} from './canonicalLedger';
import type {RuntimeQuote} from './financeSeed';
import {
  deriveDailyPnlRecord,
  normalizeDailyPnlRecords,
  summarizeDailyPnl,
  upsertDailyPnlRecord,
  type DailyPnlRecord,
} from './dailyPnlHistory';

const STORAGE_KEY='@tf-asset/v3.2.7-daily-pnl-history';
const SCHEMA=1;

type PersistedHistory={schema:number;records:DailyPnlRecord[]};

export function useDailyPnlHistory(input:{
  hydrated:boolean;
  initialCash:number;
  entries:readonly CanonicalLedgerEntry[];
  rawQuotes:readonly RuntimeQuote[];
  currentSnapshot:CanonicalLedgerSnapshot;
  valuationComplete:boolean;
  marketDataVersion:number;
}){
  const [storageHydrated,setStorageHydrated]=useState(false);
  const [records,setRecords]=useState<DailyPnlRecord[]>([]);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw=>{
        if(!alive||!raw)return;
        const parsed=JSON.parse(raw) as Partial<PersistedHistory>;
        if(parsed.schema===SCHEMA)setRecords(normalizeDailyPnlRecords(parsed.records));
      })
      .catch(()=>{})
      .finally(()=>{if(alive)setStorageHydrated(true);});
    return()=>{alive=false;};
  },[]);

  const candidate=useMemo(()=>deriveDailyPnlRecord({
    initialCash:input.initialCash,
    entries:input.entries,
    rawQuotes:input.rawQuotes,
    currentSnapshot:input.currentSnapshot,
    valuationComplete:input.valuationComplete,
    marketDataVersion:input.marketDataVersion,
  }),[
    input.initialCash,input.entries,input.rawQuotes,input.currentSnapshot,
    input.valuationComplete,input.marketDataVersion,
  ]);

  useEffect(()=>{
    if(!input.hydrated||!storageHydrated||!candidate)return;
    setRecords(current=>{
      const next=upsertDailyPnlRecord(current,candidate);
      const before=current.find(row=>row.date===candidate.date);
      const after=next.find(row=>row.date===candidate.date);
      const unchanged=!!before&&!!after&&
        before.final===after.final&&before.totalPnl===after.totalPnl&&
        before.todayPnl===after.todayPnl&&before.totalMarketValue===after.totalMarketValue&&
        before.marketDataVersion===after.marketDataVersion;
      if(!unchanged){
        const payload:PersistedHistory={schema:SCHEMA,records:next};
        AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
      }
      return unchanged?current:next;
    });
  },[candidate,input.hydrated,storageHydrated]);

  const visibleRecords=useMemo(()=>{
    if(!candidate)return records;
    return upsertDailyPnlRecord(records,candidate);
  },[records,candidate]);
  const stats=useMemo(()=>summarizeDailyPnl(visibleRecords),[visibleRecords]);

  return {hydrated:storageHydrated,records:visibleRecords,latest:stats.latest,stats};
}
