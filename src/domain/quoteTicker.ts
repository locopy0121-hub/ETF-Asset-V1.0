import type {HoldingQuote,WallTickerConfig} from './uiModels';

/** No extra quote fetch: format only the verified in-memory Shared Snapshot. */
export function quoteTickerCell(
  row:Pick<HoldingQuote,'symbol'|'name'|'price'|'previousClose'|'previousCloseKnown'|'quoteVerified'>,
  opts:Pick<WallTickerConfig,'showPrice'|'showChange'>,
):string{
  if(row.quoteVerified===false||!Number.isFinite(row.price)||row.price<=0)return row.symbol+'  行情待取得';
  const change=row.previousCloseKnown!==false&&Number.isFinite(row.previousClose)&&row.previousClose>0
    ?((row.price-row.previousClose)/row.previousClose)*100:null;
  const parts=[row.symbol,row.name];
  if(opts.showPrice)parts.push(row.price.toFixed(2));
  if(opts.showChange&&change!=null)parts.push((change>=0?'+':'')+change.toFixed(2)+'%');
  return parts.filter(Boolean).join('  ');
}
