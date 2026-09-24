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
}):SharedSnapshot{
  const portfolio=input.canonical.portfolio;
  const quoteTimes=new Map(input.quoteSourceTimes?.map(row=>[row.symbol,row.sourceQuoteAt??null])??[]);
  return {
    contractVersion:1,
    generatedAt:input.generatedAt==null?new Date().toISOString():new Date(input.generatedAt).toISOString(),
    source:'canonical-finance-core',
    asset:{
      valuationComplete:!input.holdings.some(row=>row.quoteVerified===false),
      totalAssets:portfolio.totalMarketValue,
      marketValue:portfolio.totalMarketValue,
      cash:input.canonical.cashBalance,
      unrealizedPnl:portfolio.totalUnrealizedProfit,
      realizedPnl:portfolio.realizedNetPnL,
      dividendIncome:portfolio.totalDividendsReceived,
      totalReturn:portfolio.totalPnl,
    },
    holdings:input.holdings.map(row=>{
      const verified=row.quoteVerified!==false;
      const change=row.price-row.previousClose;
      const changePercent=row.previousClose>0?change/row.previousClose*100:0;
      return {
        id:row.symbol,
        symbol:row.symbol,
        name:row.name,
        price:verified?row.price:null,
        previousClose:verified?row.previousClose:null,
        change:verified?change:null,
        changePercent:verified?changePercent:null,
        marketStatus:verified?statusFor(row.price,row.previousClose):'unavailable',
        updatedAt:verified&&(quoteTimes.get(row.symbol)??0)>0?new Date(quoteTimes.get(row.symbol)!).toISOString():null,
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
