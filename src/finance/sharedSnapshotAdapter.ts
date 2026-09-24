import type { SharedSnapshot, MarketStatus } from '../domain/snapshot';
import type { HoldingQuote } from '../domain/uiModels';
import type { CanonicalLedgerSnapshot } from './canonicalLedger';

const statusFor=(price:number,previousClose:number):MarketStatus=>{
  if(!(price>0)||!(previousClose>0))return 'unavailable';
  if(price>previousClose)return 'up';
  if(price<previousClose)return 'down';
  return 'flat';
};

export function buildSharedSnapshot(input:{
  canonical:CanonicalLedgerSnapshot;
  holdings:readonly HoldingQuote[];
  generatedAt:number|null;
  /** Display-only exchange timestamps per security; independent of portfolio arithmetic. */
  quoteSourceTimes?:readonly {symbol:string;sourceQuoteAt?:number|null}[];
  marketDataVersion?:number;
  valuationComplete?:boolean;
}):SharedSnapshot{
  const portfolio=input.canonical.portfolio;
  const quoteTimes=new Map(input.quoteSourceTimes?.map(row=>[row.symbol,row.sourceQuoteAt??null])??[]);
  return {
    contractVersion:1,
    ...(input.marketDataVersion===undefined?{}:{marketDataVersion:input.marketDataVersion}),
    ...(input.valuationComplete===undefined?{}:{valuationComplete:input.valuationComplete}),
    generatedAt:input.generatedAt==null?new Date().toISOString():new Date(input.generatedAt).toISOString(),
    source:'canonical-finance-core',
    asset:{
      totalAssets:portfolio.totalMarketValue,
      marketValue:portfolio.totalMarketValue,
      cash:input.canonical.cashBalance,
      unrealizedPnl:portfolio.totalUnrealizedProfit,
      realizedPnl:portfolio.realizedNetPnL,
      dividendIncome:portfolio.totalDividendsReceived,
      totalReturn:portfolio.totalPnl,
    },
    holdings:input.holdings.map(row=>{
      const change=row.price-row.previousClose;
      const changePercent=row.previousClose>0?change/row.previousClose*100:0;
      return {
        id:row.symbol,
        symbol:row.symbol,
        name:row.name,
        price:row.quoteVerified===false?null:row.price,
        previousClose:row.quoteVerified===false?null:row.previousClose,
        change:row.quoteVerified===false?null:change,
        changePercent:row.quoteVerified===false?null:changePercent,
        marketStatus:row.quoteVerified===false?'unavailable':statusFor(row.price,row.previousClose),
        marketQuality:row.quoteQuality??(row.quoteVerified===false?'unavailable':'trade'),
        updatedAt:row.quoteVerified===false?null:(quoteTimes.get(row.symbol)??0)>0?new Date(quoteTimes.get(row.symbol)!).toISOString():null,
        shares:row.shares,
        avgCost:row.avgCost,
        marketValue:row.marketValue,
        pnl:row.pnl,
        roi:row.roi,
        comprehensivePnl:row.comprehensivePnl,
      };
    }),
  };
}
