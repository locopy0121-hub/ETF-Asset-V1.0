import type {RuntimeQuote} from '../finance/financeSeed';

const VALUATION_QUALITIES=new Set(['trade','backup_realtime','bid_ask','previous_close','official_close']);
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

export function marketValuationQuoteFromRow(row:RuntimeQuote|undefined):RuntimeQuote|undefined{
  if(!row||!Number.isFinite(row.currentPrice)||row.currentPrice<=0||!sourceTimeValid(row))return undefined;
  return typeof row.quality==='string'&&VALUATION_QUALITIES.has(row.quality)?row:undefined;
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
 * Portfolio valuation view. A verified trade, backup real-time quote, bid/ask indicative quote, previous
 * close, or official close may value holdings. Missing 09:00-13:30 intraday
 * points must never invalidate this view.
 */
export function marketValuationQuoteFor(rows:readonly RuntimeQuote[],symbol:string):RuntimeQuote|undefined{
  return marketValuationQuoteFromRow(rows.find(item=>item.symbol===symbol));
}

export function marketValuationComplete(rows:readonly RuntimeQuote[],symbols:readonly string[]){
  const bySymbol=new Map(rows.map(row=>[row.symbol,row]));
  return symbols.every(symbol=>Boolean(marketValuationQuoteFromRow(bySymbol.get(symbol))));
}
