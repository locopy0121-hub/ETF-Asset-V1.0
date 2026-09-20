import assert from 'node:assert/strict';

import { calculateBuyScenario, calculateCanonicalLedgerSnapshot, freezeTradeEntry } from '../src/finance/canonicalLedger';

const buy=freezeTradeEntry({id:'b',date:'2026-01-01',kind:'buy',symbol:'0050',name:'元大台灣50',tradeMode:'ODD_LOT',shares:100,price:20,actualFee:5});
const sell=freezeTradeEntry({id:'s',date:'2026-02-01',kind:'sell',symbol:'0050',name:'元大台灣50',tradeMode:'ODD_LOT',shares:40,price:25,actualFee:3,actualTax:1});
const snapshot=calculateCanonicalLedgerSnapshot({
  initialCash:0,
  entries:[buy,sell],
  quotes:[{symbol:'0050',name:'元大台灣50',currentPrice:24,liquidationTradeMode:'ODD_LOT',dividendFrequency:4}],
});
const holding=snapshot.holdings[0]!;
const scenario=calculateBuyScenario({holding,currentPrice:24,addPrice:21,addShares:40,tradeMode:'ODD_LOT'});

assert.equal(scenario.addTradeAmount,840);
assert.equal(scenario.addCommission,1);
assert.equal(scenario.addCashOutflow,841);
assert.equal(scenario.newShares,100);
assert.equal(scenario.newTradeCost,2040);
assert.equal(scenario.newInvestmentCost,2044);
assert.equal(scenario.averageTradePrice,20.4);
assert.equal(scenario.averageCostPerShare,20.44);
assert.equal(scenario.currentMarketValue,2400);
assert.equal(scenario.netLiquidationValue,2396);
assert.equal(scenario.priceUnrealizedProfit,360);
assert.equal(scenario.cashUnrealizedProfit,352);
console.log('TF_ASSET_CALCULATOR_V378: PASS');
