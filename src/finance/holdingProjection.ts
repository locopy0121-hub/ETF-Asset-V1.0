import type {HoldingQuote} from '../domain/uiModels';
import type {CanonicalLedgerSnapshot} from './canonicalLedger';
import type {RuntimeQuote} from './financeSeed';
import {resolveEtfDisplayName} from '../market/etfDisplayName';
import {marketIntradaySeriesFromRow,marketQuoteSnapshotFromRow,marketValuationQuoteFromRow,valuationSessionActive,valuationValidUntil,marketStreamHealthy} from '../market/marketCenterViews';
const holdingQuoteQuality=(quality:RuntimeQuote['quality']|undefined):NonNullable<HoldingQuote['quoteQuality']>=>{
  switch(quality){
    case 'trade':
    case 'backup_realtime':
    case 'bid_ask':
    case 'previous_close':
    case 'official_close':
      return quality;
    default:
      return 'unavailable';
  }
};

export function projectHoldingQuotes(input:{snapshot:CanonicalLedgerSnapshot;quotes:readonly RuntimeQuote[];now:number;version:number;catalogNames?:ReadonlyMap<string,string>;ledgerNames?:ReadonlyMap<string,string>;unresolvedSymbols?:readonly string[]}):HoldingQuote[]{
  const {snapshot}=input;
  const quoteBySymbol=new Map(input.quotes.map(row=>[row.symbol,row] as const));
  const catalogNameBySymbol=input.catalogNames??new Map<string,string>();
  const ledgerNameBySymbol=input.ledgerNames??new Map<string,string>();
  const valuationNow=input.now;
  const valuationContext={now:input.now,...(input.unresolvedSymbols?{unresolvedSymbols:input.unresolvedSymbols}:{})};
  const market={marketDataVersion:input.version};
  return snapshot.holdings.map<HoldingQuote>(summary=>{
    const rawQuote=quoteBySymbol.get(summary.etfCode);
    const quote=marketQuoteSnapshotFromRow(rawQuote);
    const valuationQuote=marketValuationQuoteFromRow(rawQuote,valuationContext);
    const intraday=marketIntradaySeriesFromRow(rawQuote);
    const verified=Boolean(valuationQuote);
    const previousClose=valuationQuote?.previousClose&&valuationQuote.previousClose>0?
      valuationQuote.previousClose:summary.currentPrice;
    return {
      symbol:summary.etfCode,
      name:resolveEtfDisplayName(
        summary.etfCode,
        catalogNameBySymbol.get(summary.etfCode),
        ledgerNameBySymbol.get(summary.etfCode),
        quote?.name,
      ),
      quoteVerified:verified,
      valuationStatus:verified?(valuationSessionActive(valuationNow)&&valuationQuote?.sessionDate===new Date(valuationNow+8*3_600_000).toISOString().slice(0,10)&&!['STALE','OFFLINE'].includes(valuationQuote?.quoteStatus??'')?'current_session':'reference'):'unavailable',
      valuationValidUntil:valuationQuote?valuationValidUntil(valuationQuote,valuationNow):null,
      quoteStatus:!marketStreamHealthy(valuationQuote,valuationNow)&&valuationQuote?.quoteStatus==='LIVE'&&valuationNow-(valuationQuote.sourceQuoteAt??0)>30_000
        ?'DELAYED':valuationQuote?.quoteStatus,
      quoteQuality:holdingQuoteQuality(valuationQuote?.quality),
      quoteSourceAt:valuationQuote?.sourceQuoteAt??null,
      volume:typeof valuationQuote?.volume==='number'&&Number.isFinite(valuationQuote.volume)&&valuationQuote.volume>=0?valuationQuote.volume:null,
      streamingHealthy:marketStreamHealthy(valuationQuote,valuationNow),
      ...(typeof valuationQuote?.streamingCheckedAt==='number'?{streamingCheckedAt:valuationQuote.streamingCheckedAt}:{}),
      marketDataVersion:market.marketDataVersion,
      previousCloseKnown:verified?valuationQuote?.previousCloseKnown!==false:false,
      shares:summary.totalShares,
      price:summary.currentPrice,
      previousClose,
      avgCost:summary.averageCostPerShare,
      tradeAvg:summary.averageTradePrice,
      costAvg:summary.averageCostPerShare,
      marketValue:summary.currentMarketValue,
      pnl:summary.unrealizedProfit,
      pricePnl:summary.priceUnrealizedProfit,
      roi:summary.unrealizedROI,
      weight:summary.portfolioWeight,
      cumulativeDividend:summary.totalDividendsReceived,
      realizedPnl:summary.realizedNetPnL,
      comprehensivePnl:summary.comprehensivePnL,
      pinned:quote?.pinned??false,
      sparkline:quote?.sparkline??[summary.currentPrice],
      intraday:intraday.points,
      intradayDate:intraday.date,
      intradayPreviousClose:intraday.previousClose,
    };
  }).filter(x=>x.shares>0);
}
