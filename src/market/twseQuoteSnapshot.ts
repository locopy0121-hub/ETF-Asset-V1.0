import type { RuntimeQuote } from '../finance/financeSeed';
import {
  hasUsableTwseQuote,
  resolveTwseLivePrice,
  resolveTwsePreviousClose,
  resolveTwseQuoteDate,
  resolveTwseQuoteTime,
  type TwseQuoteRow,
} from './twseQuoteParser';

export function buildTwseRuntimeQuote(
  symbol:string,
  row:TwseQuoteRow|undefined,
  old:RuntimeQuote|undefined,
  receivedAt:number,
):RuntimeQuote|null{
  if(!hasUsableTwseQuote(row))return null;
  const resolved=resolveTwseLivePrice(row);
  const currentPrice=resolved.price;
  const previousClose=resolveTwsePreviousClose(row)||currentPrice;
  const sparkline=[...(old?.sparkline??[]),currentPrice].filter(x=>x>0).slice(-30);
  return {
    symbol,
    name:String(row?.n??old?.name??symbol),
    currentPrice,
    previousClose,
    liquidationTradeMode:old?.liquidationTradeMode??'ROUND_LOT',
    dividendFrequency:old?.dividendFrequency??4,
    ...(old?.latestDividendPerShare==null?{}:{latestDividendPerShare:old.latestDividendPerShare}),
    ...(old?.pinned==null?{}:{pinned:old.pinned}),
    sparkline:sparkline.length?sparkline:[currentPrice],
    marketSource:'TWSE_MIS',
    quoteStatus:'LIVE',
    quoteDate:resolveTwseQuoteDate(row)??undefined,
    quoteTime:resolveTwseQuoteTime(row)??undefined,
    receivedAt,
    priceKind:resolved.kind,
  };
}

export function markRuntimeQuoteStale(old:RuntimeQuote|undefined,symbol:string):RuntimeQuote|undefined{
  if(!old)return undefined;
  return {...old,symbol,marketSource:'CACHE',quoteStatus:'STALE'};
}
