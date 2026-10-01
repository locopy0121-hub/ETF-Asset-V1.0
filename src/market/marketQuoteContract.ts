import type {RuntimeQuote} from '../finance/financeSeed';

export type MarketQuoteSource=
  |'TWSE_MIS'
  |'FUGLE'
  |'SHIOAJI'
  |'YAHOO'
  |'TWSE_DAILY'
  |'TPEX_DAILY';

export type MarketQuote=Readonly<{
  symbol:string;
  price:number;
  change:number|null;
  changePercent:number|null;
  volume:number|null;
  source:MarketQuoteSource;
  isRealtime:boolean;
  sourceTimestamp:number|null;
  fetchedAt:number|null;
  stale:boolean;
}>;

/**
 * UI/AI adapter only. It never performs network I/O.
 * All screens consume the same MarketRuntime / SQLite quote and therefore cannot
 * independently pick different providers.
 */
export function runtimeQuoteToMarketQuote(quote:RuntimeQuote,now=Date.now()):MarketQuote{
  const previousClose=quote.previousClose>0?quote.previousClose:null;
  const change=previousClose===null?null:quote.currentPrice-previousClose;
  const sourceTimestamp=typeof quote.sourceQuoteAt==='number'?quote.sourceQuoteAt:null;
  const isRealtime=(quote.quality==='trade'||quote.quality==='backup_realtime')
    &&sourceTimestamp!==null&&now-sourceTimestamp<=5*60_000;
  return {
    symbol:quote.symbol,
    price:quote.currentPrice,
    change,
    changePercent:change===null||previousClose===null?null:change/previousClose*100,
    volume:null,
    source:quote.source??'TWSE_MIS',
    isRealtime,
    sourceTimestamp,
    fetchedAt:typeof quote.checkedAt==='number'?quote.checkedAt:null,
    stale:sourceTimestamp===null||now-sourceTimestamp>5*60_000,
  };
}
