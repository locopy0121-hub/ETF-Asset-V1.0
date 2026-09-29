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
import {marketIntradaySeriesFor,marketQuoteSnapshotFor,marketValuationQuoteFor} from '../market/marketCenterViews';
import {resolveEtfDisplayName} from '../market/etfDisplayName';
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
import { isGeneratedLegacyReversal, migrateLegacyOpeningCash } from './cashAudit';
import { buildSharedSnapshot } from './sharedSnapshotAdapter';
import { ensureLedgerQuoteCoverage } from './runtimeQuoteCoverage';

const STORAGE_KEY='@tf-asset/v1.0.2-ledger';
const SCHEMA=4;
const holdingQuoteQuality=(quality:RuntimeQuote['quality']|undefined):NonNullable<HoldingQuote['quoteQuality']>=>{
  switch(quality){
    case 'trade':
    case 'backup_realtime':
    case 'previous_close':
    case 'official_close':
      return quality;
    default:
      return 'unavailable';
  }
};


type PersistedFinanceState = {
  schema: number;
  initialCash: number;
  entries: CanonicalLedgerEntry[];
  cashConfigured?: boolean;
};

type FinanceContextValue = {
  hydrated: boolean;
  initialCash: number;
  cashConfigured: boolean;
  entries: readonly CanonicalLedgerEntry[];
  quotes: readonly RuntimeQuote[];
  snapshot: ReturnType<typeof calculateCanonicalLedgerSnapshot>;
  sharedSnapshot: SharedSnapshot;
  holdings: HoldingQuote[];
  valuationComplete:boolean;
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
  const [cashConfigured,setCashConfigured]=useState(false);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw=>{
        if(!alive)return;
        if(raw){
          const parsed=JSON.parse(raw) as Partial<PersistedFinanceState>;
          const sourceSchema=Number(parsed.schema);
          if(([1,2,3,SCHEMA].includes(sourceSchema))&&Array.isArray(parsed.entries)){
            const restored=parsed.entries as CanonicalLedgerEntry[];
            const parsedInitialCash=Number(parsed.initialCash);
            const parsedCashConfigured=parsed.cashConfigured===true;
            const normalized=migrateLegacyOpeningCash(
              Number.isFinite(parsedInitialCash)?parsedInitialCash:INITIAL_CASH,
              restored,
              {
                forceOpeningCashZero:!parsedCashConfigured,
                removeGeneratedLegacyReversals:true,
              },
            );
            if(validateLedgerSequence(normalized.entries).length===0){
              const explicitCashAdjustment=normalized.entries.some(entry=>
                entry.kind==='other'&&!isGeneratedLegacyReversal(entry)
              );
              const restoredCashConfigured=parsedCashConfigured||explicitCashAdjustment;
              setEntries(normalized.entries);
              setInitialCash(normalized.initialCash);
              setCashConfigured(restoredCashConfigured);
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
    const payload:PersistedFinanceState={schema:SCHEMA,initialCash,entries,cashConfigured};
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
  },[hydrated,initialCash,entries,cashConfigured]);

  useEffect(()=>{
    market.setTrackedSymbols(entries.flatMap(entry=>'symbol' in entry?[entry.symbol]:[]));
  },[entries,market.setTrackedSymbols]);

  const valuationQuotes=useMemo(
    ()=>market.quotes.filter(row=>marketValuationQuoteFor(market.quotes,row.symbol)===row),
    [market.quotes],
  );
  const canonicalQuotes=useMemo(
    ()=>ensureLedgerQuoteCoverage(entries,valuationQuotes),
    [entries,valuationQuotes],
  );

  const snapshot=useMemo(()=>calculateCanonicalLedgerSnapshot({
    initialCash,
    entries,
    quotes:canonicalQuotes,
  }),[initialCash,entries,canonicalQuotes]);

  const holdings=useMemo<HoldingQuote[]>(()=>snapshot.holdings.map(summary=>{
    const quote=marketQuoteSnapshotFor(market.quotes,summary.etfCode);
    const valuationQuote=marketValuationQuoteFor(market.quotes,summary.etfCode);
    const intraday=marketIntradaySeriesFor(market.quotes,summary.etfCode);
    const verified=Boolean(valuationQuote);
    const catalogName=market.catalog.find(item=>item.symbol===summary.etfCode)?.name;
    const previousClose=valuationQuote?.previousClose&&valuationQuote.previousClose>0?
      valuationQuote.previousClose:summary.currentPrice;
    return {
      symbol:summary.etfCode,
      name:resolveEtfDisplayName(summary.etfCode,catalogName,summary.name,quote?.name),
      quoteVerified:verified,
      quoteQuality:holdingQuoteQuality(valuationQuote?.quality),
      quoteSourceAt:valuationQuote?.sourceQuoteAt??null,
      marketDataVersion:market.marketDataVersion,
      previousCloseKnown:verified?valuationQuote?.previousCloseKnown!==false:false,
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
      intraday:intraday.points,
      intradayDate:intraday.date,
      intradayPreviousClose:intraday.previousClose,
    };
  }).filter(x=>x.shares>0),[snapshot,market.quotes,market.catalog,market.marketDataVersion]);
  const valuationComplete=holdings.every(row=>row.quoteVerified===true);

  const sharedSnapshot=useMemo(()=>buildSharedSnapshot({canonical:snapshot,holdings,generatedAt:market.lastSuccessAt,quoteSourceTimes:market.quotes,marketDataVersion:market.marketDataVersion,valuationComplete,cashConfigured}),[snapshot,holdings,market.lastSuccessAt,market.quotes,market.marketDataVersion,valuationComplete,cashConfigured]);

  const value=useMemo<FinanceContextValue>(()=>({
    hydrated,
    initialCash,
    cashConfigured,
    entries,
    quotes:market.quotes,
    snapshot,
    sharedSnapshot,
    holdings,
    valuationComplete,
    addTrade:input=>setEntries(current=>{
      const candidate=[...current,freezeTradeEntry(input)];
      return validateLedgerSequence(candidate).length===0?candidate:current;
    }),
    addDividend:entry=>setEntries(current=>[...current,entry]),
    addOther:entry=>{setCashConfigured(true);setEntries(current=>[...current,entry]);},
    deleteEntry:id=>setEntries(current=>{
      const candidate=current.filter(entry=>entry.id!==id);
      return validateLedgerSequence(candidate).length===0?candidate:current;
    }),
    resetFinance:()=>{
      setCashConfigured(false);
      setInitialCash(INITIAL_CASH);
      setEntries([...SEED_LEDGER]);
    },
    clearFinance:()=>{
      setCashConfigured(false);
      setInitialCash(0);
      setEntries([]);
    },
  }),[hydrated,initialCash,cashConfigured,entries,snapshot,sharedSnapshot,holdings,valuationComplete,market.quotes]);

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
