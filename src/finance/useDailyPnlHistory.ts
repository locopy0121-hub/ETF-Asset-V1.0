import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useMemo,useRef,useState} from 'react';
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
  records:readonly DailyPnlRecord[];
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
    if(entry.kind==='other')
      return [entry.id,entry.date,entry.kind,entry.label,entry.amount].join(':');
    return '';
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
  const officialAttemptRef=useRef<string|null>(null);
  const marketDataVersionRef=useRef(input.marketDataVersion);
  const persistTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const pendingPersistRef=useRef<PersistedHistory|null>(null);
  const lastPersistAtRef=useRef(0);
  useEffect(()=>{marketDataVersionRef.current=input.marketDataVersion;},[input.marketDataVersion]);
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

  const flushPersist=()=>{
    const payload=pendingPersistRef.current;
    if(!payload)return;
    pendingPersistRef.current=null;
    lastPersistAtRef.current=Date.now();
    // Serialization is intentionally deferred until the throttled flush. Live
    // 5-second quote ticks only replace this lightweight structured reference.
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
  };

  const persist=(next:readonly DailyPnlRecord[],fingerprint=ledgerFingerprint,rebuildAt=officialRebuiltAt,immediate=false)=>{
    pendingPersistRef.current={
      schema:SCHEMA,
      records:next,
      ledgerFingerprint:fingerprint,
      officialRebuiltAt:rebuildAt,
    };
    if(immediate){
      if(persistTimerRef.current){
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current=null;
      }
      flushPersist();
      return;
    }
    // Live quotes may update every five seconds. Coalesce those writes so the
    // UI can update in memory without serializing the whole history every tick.
    if(persistTimerRef.current!==null)return;
    const wait=Math.max(0,30_000-(Date.now()-lastPersistAtRef.current));
    persistTimerRef.current=setTimeout(()=>{
      persistTimerRef.current=null;
      flushPersist();
    },wait);
  };

  useEffect(()=>()=> {
    if(persistTimerRef.current){
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current=null;
    }
    flushPersist();
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
      if(storedFingerprint===ledgerFingerprint&&officialRebuiltAt!==null)return;
      const at=Date.now();
      setRecords([]);
      setStoredFingerprint(ledgerFingerprint);
      setOfficialRebuiltAt(at);
      setHistoryError(null);
      persist([],ledgerFingerprint,at,true);
      return;
    }

    const now=Date.now();
    const nowClock=taipeiClock(now);
    const today=nowClock.date;
    const officialRows=records.filter(row=>row.basis==='official-history').sort((a,b)=>a.date.localeCompare(b.date));
    const latestOfficial=officialRows.length?officialRows[officialRows.length-1]!.date:null;
    const afterClose=nowClock.hour>15||(nowClock.hour===15&&nowClock.minute>=0);
    const phaseKey=ledgerFingerprint+'|'+today+'|'+(afterClose?'after-close':'pre-close');
    // Never refetch the full range for every quote tick. A new ledger, date,
    // or transition into the post-close phase creates a new attempt key.
    if(storedFingerprint===ledgerFingerprint&&latestOfficial===today)return;
    if(officialAttemptRef.current===phaseKey)return;
    officialAttemptRef.current=phaseKey;

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
        marketDataVersion:marketDataVersionRef.current,
      });
      if(!rebuilt.length)throw new Error('尚無足夠正式收盤資料可重建持股歷史');

      const rebuiltAt=Date.now();
      setRecords(rebuilt);
      setStoredFingerprint(ledgerFingerprint);
      setOfficialRebuiltAt(rebuiltAt);
      persist(rebuilt,ledgerFingerprint,rebuiltAt,true);
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
    // aborting/restarting the full historical fetch every 1-second quote tick.
    // The rebuild reads the latest market version from a ref when it completes.
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
