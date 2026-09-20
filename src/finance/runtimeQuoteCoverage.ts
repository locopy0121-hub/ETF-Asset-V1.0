import type { CanonicalLedgerEntry, MarketQuoteInput } from './canonicalLedger';
import type { RuntimeQuote } from './financeSeed';

function latestTradeBySymbol(entries:readonly CanonicalLedgerEntry[]){
  const map=new Map<string,Extract<CanonicalLedgerEntry,{kind:'buy'|'sell'}>>();
  for(const entry of entries){
    if(entry.kind!=='buy'&&entry.kind!=='sell')continue;
    const current=map.get(entry.symbol);
    if(!current||entry.date>current.date||(entry.date===current.date&&entry.id>current.id))map.set(entry.symbol,entry);
  }
  return map;
}

export function ensureLedgerQuoteCoverage(
  entries:readonly CanonicalLedgerEntry[],
  marketQuotes:readonly RuntimeQuote[],
):MarketQuoteInput[]{
  const bySymbol=new Map<string,MarketQuoteInput>(marketQuotes.map(quote=>[quote.symbol,quote]));
  const latest=latestTradeBySymbol(entries);
  for(const [symbol,trade] of latest){
    if(bySymbol.has(symbol))continue;
    const price=Number.isFinite(trade.price)&&trade.price>0?trade.price:0;
    bySymbol.set(symbol,{
      symbol,
      name:trade.name||symbol,
      currentPrice:price,
      previousClose:price,
      liquidationTradeMode:trade.tradeMode,
      dividendFrequency:4,
      brokerProfileId:trade.brokerProfileId,
    });
  }
  return [...bySymbol.values()];
}
