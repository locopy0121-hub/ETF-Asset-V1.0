import type {RuntimeQuote} from '../finance/financeSeed';

const VALUATION_QUALITIES=new Set(['trade','backup_realtime','previous_close','official_close']);

const sourceTimeValid=(row:RuntimeQuote|undefined)=>
  Boolean(row&&typeof row.sourceQuoteAt==='number'&&Number.isFinite(row.sourceQuoteAt)&&row.sourceQuoteAt>0);

/**
 * Quote-wall view. It only needs the latest normalized quote snapshot and does
 * not depend on whether an intraday series exists.
 */
export function marketQuoteSnapshotFor(rows:readonly RuntimeQuote[],symbol:string):RuntimeQuote|undefined{
  const row=rows.find(item=>item.symbol===symbol);
  return row&&Number.isFinite(row.currentPrice)&&row.currentPrice>0?row:undefined;
}

/**
 * Chart view. Intraday readiness is deliberately independent from quote and
 * portfolio valuation readiness. After close the last session stays available
 * until the market center publishes the next session.
 */
export function marketIntradaySeriesFor(rows:readonly RuntimeQuote[],symbol:string){
  const row=rows.find(item=>item.symbol===symbol);
  return {
    date:row?.intradayDate??null,
    previousClose:row?.intradayPreviousClose??null,
    points:[...(row?.intraday??[])],
  };
}

/**
 * Portfolio valuation view. A verified trade, backup real-time quote, previous
 * close, or official close may value holdings. Missing 09:00-13:30 intraday
 * points must never invalidate this view.
 */
export function marketValuationQuoteFor(rows:readonly RuntimeQuote[],symbol:string):RuntimeQuote|undefined{
  const row=rows.find(item=>item.symbol===symbol);
  if(!row||!Number.isFinite(row.currentPrice)||row.currentPrice<=0||!sourceTimeValid(row))return undefined;
  return typeof row.quality==='string'&&VALUATION_QUALITIES.has(row.quality)?row:undefined;
}

export function marketValuationComplete(rows:readonly RuntimeQuote[],symbols:readonly string[]){
  return symbols.every(symbol=>Boolean(marketValuationQuoteFor(rows,symbol)));
}
