import type {CanonicalLedgerEntry,CanonicalLedgerSnapshot,MarketQuoteInput} from './canonicalLedger';
import {calculateCanonicalLedgerSnapshot} from './canonicalLedger';
import type {RuntimeQuote} from './financeSeed';
import {ensureLedgerQuoteCoverage} from './runtimeQuoteCoverage';

export type DailyPnlRecord=Readonly<{
  date:string;
  previousTotalPnl:number;
  todayPnl:number;
  totalPnl:number;
  totalMarketValue:number;
  capturedAt:number;
  sourceQuoteAt:number;
  marketDataVersion:number;
  final:boolean;
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
const MAX_RECORDS=400;

export function taipeiClock(timestamp:number){
  const date=new Date(timestamp+TAIPEI_OFFSET_MS);
  return {date:date.toISOString().slice(0,10),hour:date.getUTCHours(),minute:date.getUTCMinutes()};
}

function sourceTradingTimestamp(quotes:readonly RuntimeQuote[]){
  const times=quotes.map(quote=>quote.sourceQuoteAt)
    .filter((value):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0);
  return times.length?Math.max(...times):null;
}

function heldSymbolsBefore(entries:readonly CanonicalLedgerEntry[],dateExclusive:string){
  const shares=new Map<string,number>();
  const trades=entries.filter((entry):entry is Extract<CanonicalLedgerEntry,{kind:'buy'|'sell'}> =>
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
  const totalPnl=input.currentSnapshot.portfolio.totalPnl;
  const clock=taipeiClock(now);
  const final=recordDate<clock.date||
    (recordDate===clock.date&&(clock.hour>15||(clock.hour===15&&clock.minute>=0)));

  return {
    date:recordDate,
    previousTotalPnl,
    todayPnl:totalPnl-previousTotalPnl,
    totalPnl,
    totalMarketValue:input.currentSnapshot.portfolio.totalMarketValue,
    capturedAt:now,
    sourceQuoteAt,
    marketDataVersion:input.marketDataVersion,
    final,
  };
}

export function normalizeDailyPnlRecords(value:unknown):DailyPnlRecord[]{
  if(!Array.isArray(value))return [];
  const rows:DailyPnlRecord[]=[];
  for(const item of value){
    if(!item||typeof item!=='object')continue;
    const row=item as Partial<DailyPnlRecord>;
    if(typeof row.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date))continue;
    const numeric=[row.previousTotalPnl,row.todayPnl,row.totalPnl,row.totalMarketValue,row.capturedAt,row.sourceQuoteAt,row.marketDataVersion];
    if(numeric.some(v=>typeof v!=='number'||!Number.isFinite(v)))continue;
    rows.push({
      date:row.date,
      previousTotalPnl:row.previousTotalPnl!,
      todayPnl:row.todayPnl!,
      totalPnl:row.totalPnl!,
      totalMarketValue:row.totalMarketValue!,
      capturedAt:row.capturedAt!,
      sourceQuoteAt:row.sourceQuoteAt!,
      marketDataVersion:row.marketDataVersion!,
      final:row.final===true,
    });
  }
  const byDate=new Map(rows.map(row=>[row.date,row]));
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-MAX_RECORDS);
}

export function upsertDailyPnlRecord(records:readonly DailyPnlRecord[],candidate:DailyPnlRecord){
  const current=records.find(row=>row.date===candidate.date);
  if(current?.final)return [...records];
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
