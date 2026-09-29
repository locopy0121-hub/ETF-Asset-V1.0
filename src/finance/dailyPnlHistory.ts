import type {DailyCandle} from '../market/twseDailyHistory';
import type {CanonicalLedgerEntry,CanonicalLedgerSnapshot,MarketQuoteInput} from './canonicalLedger';
import {calculateCanonicalLedgerSnapshot} from './canonicalLedger';
import type {RuntimeQuote} from './financeSeed';
import {ensureLedgerQuoteCoverage} from './runtimeQuoteCoverage';

export type DailyPnlBasis='official-history'|'live-previous-close';

export type DailyPnlRecord=Readonly<{
  date:string;
  /** Canonical total PnL at the previous valuation point. */
  previousTotalPnl:number;
  /**
   * Daily market-value PnL. Trade principal is removed so a buy/sell does not
   * become fake investment profit/loss.
   */
  todayPnl:number;
  /** Canonical total PnL (fees/tax/realized/dividends included by Finance Core). */
  totalPnl:number;
  previousMarketValue:number;
  totalMarketValue:number;
  /** Buy notional is positive, sell notional is negative. */
  tradeMarketFlow:number;
  /** Exact bridge: previousTotalPnl + todayPnl + accountingAdjustment = totalPnl. */
  accountingAdjustment:number;
  capturedAt:number;
  sourceQuoteAt:number;
  marketDataVersion:number;
  final:boolean;
  basis:DailyPnlBasis;
}>;

export type DailyPnlStats=Readonly<{
  days:number;
  gainDays:number;
  lossDays:number;
  flatDays:number;
  periodPnl:number;
  averageDailyPnl:number;
  best:DailyPnlRecord|null;
  worst:DailyPnlRecord|null;
  latest:DailyPnlRecord|null;
}>;

const TAIPEI_OFFSET_MS=8*60*60*1000;
const MAX_RECORDS=8000;

type TradeEntry=Extract<CanonicalLedgerEntry,{kind:'buy'|'sell'}>;

export function taipeiClock(timestamp:number){
  const date=new Date(timestamp+TAIPEI_OFFSET_MS);
  return {date:date.toISOString().slice(0,10),hour:date.getUTCHours(),minute:date.getUTCMinutes()};
}

export function firstTradeDate(entries:readonly CanonicalLedgerEntry[]){
  const dates=entries.filter((entry):entry is TradeEntry=>entry.kind==='buy'||entry.kind==='sell').map(entry=>entry.date).sort();
  return dates[0]??null;
}

export function tradeSymbols(entries:readonly CanonicalLedgerEntry[]){
  return [...new Set(entries.filter((entry):entry is TradeEntry=>entry.kind==='buy'||entry.kind==='sell').map(entry=>entry.symbol))].sort();
}

function sourceTradingTimestamp(quotes:readonly RuntimeQuote[]){
  const times=quotes.map(quote=>quote.sourceQuoteAt)
    .filter((value):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0);
  return times.length?Math.max(...times):null;
}

function heldSymbolsBefore(entries:readonly CanonicalLedgerEntry[],dateExclusive:string){
  const shares=new Map<string,number>();
  const trades=entries.filter((entry):entry is TradeEntry =>
    (entry.kind==='buy'||entry.kind==='sell')&&entry.date<dateExclusive)
    .slice().sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  for(const entry of trades){
    const current=shares.get(entry.symbol)??0;
    shares.set(entry.symbol,entry.kind==='buy'?current+entry.shares:Math.max(0,current-entry.shares));
  }
  return new Set([...shares].filter(([,value])=>value>0).map(([symbol])=>symbol));
}

function previousCloseQuoteSet(
  entries:readonly CanonicalLedgerEntry[],
  rawQuotes:readonly RuntimeQuote[],
  recordDate:string,
):readonly MarketQuoteInput[]|null{
  const held=heldSymbolsBefore(entries,recordDate);
  const rawBySymbol=new Map(rawQuotes.map(quote=>[quote.symbol,quote]));
  for(const symbol of held){
    const quote=rawBySymbol.get(symbol);
    if(!quote||quote.previousCloseKnown===false||!Number.isFinite(quote.previousClose)||quote.previousClose<=0)return null;
  }
  const covered=ensureLedgerQuoteCoverage(entries,rawQuotes);
  return covered.map(quote=>held.has(quote.symbol)?{...quote,currentPrice:quote.previousClose??quote.currentPrice}:quote);
}

export function tradeMarketFlowOnDate(entries:readonly CanonicalLedgerEntry[],date:string){
  return entries.reduce((sum,entry)=>{
    if(entry.date!==date||(entry.kind!=='buy'&&entry.kind!=='sell'))return sum;
    return sum+(entry.kind==='buy'?entry.amount:-entry.amount);
  },0);
}

/**
 * Current/live row. The daily number is a market-value change based on the
 * official previous close, with trade principal removed. It is intentionally
 * not totalPnl - previousTotalPnl anymore.
 */
