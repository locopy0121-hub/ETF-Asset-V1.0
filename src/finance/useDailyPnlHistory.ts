import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useMemo,useState} from 'react';
import {fetchOfficialDailyHistoryRange} from '../market/twseDailyHistory';
import type {CanonicalLedgerEntry,CanonicalLedgerSnapshot} from './canonicalLedger';
import type {RuntimeQuote} from './financeSeed';
import {
  deriveDailyPnlRecord,
  firstTradeDate,
  normalizeDailyPnlRecords,
  rebuildDailyPnlRecordsFromOfficialHistory,
  summarizeDailyPnl,
  taipeiClock,
  tradeSymbols,
  upsertDailyPnlRecord,
  type DailyPnlRecord,
} from './dailyPnlHistory';

const STORAGE_KEY='@tf-asset/v3.2.9-daily-pnl-history';
const SCHEMA=2;

type PersistedHistory={
  schema:number;
  records:DailyPnlRecord[];
  ledgerFingerprint:string;
  officialRebuiltAt:number|null;
};

const tradeFingerprint=(entries:readonly CanonicalLedgerEntry[])=>entries
  .filter(entry=>entry.kind==='buy'||entry.kind==='sell'||entry.kind==='dividend'||entry.kind==='other')
  .map(entry=>{
    if(entry.kind==='buy'||entry.kind==='sell')
      return [entry.id,entry.date,entry.kind,entry.symbol,entry.shares,entry.price,entry.amount,entry.actualFee,entry.actualTax].join(':');
    if(entry.kind==='dividend')
      return [entry.id,entry.date,entry.kind,entry.symbol,entry.perShareAmount,entry.sharesHeld].join(':');
    return [entry.id,entry.date,entry.kind,entry.label,entry.amount].join(':');
  })
  .sort().join('|');

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
  const [storedFingerprint,setStoredFingerprint]=useState('');
  const [officialRebuiltAt,setOfficialRebuiltAt]=useState<number|null>(null);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historyError,setHistoryError]=useState<string|null>(null);
  const ledgerFingerprint=useMemo(()=>tradeFingerprint(input.entries),[input.entries]);
  const historyStartDate=useMemo(()=>firstTradeDate(input.entries),[input.entries]);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw=>{
        if(!alive||!raw)return;
        const parsed=JSON.parse(raw) as Partial<PersistedHistory>;
        if(parsed.schema===SCHEMA){
          setRecords(normalizeDailyPnlRecords(parsed.records));
          setStoredFingerprint(typeof parsed.ledgerFingerprint==='string'?parsed.ledgerFingerprint:'');
          setOfficialRebuiltAt(typeof parsed.officialRebuiltAt==='number'&&Number.isFinite(parsed.officialRebuiltAt)?parsed.officialRebuiltAt:null);
        }
      })
      .catch(()=>{})
      .finally(()=>{if(alive)setStorageHydrated(true);});
    return()=>{alive=false;};
  },[]);

  const persist=(next:readonly DailyPnlRecord[],fingerprint=ledgerFingerprint,rebuildAt=officialRebuiltAt)=>{
    const payload:PersistedHistory={
      schema:SCHEMA,
      records:[...next],
      ledgerFingerprint:fingerprint,
      officialRebuiltAt:rebuildAt,
    };
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
  };

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

  // Keep the current trading day live while the official historical rebuild
  // is unavailable or has not published today's close yet.
  useEffect(()=>{
    if(!input.hydrated||!storageHydrated||!candidate)return;
    setRecords(current=>{
      const base=storedFingerprint===ledgerFingerprint?current:[];
      const next=upsertDailyPnlRecord(base,candidate);
      const before=base.find(row=>row.date===candidate.date);
      const after=next.find(row=>row.date===candidate.date);
      const unchanged=!!before&&!!after&&
        before.final===after.final&&before.basis===after.basis&&
        before.totalPnl===after.totalPnl&&before.todayPnl===after.todayPnl&&
        before.totalMarketValue===after.totalMarketValue&&before.previousMarketValue===after.previousMarketValue&&
        before.marketDataVersion===after.marketDataVersion;
      if(!unchanged)persist(next,storedFingerprint,officialRebuiltAt);
      return unchanged?current:next;
    });
  },[candidate,input.hydrated,storageHydrated,storedFingerprint,ledgerFingerprint,officialRebuiltAt]);

  // Full official rebuild runs when the ledger changes or when this ledger has
  // never been rebuilt. It deliberately does not depend on live quote ticks.
  useEffect(()=>{
    if(!input.hydrated||!storageHydrated)return;
    const first=firstTradeDate(input.entries);
    const symbols=tradeSymbols(input.entries);
    if(!first||symbols.length===0){
      setRecords([]);
      setStoredFingerprint(ledgerFingerprint);
      setOfficialRebuiltAt(Date.now());
      setHistoryError(null);
      persist([],ledgerFingerprint,Date.now());
      return;
    }

    const now=Date.now();
    const nowClock=taipeiClock(now);
    const today=nowClock.date;
    const officialRows=records.filter(row=>row.basis==='official-history').sort((a,b)=>a.date.localeCompare(b.date));
    const latestOfficial=officialRows.length?officialRows[officialRows.length-1]!.date:null;
    const rebuildClock=officialRebuiltAt===null?null:taipeiClock(officialRebuiltAt);
    const attemptedToday=rebuildClock?.date===today;
    const afterClose=nowClock.hour>15||(nowClock.hour===15&&nowClock.minute>=0);
    const attemptedAfterClose=!!rebuildClock&&attemptedToday&&
      (rebuildClock.hour>15||(rebuildClock.hour===15&&rebuildClock.minute>=0));
    // Same ledger + today's close is complete, or we already attempted the
    // relevant phase today. This prevents repeated full-history fetch loops.
    if(storedFingerprint===ledgerFingerprint&&(
      latestOfficial===today||
      (attemptedToday&&(!afterClose||attemptedAfterClose))
    ))return;

    let alive=true;
    const controller=new AbortController();
    setHistoryLoading(true);
    setHistoryError(null);
    (async()=>{
      const pairs=await Promise.all(symbols.map(async symbol=>{
        const rows=await fetchOfficialDailyHistoryRange(symbol,first,today,controller.signal);
        if(first<today&&rows.length===0)throw new Error(symbol+' 找不到正式歷史收盤資料');
        return [symbol,rows] as const;
      }));
      if(!alive)return;
      const histories=new Map(pairs);
      const rebuilt=rebuildDailyPnlRecordsFromOfficialHistory({
        initialCash:input.initialCash,
        entries:input.entries,
        histories,
        marketDataVersion:input.marketDataVersion,
      });
      if(!rebuilt.length)throw new Error('尚無足夠正式收盤資料可重建持股歷史');

      const rebuiltAt=Date.now();
      setRecords(rebuilt);
      setStoredFingerprint(ledgerFingerprint);
      setOfficialRebuiltAt(rebuiltAt);
      persist(rebuilt,ledgerFingerprint,rebuiltAt);
    })().catch(error=>{
      if(!alive||controller.signal.aborted)return;
      setHistoryError(error instanceof Error?error.message:String(error));
    }).finally(()=>{
      if(alive)setHistoryLoading(false);
    });
    return()=>{
      alive=false;
      controller.abort();
    };
    // records/live market ticks are intentionally excluded to avoid repeatedly
    // fetching all historical months while the home screen is open.
  },[input.hydrated,storageHydrated,input.entries,input.initialCash,ledgerFingerprint,storedFingerprint,officialRebuiltAt]);

  const visibleRecords=useMemo(()=>{
    const base=storedFingerprint===ledgerFingerprint?records:[];
    if(!candidate)return base;
    return upsertDailyPnlRecord(base,candidate);
  },[records,candidate,storedFingerprint,ledgerFingerprint]);
  const stats=useMemo(()=>summarizeDailyPnl(visibleRecords),[visibleRecords]);
  const current=useMemo(()=>{
    const currentDate=candidate?.date??taipeiClock(Date.now()).date;
    return visibleRecords.find(row=>row.date===currentDate)??stats.latest;
  },[candidate,visibleRecords,stats.latest]);

  return {
    hydrated:storageHydrated,
    records:visibleRecords,
    current,
    latest:stats.latest,
    stats,
    historyLoading,
    historyError,
    historyStartDate,
    officialRebuiltAt,
  };
}
