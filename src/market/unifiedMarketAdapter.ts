import type {RuntimeQuote} from '../finance/financeSeed';
import type {UnifiedMarketRow,UnifiedMarketSnapshot} from '../native/TfAssetNativeBridge';

export type QuoteProvenance='trade'|'official_close';
export function isTrustedMarketRow(value:unknown,now=Date.now()):value is UnifiedMarketRow{
  if(!value||typeof value!=='object')return false;
  const row=value as Partial<UnifiedMarketRow>;
  return typeof row.symbol==='string'&&/^[0-9A-Z]{4,8}$/.test(row.symbol)
    &&typeof row.currentPrice==='number'&&Number.isFinite(row.currentPrice)&&row.currentPrice>0
    &&typeof row.sourceQuoteAt==='number'&&Number.isFinite(row.sourceQuoteAt)
    &&row.sourceQuoteAt>0&&row.sourceQuoteAt<=now+120_000
    &&(row.quality==='trade'||row.quality==='official_close')
    &&(row.source==='TWSE_MIS'||row.source==='TWSE_DAILY'||row.source==='TPEX_DAILY')
    &&typeof row.checkedAt==='number';
}

/** No demo seeds or Ledger prices may enter this verified official quote feed. */
export function marketRowsToRuntimeQuotes(
  snapshot:UnifiedMarketSnapshot,previous:readonly RuntimeQuote[]=[],now=Date.now(),
):RuntimeQuote[]{
  const rows=Array.isArray(snapshot.quotes)?snapshot.quotes:[];
  const prior=new Map(previous.map(row=>[row.symbol,row]));
  return rows.filter(row=>isTrustedMarketRow(row,now)).map(row=>{
    const old=prior.get(row.symbol);
    const prev=typeof row.previousClose==='number'&&Number.isFinite(row.previousClose)&&row.previousClose>0
      ?row.previousClose
      :old?.previousClose&&old.previousClose>0?old.previousClose:row.currentPrice;
    const unchanged=old?.sourceQuoteAt===row.sourceQuoteAt&&old.currentPrice===row.currentPrice;
    const sparkline=unchanged?old.sparkline:
      [...(old?.sparkline??[]),row.currentPrice].filter(price=>price>0).slice(-30);
    return {
      symbol:row.symbol,name:row.name||old?.name||row.symbol,
      currentPrice:row.currentPrice,previousClose:prev,
      sourceQuoteAt:row.sourceQuoteAt,
      quality:row.quality,source:row.source,checkedAt:row.checkedAt,
      marketDataVersion:snapshot.version,
      liquidationTradeMode:old?.liquidationTradeMode??'ROUND_LOT',
      dividendFrequency:old?.dividendFrequency??4,
      ...(old?.latestDividendPerShare==null?{}:{latestDividendPerShare:old.latestDividendPerShare}),
      ...(old?.pinned==null?{}:{pinned:old.pinned}),
      sparkline:sparkline.length?sparkline:[row.currentPrice],
    };
  });
}
