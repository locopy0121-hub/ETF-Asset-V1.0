import assert from 'node:assert/strict';

import { calculateCanonicalLedgerSnapshot, freezeTradeEntry, validateLedgerSequence } from '../src/finance/canonicalLedger';

const buy = freezeTradeEntry({
  id: 'b1',
  date: '2026-01-01',
  kind: 'buy',
  symbol: '0050',
  name: '元大台灣50',
  tradeMode: 'ODD_LOT',
  shares: 100,
  price: 20,
  actualFee: 5,
});

assert.equal(buy.amount, 2000);
assert.equal(buy.actualFee, 5);
assert.equal(buy.actualTax, 0);

const sell = freezeTradeEntry({
  id: 's1',
  date: '2026-02-01',
  kind: 'sell',
  symbol: '0050',
  name: '元大台灣50',
  tradeMode: 'ODD_LOT',
  shares: 40,
  price: 25,
  actualFee: 3,
  actualTax: 1,
});

assert.equal(sell.amount, 1000);
assert.equal(sell.actualFee, 3);
assert.equal(sell.actualTax, 1);

const snapshot = calculateCanonicalLedgerSnapshot({
  initialCash: 100_000,
  entries: [
    buy,
    sell,
    {
      id: 'd1',
      date: '2026-03-01',
      kind: 'dividend',
      symbol: '0050',
      name: '元大台灣50',
      perShareAmount: 1.5,
      sharesHeld: 1000,
    },
    {
      id: 'o1',
      date: '2026-03-02',
      kind: 'other',
      label: '現金調整',
      amount: 50,
    },
  ],
  quotes: [{
    symbol: '0050',
    name: '元大台灣50',
    currentPrice: 24,
    liquidationTradeMode: 'ODD_LOT',
    dividendFrequency: 4,
  }],
});

assert.equal(snapshot.cashBalance, 100_000 - 2005 + 996 + 1490 + 50);
assert.equal(snapshot.portfolio.totalMarketValue, 1440);
assert.equal(snapshot.totalAssets, snapshot.cashBalance + 1440);

const holding = snapshot.holdings[0]!;
assert.equal(holding.totalShares, 60);
assert.equal(holding.totalTradeCost, 1200);
assert.equal(holding.averageTradePrice, 20);
assert.equal(holding.totalInvestmentCost, 1203);
assert.equal(holding.averageCostPerShare, 20.05);
assert.equal(holding.priceUnrealizedProfit, 240);
assert.equal(holding.unrealizedProfit, 235);
assert.equal(holding.cashUnrealizedProfit, 235);
assert.equal(holding.realizedNetPnL, 194);
assert.equal(holding.totalDividendsReceived, 1490);
assert.equal(holding.comprehensivePnL, 1919);

assert.equal(snapshot.portfolio.totalTradeCost, 1200);
assert.equal(snapshot.portfolio.totalPriceUnrealizedProfit, 240);
assert.equal(snapshot.portfolio.totalPnl, snapshot.portfolio.comprehensivePnL);

// Freeze contract: changing a broker profile later must not change historical fee/tax.
const frozenBuy = freezeTradeEntry({
  id: 'freeze',
  date: '2026-04-01',
  kind: 'buy',
  symbol: '00878',
  name: '國泰永續高股息',
  tradeMode: 'ODD_LOT',
  shares: 100,
  price: 22.0608,
});
assert.equal(frozenBuy.amount, 2206);
assert.equal(frozenBuy.calculatedFee, 2);
assert.equal(frozenBuy.actualFee, 2);

assert.equal(validateLedgerSequence([buy,sell]).length,0);
assert.equal(validateLedgerSequence([sell]).length,1);
assert.equal(validateLedgerSequence([sell,buy]).length,1);

console.log('TF_ASSET_V378_LEDGER: PASS');