export function deriveDailyPnlRecord(input:{
  initialCash:number;
  entries:readonly CanonicalLedgerEntry[];
  rawQuotes:readonly RuntimeQuote[];
  currentSnapshot:CanonicalLedgerSnapshot;
  valuationComplete:boolean;
  marketDataVersion:number;
  now?:number;
}):DailyPnlRecord|null{
  if(!input.valuationComplete)return null;
  const now=input.now??Date.now();
  const sourceQuoteAt=sourceTradingTimestamp(input.rawQuotes);
  if(sourceQuoteAt===null)return null;

  const recordDate=taipeiClock(sourceQuoteAt).date;
  const priorQuotes=previousCloseQuoteSet(input.entries,input.rawQuotes,recordDate);
  if(!priorQuotes)return null;

  const previousEntries=input.entries.filter(entry=>entry.date<recordDate);
  const previousSnapshot=calculateCanonicalLedgerSnapshot({
    initialCash:input.initialCash,
    entries:previousEntries,
    quotes:priorQuotes,
  });
  const previousTotalPnl=previousSnapshot.portfolio.totalPnl;
  const previousMarketValue=previousSnapshot.portfolio.totalMarketValue;
  const totalPnl=input.currentSnapshot.portfolio.totalPnl;
  const totalMarketValue=input.currentSnapshot.portfolio.totalMarketValue;
  const tradeMarketFlow=tradeMarketFlowOnDate(input.entries,recordDate);
  const todayPnl=totalMarketValue-previousMarketValue-tradeMarketFlow;
  const accountingAdjustment=totalPnl-previousTotalPnl-todayPnl;
  const clock=taipeiClock(now);
  const final=recordDate<clock.date||
    (recordDate===clock.date&&(clock.hour>15||(clock.hour===15&&clock.minute>=0)));

  return {
    date:recordDate,
    previousTotalPnl,
    todayPnl,
    totalPnl,
    previousMarketValue,
    totalMarketValue,
    tradeMarketFlow,
    accountingAdjustment,
    capturedAt:now,
    sourceQuoteAt,
    marketDataVersion:input.marketDataVersion,
    final,
    basis:'live-previous-close',
  };
}

function officialCloseTimestamp(date:string){
  const [year,month,day]=date.split('-').map(Number);
  // Taiwan market close 13:30 = 05:30 UTC.
  return Date.UTC(year,month-1,day,5,30,0);
}

function sharesBySymbol(entries:readonly CanonicalLedgerEntry[]){
  const shares=new Map<string,number>();
  for(const entry of entries){
    if(entry.kind!=='buy'&&entry.kind!=='sell')continue;
    const current=shares.get(entry.symbol)??0;
    shares.set(entry.symbol,entry.kind==='buy'?current+entry.shares:Math.max(0,current-entry.shares));
  }
  return shares;
}

function latestTradeMeta(entries:readonly CanonicalLedgerEntry[]){
  const meta=new Map<string,TradeEntry>();
  for(const entry of entries){
    if(entry.kind==='buy'||entry.kind==='sell')meta.set(entry.symbol,entry);
  }
  return meta;
}

/**
 * Rebuilds the whole portfolio history from exchange daily closes. This is
 * independent from the immutable Finance Core: historical prices are fed into
 * the same canonical snapshot calculator, one trading day at a time.
 */
export function rebuildDailyPnlRecordsFromOfficialHistory(input:{
  initialCash:number;
  entries:readonly CanonicalLedgerEntry[];
  histories:ReadonlyMap<string,readonly DailyCandle[]>;
  marketDataVersion:number;
  capturedAt?:number;
}):DailyPnlRecord[]{
  const first=firstTradeDate(input.entries);
  if(!first)return [];
  const capturedAt=input.capturedAt??Date.now();

  const candlesByDate=new Map<string,Array<{symbol:string;candle:DailyCandle}>>();
  for(const [symbol,rows] of input.histories){
    for(const candle of rows){
      if(candle.date<first)continue;
      const list=candlesByDate.get(candle.date)??[];
      list.push({symbol,candle});
      candlesByDate.set(candle.date,list);
    }
  }
  const dates=[...candlesByDate.keys()].sort();
  const lastClose=new Map<string,number>();
  const records:DailyPnlRecord[]=[];

  for(const date of dates){
    for(const item of candlesByDate.get(date)??[])lastClose.set(item.symbol,item.candle.close);

    const entriesThrough=input.entries.filter(entry=>entry.date<=date);
    const meta=latestTradeMeta(entriesThrough);
    if(meta.size===0)continue;
    const shares=sharesBySymbol(entriesThrough);
    const quotes:MarketQuoteInput[]=[];
    let complete=true;

    for(const [symbol,trade] of meta){
      const held=(shares.get(symbol)??0)>0;
      const close=lastClose.get(symbol);
      if(held&&(!(close&&Number.isFinite(close)&&close>0))){
        complete=false;
        break;
      }
      // A fully sold symbol still needs an ETF item so its realized PnL remains
      // in Finance Core. Its current price cannot affect market value at 0 shares.
      const price=close&&close>0?close:trade.price;
      quotes.push({
        symbol,
        name:trade.name,
        currentPrice:price,
        previousClose:price,
        liquidationTradeMode:trade.tradeMode,
        dividendFrequency:4,
        brokerProfileId:trade.brokerProfileId,
      });
    }
    if(!complete)continue;

    const snapshot=calculateCanonicalLedgerSnapshot({
      initialCash:input.initialCash,
      entries:entriesThrough,
      quotes,
    });
    const previous=records[records.length-1]??null;
    const previousMarketValue=previous?.totalMarketValue??0;
    const previousTotalPnl=previous?.totalPnl??0;
    const totalMarketValue=snapshot.portfolio.totalMarketValue;
    const totalPnl=snapshot.portfolio.totalPnl;
    const tradeMarketFlow=tradeMarketFlowOnDate(input.entries,date);
    const todayPnl=totalMarketValue-previousMarketValue-tradeMarketFlow;
    const accountingAdjustment=totalPnl-previousTotalPnl-todayPnl;

    records.push({
      date,
      previousTotalPnl,
      todayPnl,
      totalPnl,
      previousMarketValue,
      totalMarketValue,
      tradeMarketFlow,
      accountingAdjustment,
      capturedAt,
      sourceQuoteAt:officialCloseTimestamp(date),
      marketDataVersion:input.marketDataVersion,
      final:true,
      basis:'official-history',
    });
  }
  return records.slice(-MAX_RECORDS);
}

