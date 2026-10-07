import {Alert,AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { SharedSnapshot } from '../domain/snapshot';
import type { HoldingQuote } from '../domain/uiModels';
import { useMarketRuntime } from '../market/MarketRuntime';
import {marketIntradaySeriesFromRow,marketQuoteSnapshotFromRow,marketValuationQuoteFromRow,valuationSessionActive,valuationValidUntil} from '../market/marketCenterViews';
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

import {reduceDividendPlans,restoreDividendPlans,hasDividendReceipt,validDividendReceipt,type DividendPlanState,type DividendPlanAction,type DividendPlan} from '../dividend/dividendPlans';
import {deviceLocalCalendarDate} from '../dividend/dividendCalendar';

const STORAGE_KEY='@tf-asset/v1.0.2-ledger';
const SCHEMA=4;
const holdingQuoteQuality=(quality:RuntimeQuote['quality']|undefined):NonNullable<HoldingQuote['quoteQuality']>=>{
  switch(quality){
    case 'trade':
    case 'backup_realtime':
    case 'bid_ask':
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
  dividendPlans?:unknown;
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
  addDividend: (entry: DividendLedgerEntry) => boolean;
  dividendPlans:readonly DividendPlan[];
  dividendPlanError:string|null;
  applyDividendPlan:(action:DividendPlanAction)=>string|undefined;
  addOther: (entry: OtherCashLedgerEntry) => void;
  deleteEntry: (id: string) => void;
  resetFinance: () => void;
  clearFinance: () => void;
};

const FinanceContext=createContext<FinanceContextValue|null>(null);

export function FinanceProvider({children}:PropsWithChildren){
  const market=useMarketRuntime();
  const [initialCash,setInitialCash]=useState(INITIAL_CASH);
  const [ledgerState,setLedgerState]=useState<DividendPlanState>(()=>({entries:[...SEED_LEDGER],dividendPlans:[]}));
  const {entries,dividendPlans}=ledgerState;
  const [invalidDividendPlans,setInvalidDividendPlans]=useState<unknown>(undefined);
  const setEntries=useCallback((update:CanonicalLedgerEntry[]|((current:CanonicalLedgerEntry[])=>CanonicalLedgerEntry[]))=>{
    setLedgerState(current=>({...current,entries:typeof update==='function'?update(current.entries):update}));
  },[]);
  const [cashConfigured,setCashConfigured]=useState(false);
  const [hydrated,setHydrated]=useState(false);
  const [valuationNow,setValuationNow]=useState(Date.now);
  useEffect(()=>{
    const timer=setInterval(()=>setValuationNow(Date.now()),30_000);
    const listener=AppState.addEventListener('change',state=>{if(state==='active')setValuationNow(Date.now());});
    return()=>{clearInterval(timer);listener.remove();};
  },[]);
  const valuationContext=useMemo(()=>({now:valuationNow,unresolvedSymbols:market.unresolvedSymbols}),[valuationNow,market.unresolvedSymbols]);

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
              let plans:DividendPlan[]=[];
              try{plans=restoreDividendPlans(parsed.dividendPlans);}catch{setInvalidDividendPlans(parsed.dividendPlans);}
              setLedgerState({entries:normalized.entries,dividendPlans:plans});
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
    const payload:PersistedFinanceState={schema:SCHEMA,initialCash,entries,cashConfigured,dividendPlans:invalidDividendPlans!==undefined?invalidDividendPlans:dividendPlans};
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
  },[hydrated,initialCash,entries,cashConfigured,dividendPlans,invalidDividendPlans]);

  useEffect(()=>{
    market.setTrackedSymbols(entries.flatMap(entry=>'symbol' in entry?[entry.symbol]:[]));
  },[entries,market.setTrackedSymbols]);

  const quoteBySymbol=useMemo(
    ()=>new Map(market.quotes.map(row=>[row.symbol,row] as const)),
    [market.quotes],
  );
  const catalogNameBySymbol=useMemo(
    ()=>new Map(market.catalog.map(item=>[item.symbol,item.name] as const)),
    [market.catalog],
  );
  const ledgerNameBySymbol=useMemo(()=>{
    const names=new Map<string,string>();
    for(const entry of entries){
      if(!('symbol' in entry))continue;
      const name=String(entry.name??'').trim();
      if(name&&name!==entry.symbol)names.set(entry.symbol,name);
    }
    return names;
  },[entries]);

  const valuationQuotes=useMemo(
    ()=>market.quotes.filter(row=>marketValuationQuoteFromRow(row,valuationContext)===row),
    [market.quotes,valuationContext],
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

  const holdings=useMemo<HoldingQuote[]>(()=>snapshot.holdings.map<HoldingQuote>(summary=>{
    const rawQuote=quoteBySymbol.get(summary.etfCode);
    const quote=marketQuoteSnapshotFromRow(rawQuote);
    const valuationQuote=marketValuationQuoteFromRow(rawQuote,valuationContext);
    const intraday=marketIntradaySeriesFromRow(rawQuote);
    const verified=Boolean(valuationQuote);
    const previousClose=valuationQuote?.previousClose&&valuationQuote.previousClose>0?
      valuationQuote.previousClose:summary.currentPrice;
    return {
      symbol:summary.etfCode,
      name:resolveEtfDisplayName(
        summary.etfCode,
        catalogNameBySymbol.get(summary.etfCode),
        ledgerNameBySymbol.get(summary.etfCode),
        quote?.name,
      ),
      quoteVerified:verified,
      valuationStatus:verified?(valuationSessionActive(valuationNow)?'current_session':'reference'):'unavailable',
      valuationValidUntil:valuationQuote?valuationValidUntil(valuationQuote,valuationNow):null,
      quoteStatus:valuationQuote?.quoteStatus,
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
      sparkline:quote?.sparkline??[summary.currentPrice],
      intraday:intraday.points,
      intradayDate:intraday.date,
      intradayPreviousClose:intraday.previousClose,
    };
  }).filter(x=>x.shares>0),[
    snapshot,quoteBySymbol,catalogNameBySymbol,ledgerNameBySymbol,market.marketDataVersion,valuationContext,valuationNow,
  ]);
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
    dividendPlans,
    dividendPlanError:invalidDividendPlans!==undefined?'股息預告資料格式異常，原始內容已保留；請還原有效備份後重新啟動。':null,
    applyDividendPlan:action=>{
      if(!hydrated)return '帳務讀取中，請稍候';
      if(invalidDividendPlans!==undefined)return '股息預告資料格式異常，請先還原有效備份';
      const today=deviceLocalCalendarDate();
      const result=reduceDividendPlans(ledgerState,action,today);
      if(result.error)return result.error;
      setLedgerState(current=>reduceDividendPlans(current,action,today).state);
      return undefined;
    },
    addDividend:entry=>{
      if(!hydrated||!validDividendReceipt(entry,deviceLocalCalendarDate())||hasDividendReceipt(entries,entry)){
        Alert.alert('未入帳','請核對有效配發日、正整數股數與每股股息；未來或重複股息不可直接入帳。');
        return false;
      }
      setEntries(current=>hasDividendReceipt(current,entry)?current:[...current,entry]);
      return true;
    },
    addOther:entry=>{setCashConfigured(true);setEntries(current=>[...current,entry]);},
    deleteEntry:id=>setEntries(current=>{
      const candidate=current.filter(entry=>entry.id!==id);
      return validateLedgerSequence(candidate).length===0?candidate:current;
    }),
    resetFinance:()=>{
      setCashConfigured(false);
      setInitialCash(INITIAL_CASH);
      setLedgerState({entries:[...SEED_LEDGER],dividendPlans:[]});
      setInvalidDividendPlans(undefined);
    },
    clearFinance:()=>{
      setCashConfigured(false);
      setInitialCash(0);
      setLedgerState({entries:[],dividendPlans:[]});
      setInvalidDividendPlans(undefined);
    },
  }),[hydrated,initialCash,cashConfigured,entries,snapshot,sharedSnapshot,holdings,valuationComplete,market.quotes,ledgerState,dividendPlans,invalidDividendPlans, setEntries]);

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
