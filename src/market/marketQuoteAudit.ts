import type { RuntimeQuote } from '../finance/financeSeed';

/** UI-only provenance audit. No source receipt time can masquerade as a trade tick. */
export type MarketAuditStatus='verified_trade'|'verified_official_close'|'previous_verified'|'unavailable';
export type MarketAuditRow=Readonly<{
  symbol:string;status:MarketAuditStatus;price:number|null;
  source:string|null;quality:'trade'|'official_close'|null;
  sourceQuoteAt:number|null;checkedAt:number|null;marketDataVersion:number|null;
}>;
export const MARKET_AUDIT_LABEL:Readonly<Record<MarketAuditStatus,string>>={
  verified_trade:'已核實成交',
  verified_official_close:'官方收盤參考',
  previous_verified:'本次待取得／保留上次官方資料',
  unavailable:'行情待取得／估值待核對',
};

function trusted(row:RuntimeQuote|undefined,now:number):row is RuntimeQuote{
  return !!row && Number.isFinite(row.currentPrice)&&row.currentPrice>0
    &&typeof row.sourceQuoteAt==='number'&&Number.isFinite(row.sourceQuoteAt)
    &&row.sourceQuoteAt>0&&row.sourceQuoteAt<=now+120_000
    &&(row.quality==='trade'||row.quality==='official_close')
    &&(row.source==='TWSE_MIS'||row.source==='TWSE_DAILY'||row.source==='TPEX_DAILY');
}

/** Read-only diagnostic over the single market snapshot; never generates or fetches a price. */
export function auditMarketSymbols(
  symbols:readonly string[],quotes:readonly RuntimeQuote[],missingSymbols:readonly string[],now=Date.now(),
):MarketAuditRow[]{
  const requested=[...new Set(symbols.map(s=>s.trim().toUpperCase()).filter(s=>/^[0-9A-Z]{4,8}$/.test(s)))];
  const missing=new Set(missingSymbols.map(s=>s.trim().toUpperCase().match(/^[0-9A-Z]{4,8}/)?.[0]??'').filter(Boolean));
  const bySymbol=new Map<string,RuntimeQuote>();
  for(const quote of quotes){
    if(!trusted(quote,now))continue;
    const previous=bySymbol.get(quote.symbol);
    if(!previous||(quote.sourceQuoteAt??0)>(previous.sourceQuoteAt??0))bySymbol.set(quote.symbol,quote);
  }
  return requested.map(symbol=>{
    const row=bySymbol.get(symbol);
    const status:MarketAuditStatus=!row?'unavailable':missing.has(symbol)?'previous_verified'
      :row.quality==='official_close'?'verified_official_close':'verified_trade';
    return {
      symbol,status,price:row?.currentPrice??null,source:row?.source??null,
      quality:row?.quality??null,sourceQuoteAt:row?.sourceQuoteAt??null,
      checkedAt:row?.checkedAt??null,marketDataVersion:row?.marketDataVersion??null,
    };
  });
}