export function normalizeDailyPnlRecords(value:unknown):DailyPnlRecord[]{
  if(!Array.isArray(value))return [];
  const rows:DailyPnlRecord[]=[];
  for(const item of value){
    if(!item||typeof item!=='object')continue;
    const row=item as Partial<DailyPnlRecord>;
    if(typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date))continue;
    const previousMarketValue=typeof row.previousMarketValue==='number'&&Number.isFinite(row.previousMarketValue)?row.previousMarketValue:0;
    const tradeMarketFlow=typeof row.tradeMarketFlow==='number'&&Number.isFinite(row.tradeMarketFlow)?row.tradeMarketFlow:0;
    const accountingAdjustment=typeof row.accountingAdjustment==='number'&&Number.isFinite(row.accountingAdjustment)
      ?row.accountingAdjustment
      :(Number(row.totalPnl)-Number(row.previousTotalPnl)-Number(row.todayPnl));
    const numeric=[
      row.previousTotalPnl,row.todayPnl,row.totalPnl,row.totalMarketValue,row.capturedAt,row.sourceQuoteAt,row.marketDataVersion,
      previousMarketValue,tradeMarketFlow,accountingAdjustment,
    ];
    if(numeric.some(v=>typeof v!=='number'||!Number.isFinite(v)))continue;
    rows.push({
      date:row.date,
      previousTotalPnl:row.previousTotalPnl!,
      todayPnl:row.todayPnl!,
      totalPnl:row.totalPnl!,
      previousMarketValue,
      totalMarketValue:row.totalMarketValue!,
      tradeMarketFlow,
      accountingAdjustment,
      capturedAt:row.capturedAt!,
      sourceQuoteAt:row.sourceQuoteAt!,
      marketDataVersion:row.marketDataVersion!,
      final:row.final===true,
      basis:row.basis==='official-history'?'official-history':'live-previous-close',
    });
  }
  const byDate=new Map(rows.map(row=>[row.date,row]));
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-MAX_RECORDS);
}

export function upsertDailyPnlRecord(records:readonly DailyPnlRecord[],candidate:DailyPnlRecord){
  const current=records.find(row=>row.date===candidate.date);
  // Official historical closes are the strongest daily source and immutable.
  if(current?.final&&current.basis==='official-history')return [...records];
  // A rebuilt official close may replace a final row that was previously
  // frozen from a live/previous-close estimate.
  if(current?.final&&candidate.basis!=='official-history')return [...records];
  const next=records.filter(row=>row.date!==candidate.date);
  next.push(candidate);
  return next.sort((a,b)=>a.date.localeCompare(b.date)).slice(-MAX_RECORDS);
}

export function summarizeDailyPnl(records:readonly DailyPnlRecord[]):DailyPnlStats{
  const ordered=[...records].sort((a,b)=>a.date.localeCompare(b.date));
  const days=ordered.length;
  const gainDays=ordered.filter(row=>row.todayPnl>0).length;
  const lossDays=ordered.filter(row=>row.todayPnl<0).length;
  const flatDays=days-gainDays-lossDays;
  const periodPnl=ordered.reduce((sum,row)=>sum+row.todayPnl,0);
  const best=days?ordered.reduce((a,b)=>b.todayPnl>a.todayPnl?b:a):null;
  const worst=days?ordered.reduce((a,b)=>b.todayPnl<a.todayPnl?b:a):null;
  return {days,gainDays,lossDays,flatDays,periodPnl,averageDailyPnl:days?periodPnl/days:0,best,worst,latest:days?ordered[days-1]!:null};
}
