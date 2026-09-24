import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { SharedSnapshot } from '../domain/snapshot';
import type { HoldingQuote } from '../domain/uiModels';
import { useMarketRuntime } from '../market/MarketRuntime';
import {
  calculateCanonicalLedgerSnapshot,
  calculateLedgerCashFlow,
  freezeTradeEntry,
  validateLedgerSequence,
  type CanonicalLedgerEntry,
  type DividendLedgerEntry,
  type OtherCashLedgerEntry,
} from './canonicalLedger';
import { INITIAL_CASH, SEED_LEDGER, type RuntimeQuote } from './financeSeed';
import { buildSharedSnapshot } from './sharedSnapshotAdapter';
import { ensureLedgerQuoteCoverage } from './runtimeQuoteCoverage';

const STORAGE_KEY='@tf-asset/v1.0.2-ledger';
const SCHEMA=1;

type PersistedFinanceState = {
  schema: number;
  initialCash: number;
  entries: CanonicalLedgerEntry[];
};

type FinanceContextValue = {
  hydrated: boolean;
  initialCash: number;
  entries: readonly CanonicalLedgerEntry[];
  quotes: readonly RuntimeQuote[];
  snapshot: ReturnType<typeof calculateCanonicalLedgerSnapshot>;
  sharedSnapshot: SharedSnapshot;
  holdings: HoldingQuote[];
  addTrade: (input: Parameters<typeof freezeTradeEntry>[0]) => void;
  addDividend: (entry: DividendLedgerEntry) => void;
  addOther: (entry: OtherCashLedgerEntry) => void;
  deleteEntry: (id: string) => void;
  resetFinance: () => void;
  clearFinance: () => void;
};

const FinanceContext=createContext<FinanceContextValue|null>(null);

export function FinanceProvider({children}:PropsWithChildren){
  const market=useMarketRuntime();
  const [initialCash,setInitialCash]=useState(INITIAL_CASH);
  const [entries,setEntries]=useState<CanonicalLedgerEntry[]>(()=>[...SEED_LEDGER]);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw=>{
        if(!alive)return;
        if(raw){
          const parsed=JSON.parse(raw) as Partial<PersistedFinanceState>;
          if(parsed.schema===SCHEMA&&Array.isArray(parsed.entries)){
            const restored=parsed.entries as CanonicalLedgerEntry[];
            if(validateLedgerSequence(restored).length===0){
              setEntries(restored);
              if(Number.isFinite(Number(parsed.initialCash)))setInitialCash(Number(parsed.initialCash));
            }
          }
        }
      })
      .catch(()=>{})
      .finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    const payload:PersistedFinanceState={schema:SCHEMA,initialCash,entries};
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
  },[hydrated,initialCash,entries]);

  useEffect(()=>{
    market.setTrackedSymbols(entries.flatMap(entry=>'symbol' in entry?[entry.symbol]:[]));
  },[entries,market.setTrackedSymbols]);

  const canonicalQuotes=useMemo(
    ()=>ensureLedgerQuoteCoverage(entries,market.quotes),
    [entries,market.quotes],
  );

  const snapshot=useMemo(()=>calculateCanonicalLedgerSnapshot({
    initialCash,
    entries,
    quotes:canonicalQuotes,
  }),[initialCash,entries,canonicalQuotes]);

  const holdings=useMemo<HoldingQuote[]>(()=>snapshot.holdings.map(summary=>{
    const quote=market.quotes.find(x=>x.symbol===summary.etfCode);
    const previousClose=quote?.previousClose??summary.currentPrice;
    return {
      symbol:summary.etfCode,
      name:summary.name,
      shares:summary.totalShares,
      price:summary.currentPrice,
      previousClose,
      avgCost:summary.averageCostPerShare,
      tradeAvg:summary.averageTradePrice,
      costAvg:summary.averageCostPerShare,
      marketValue:summary.currentMarketValue,
      pnl:summary.unrealizedProfit,
      pricePnl:summary.priceUnrealizedProfit,
      roi:summary.unrealizedROI,
      weight:summary.portfolioWeight,
      cumulativeDividend:summary.totalDividendsReceived,
      realizedPnl:summary.realizedNetPnL,
      comprehensivePnl:summary.comprehensivePnL,
      pinned:quote?.pinned??false,
      sparkline:[...(quote?.sparkline??[summary.currentPrice])],
    };
  }).filter(x=>x.shares>0),[snapshot,market.quotes]);

  const sharedSnapshot=useMemo(()=>buildSharedSnapshot({canonical:snapshot,holdings,generatedAt:market.lastSuccessAt,quoteSourceTimes:market.quotes}),[snapshot,holdings,market.lastSuccessAt,market.quotes]);

  const value=useMemo<FinanceContextValue>(()=>({
    hydrated,
    initialCash,
    entries,
    quotes:market.quotes,
    snapshot,
    sharedSnapshot,
    holdings,
    addTrade:input=>setEntries(current=>{
      const candidate=[...current,freezeTradeEntry(input)];
      return validateLedgerSequence(candidate).length===0?candidate:current;
    }),
    addDividend:entry=>setEntries(current=>[...current,entry]),
    addOther:entry=>setEntries(current=>[...current,entry]),
    deleteEntry:id=>setEntries(current=>{
      const candidate=current.filter(entry=>entry.id!==id);
      return validateLedgerSequence(candidate).length===0?candidate:current;
    }),
    resetFinance:()=>{
      setInitialCash(INITIAL_CASH);
      setEntries([...SEED_LEDGER]);
    },
    clearFinance:()=>{
      setInitialCash(0);
      setEntries([]);
    },
  }),[hydrated,initialCash,entries,snapshot,sharedSnapshot,holdings,market.quotes]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(){
  const value=useContext(FinanceContext);
  if(!value)throw new Error('useFinance must be used inside FinanceProvider');
  return value;
}

export function ledgerDisplayAmount(entry:CanonicalLedgerEntry){
  if(entry.kind==='buy'||entry.kind==='sell')return entry.amount;
  if(entry.kind==='dividend')return calculateLedgerCashFlow(entry);
  return Math.abs(entry.amount);
}
