import type {RuntimeQuote} from '../finance/financeSeed';

/** Only an actual TWSE z trade paired with d/t is eligible for price/valuation display. */
export function isVerifiedRuntimeQuote(value:RuntimeQuote|undefined,now=Date.now()):value is RuntimeQuote{
  if(!value)return false;
  const at=value.sourceQuoteAt;
  return typeof at==='number'&&Number.isFinite(at)&&at>0&&at<=now+120_000
    &&at>=now-31*86_400_000&&Number.isFinite(value.currentPrice)&&value.currentPrice>0;
}

/** 2.1.21's undated seeded/zero rows are discarded; keep ONLY independently dated good trades. */
export function restoreVerifiedQuotes(
  persisted:unknown,clockVersion:unknown,now=Date.now(),
):RuntimeQuote[]{
  if(clockVersion!==2||!Array.isArray(persisted))return [];
  const bySymbol=new Map<string,RuntimeQuote>();
  for(const candidate of persisted){
    if(!candidate||typeof candidate!=='object')continue;
    const quote=candidate as RuntimeQuote;
    if(typeof quote.symbol!=='string'||!isVerifiedRuntimeQuote(quote,now))continue;
    const current=bySymbol.get(quote.symbol);
    if(!current||(quote.sourceQuoteAt??0)>(current.sourceQuoteAt??0))bySymbol.set(quote.symbol,quote);
  }
  return [...bySymbol.values()];
}
