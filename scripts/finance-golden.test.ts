import assert from 'node:assert/strict';

import {
  calculateETFSummary,
  calculateNetDividend,
  calculatePurchaseCost,
  calculatePortfolioSummary,
  calculateActualPurchaseCost,
} from '../src/utils/etfCalculators';
import type { ETFItem, Transaction } from '../src/types/etf';

const oddLot: Transaction = {
  id: 'odd-buy',
  etfCode: '00878',
  type: 'BUY',
  tradeMode: 'ODD_LOT',
  shares: 100,
  price: 22.0608,
  date: '2026-01-01',
};
const estimatedBuy = calculatePurchaseCost(oddLot);
assert.equal(estimatedBuy.tradeAmount, 2206);
assert.equal(estimatedBuy.commission, 2);
assert.equal(estimatedBuy.settlementAmount, 2208);

const actualBuy: Transaction = { ...oddLot, actualFee: 9 };
const actualPurchase = calculateActualPurchaseCost(actualBuy);
assert.equal(actualPurchase.tradeAmount, 2206);
assert.equal(actualPurchase.commission, 9);
assert.equal(actualPurchase.settlementAmount, 2215);

const buy: Transaction = {
  id: '01-buy',
  etfCode: '0050',
  type: 'BUY',
  tradeMode: 'ODD_LOT',
  shares: 100,
  price: 20,
  date: '2026-01-01',
  actualFee: 5,
  calculatedFee: 1,
};
const sell: Transaction = {
  id: '02-sell',
  etfCode: '0050',
  type: 'SELL',
  tradeMode: 'ODD_LOT',
  shares: 40,
  price: 25,
  date: '2026-02-01',
  actualFee: 3,
  actualTax: 1,
  calculatedFee: 1,
  calculatedTax: 1,
};
const holding: ETFItem = {
  etfCode: '0050',
  name: '元大台灣50',
  currentPrice: 24,
  liquidationTradeMode: 'ODD_LOT',
  dividendFrequency: 4,
  transactions: [buy, sell],
  dividendRecords: [],
};
const summary = calculateETFSummary(holding);
assert.equal(summary.totalShares, 60);
assert.equal(summary.totalInvestmentCost, 1203);
assert.equal(summary.realizedNetPnL, 194);
assert.equal(summary.currentMarketValue, 1440);
assert.equal(summary.estimatedSellCommission, 1);
assert.equal(summary.estimatedSellTax, 1);
assert.equal(summary.netLiquidationValue, 1438);
assert.equal(summary.unrealizedProfit, 235);
assert.equal(summary.comprehensivePnL, 429);

assert.equal(calculateNetDividend({
  id: 'd1',
  etfCode: '0050',
  paymentDate: '2026-03-01',
  perShareAmount: 1.5,
  sharesHeld: 1000,
}), 1490);

const portfolio = calculatePortfolioSummary([holding]);
assert.equal(portfolio.totalMarketValue, summary.currentMarketValue);
assert.equal(portfolio.totalNetLiquidationValue, summary.netLiquidationValue);
assert.equal(portfolio.totalInvestmentCost, summary.totalInvestmentCost);
assert.equal(portfolio.realizedNetPnL, summary.realizedNetPnL);
assert.equal(portfolio.totalPnl, summary.comprehensivePnL);

console.log('TF_ASSET_FINANCE_GOLDEN: PASS');
