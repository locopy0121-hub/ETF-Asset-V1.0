import type {RuntimeQuote} from '../finance/financeSeed';

const VALUATION_QUALITIES=new Set(['trade','backup_realtime','previous_close','official_close']);
const EMPTY_INTRADAY:NonNullable<RuntimeQuote['intraday']>=[];

const sourceTimeValid=(row:RuntimeQuote|undefined)=>
  Boolean(row&&typeof row.sourceQuoteAt==='number'&&Number.isFinite(row.sourceQuoteAt)&&row.sourceQuoteAt>0);

/**
 * Row-level helpers avoid repeated Array.find calls when a consumer already
 * indexed the Market Center snapshot by symbol.
 */
export function marketQuoteSnapshotFromRow(row:RuntimeQuote|undefined):RuntimeQuote|undefined{
  return row&&Number.isFinite(row.currentPrice)&&row.currentPrice>0?row:undefined;
}

export function marketIntradaySeriesFromRow(row:RuntimeQuote|undefined){
  return {
    date:row?.intradayDate??null,
    previousClose:row?.intradayPreviousClose??null,
    // Keep the immutable Market Center array by reference. Copying thousands
    // of 5-second points on every render caused avoidable memory pressure.
    points:row?.intraday??EMPTY_INTRADAY,
  };
}

export type ValuationContext={now?:number;unresolvedSymbols?:readonly string[]};
const DAY=86_400_000;
const taipeiDate=(at:number)=>new Date(at+8*3_600_000).toISOString().slice(0,10);

/** Weekday session guard; an exchange holiday calendar is a separate task. */
export function valuationSessionActive(now:number){
  const local=new Date(now+8*3_600_000);
  const minutes=local.getUTCHours()*60+local.getUTCMinutes();
  return local.getUTCDay()>0&&local.getUTCDay()<6&&minutes>=540&&minutes<810;
}

export function valuationValidUntil(row:RuntimeQuote,now:number){
  const local=new Date(now+8*3_600_000);
  let open=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate(),1);
  if(open<=now)open+=DAY;
  while([0,6].includes(new Date(open+8*3_600_000).getUTCDay()))open+=DAY;
  return Math.min((row.sourceQuoteAt??0)+7*DAY,open);
}

export function marketValuationQuoteFromRow(row:RuntimeQuote|undefined,context:ValuationContext={}):RuntimeQuote|undefined{
  const now=context.now??Date.now();
  if(!Number.isFinite(now)||!row||!Number.isFinite(row.currentPrice)||row.currentPrice<=0||!sourceTimeValid(row))return undefined;
  const at=row.sourceQuoteAt!;
  if(at>now+120_000||now-at>7*DAY)return undefined;
  if(typeof row.quality!=='string'||!VALUATION_QUALITIES.has(row.quality))return undefined;
  if(row.sessionDate&&row.sessionDate!==taipeiDate(at))return undefined;
  if(valuationSessionActive(now)){
    if(context.unresolvedSymbols?.includes(row.symbol))return undefined;
    if(taipeiDate(at)!==taipeiDate(now)||!['trade','backup_realtime'].includes(row.quality))return undefined;
    if(row.quoteStatus==='STALE'||row.quoteStatus==='OFFLINE')return undefined;
  }
  return row;
}

/**
 * Quote-wall view. It only needs the latest normalized quote snapshot and does
 * not depend on whether an intraday series exists.
 */
export function marketQuoteSnapshotFor(rows:readonly RuntimeQuote[],symbol:string):RuntimeQuote|undefined{
  return marketQuoteSnapshotFromRow(rows.find(item=>item.symbol===symbol));
}

/**
 * Chart view. Intraday readiness is deliberately independent from quote and
 * portfolio valuation readiness. After close the last session stays available
 * until the market center publishes the next session.
 */
export function marketIntradaySeriesFor(rows:readonly RuntimeQuote[],symbol:string){
  return marketIntradaySeriesFromRow(rows.find(item=>item.symbol===symbol));
}

/**
 * Portfolio valuation view. A session-valid trade, backup real-time quote, previous
 * close, or official close may value holdings outside the session. Missing 09:00-13:30 intraday
 * points must never invalidate this view.
 */
export function marketValuationQuoteFor(rows:readonly RuntimeQuote[],symbol:string,context:ValuationContext={}):RuntimeQuote|undefined{
  return marketValuationQuoteFromRow(rows.find(item=>item.symbol===symbol),context);
}

export function marketValuationComplete(rows:readonly RuntimeQuote[],symbols:readonly string[],context:ValuationContext={}){
  const bySymbol=new Map(rows.map(row=>[row.symbol,row]));
  return symbols.every(symbol=>Boolean(marketValuationQuoteFromRow(bySymbol.get(symbol),context)));
}
