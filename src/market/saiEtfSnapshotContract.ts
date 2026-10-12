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
