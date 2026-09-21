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
}):SharedSnapshot{
  const portfolio=input.canonical.portfolio;
  const updatedAt=input.generatedAt==null?null:new Date(input.generatedAt).toISOString();
  return {
    contractVersion:1,
    generatedAt:updatedAt??new Date().toISOString(),
    source:'canonical-finance-core',
    asset:{
      // TF Asset display contract: 「總資產」means current holding market value.
      // Cash remains a separate field. Canonical totalAssets is intentionally
      // not substituted here, so App / Widget / Monitor show the same headline value.
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
        price:row.price,
        previousClose:row.previousClose,
        change,
        changePercent,
        marketStatus:statusFor(row.price,row.previousClose),
        updatedAt,
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
