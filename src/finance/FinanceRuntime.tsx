import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { HoldingQuote } from '../domain/uiModels';
import {
  calculateCanonicalLedgerSnapshot,
  calculateLedgerCashFlow,
  freezeTradeEntry,
  type CanonicalLedgerEntry,
  type DividendLedgerEntry,
  type OtherCashLedgerEntry,
} from './canonicalLedger';
import { INITIAL_CASH, SEED_LEDGER, SEED_QUOTES, type RuntimeQuote } from './financeSeed';

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
  holdings: HoldingQuote[];
  addTrade: (input: Parameters<typeof freezeTradeEntry>[0]) => void;
  addDividend: (entry: DividendLedgerEntry) => void;
  addOther: (entry: OtherCashLedgerEntry) => void;
  deleteEntry: (id: string) => void;
  resetFinance: () => void;
};

const FinanceContext=createContext<FinanceContextValue|null>(null);

export function FinanceProvider({children}:PropsWithChildren){
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
            setEntries(parsed.entries as CanonicalLedgerEntry[]);
            if(Number.isFinite(Number(parsed.initialCash)))setInitialCash(Number(parsed.initialCash));
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

  const snapshot=useMemo(()=>calculateCanonicalLedgerSnapshot({
    initialCash,
    entries,
    quotes:SEED_QUOTES,
  }),[initialCash,entries]);

  const holdings=useMemo<HoldingQuote[]>(()=>snapshot.holdings.map(summary=>{
    const quote=SEED_QUOTES.find(x=>x.symbol===summary.etfCode);
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
  }).filter(x=>x.shares>0),[snapshot]);

  const value=useMemo<FinanceContextValue>(()=>({
    hydrated,
    initialCash,
    entries,
    quotes:SEED_QUOTES,
    snapshot,
    holdings,
    addTrade:input=>setEntries(current=>{
      if(input.kind==='sell'){
        const available=snapshot.holdings.find(item=>item.etfCode===input.symbol)?.totalShares??0;
        if(!(input.shares>0)||input.shares>available)return current;
      }
      return [...current,freezeTradeEntry(input)];
    }),
    addDividend:entry=>setEntries(current=>[...current,entry]),
    addOther:entry=>setEntries(current=>[...current,entry]),
    deleteEntry:id=>setEntries(current=>current.filter(entry=>entry.id!==id)),
    resetFinance:()=>{
      setInitialCash(INITIAL_CASH);
      setEntries([...SEED_LEDGER]);
    },
  }),[hydrated,initialCash,entries,snapshot,holdings]);

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
