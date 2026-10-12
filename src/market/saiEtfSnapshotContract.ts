import type {RuntimeQuote} from '../finance/financeSeed';
import type {UnifiedMarketSnapshot} from '../native/TfAssetNativeBridge';

/**
 * Presentation-only acknowledgment of a genuinely newer SaiETF market quote.
 * NEVER selects, merges, or overwrites prices: that authority lives exclusively
 * in SaiETF 2.0.2's frozen MarketDataCenter / MarketArbitrator.
 *
 * Equality of price does not imply equality of ticks. Same-millisecond Fugle
 * trades can advance their source sequence without advancing wall-clock time.
 */
export function saiEtfSnapshotHasAdvancedQuote(
  snapshot:UnifiedMarketSnapshot,
  before:readonly RuntimeQuote[],
):boolean{
  const previous=new Map(before.map(row=>[row.symbol,row] as const));
  return (snapshot.quotes??[]).some(row=>{
    const sourceAt=row.sourceQuoteAt;
    if(!Number.isFinite(sourceAt)||sourceAt<=0||!Number.isFinite(row.currentPrice)||row.currentPrice<=0)return false;
    if(row.quality!=='trade'&&row.quality!=='backup_realtime')return false;
    if(row.quoteStatus==='STALE'||row.quoteStatus==='OFFLINE')return false;
    const old=previous.get(row.symbol);
    if(!old)return true;
    if(sourceAt>Number(old.sourceQuoteAt??0))return true;
    return sourceAt===old.sourceQuoteAt && row.source===old.source
      && typeof row.sequence==='number' && typeof old.sequence==='number'
      && row.sequence>old.sequence;
  });
}

/**
 * A newer React Native event may carry an older market quote due to an
 * asynchronous bridge/read race. SaiETF itself never replaces an accepted
 * hot-store trade with an older exchange clock or reversed Fugle sequence.
 *
 * Reject the entire inconsistent transport envelope before UI publication.
 * This is NOT a second price-selection mechanism: only SaiETF's native core
 * selects prices, and a subsequent complete native snapshot can retry.
 */
export function saiEtfTransportSnapshotRegressed(
  snapshot:UnifiedMarketSnapshot,
  accepted:readonly RuntimeQuote[],
):boolean{
  const bySymbol=new Map(accepted.map(row=>[row.symbol,row] as const));
  return (snapshot.quotes??[]).some(incoming=>{
    const current=bySymbol.get(incoming.symbol);
    if(!current)return false;
    const previousClock=Number(current.sourceQuoteAt);
    const incomingClock=Number(incoming.sourceQuoteAt);
    if(!Number.isFinite(previousClock)||previousClock<=0)return false;
    if(!Number.isFinite(incomingClock)||incomingClock<=0)return false;
    if(incomingClock<previousClock)return true;
    // Sequence numbers only have ordering meaning within a single provider.
    return incomingClock===previousClock && incoming.source===current.source
      && typeof current.sequence==='number' && typeof incoming.sequence==='number'
      && incoming.sequence<current.sequence;
  });
}
