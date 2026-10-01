import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {calculateCanonicalLedgerSnapshot,freezeTradeEntry,type CanonicalLedgerEntry} from '../src/finance/canonicalLedger';
import {buildPurchasePnlStatistics} from '../src/finance/purchasePnlStats';

const entries:CanonicalLedgerEntry[]=[
  freezeTradeEntry({id:'b1',date:'2026-09-01',kind:'buy',symbol:'0050',name:'元大台灣50',tradeMode:'ROUND_LOT',shares:100,price:100,actualFee:0}),
  freezeTradeEntry({id:'b2',date:'2026-09-10',kind:'buy',symbol:'0050',name:'元大台灣50',tradeMode:'ROUND_LOT',shares:100,price:120,actualFee:0}),
  freezeTradeEntry({id:'s1',date:'2026-09-20',kind:'sell',symbol:'0050',name:'元大台灣50',tradeMode:'ROUND_LOT',shares:100,price:130,actualFee:0,actualTax:0}),
  {id:'d1',date:'2026-09-25',kind:'dividend',symbol:'0050',name:'元大台灣50',perShareAmount:5,sharesHeld:100},
];

const snapshot=calculateCanonicalLedgerSnapshot({
  initialCash:0,
  entries,
  quotes:[{symbol:'0050',name:'元大台灣50',currentPrice:140,previousClose:138,liquidationTradeMode:'ROUND_LOT',dividendFrequency:4,brokerProfileId:'default'}],
});

const stats=buildPurchasePnlStatistics({entries,holdings:snapshot.holdings,asOfDate:'2026-10-02'});
assert.equal(stats.totalMarketValue,snapshot.portfolio.totalMarketValue);
assert.equal(stats.totalHoldingCost,snapshot.portfolio.totalTradeCost);
assert.equal(stats.holdingPnl,snapshot.portfolio.totalPriceUnrealizedProfit);
assert.notEqual(stats.holdingPnl,snapshot.portfolio.totalPnl,'含息總報酬不得冒充持股總損益');
assert.equal(Math.round(stats.lots.reduce((sum,row)=>sum+row.remainingShares,0)),snapshot.holdings[0]?.totalShares);
assert.equal(Math.round(stats.lots.reduce((sum,row)=>sum+row.remainingTradeCost,0)),Math.round(snapshot.holdings[0]?.totalTradeCost??0));
assert.ok(stats.lots.filter(row=>row.status==='open').every(row=>Math.abs(row.remainingShares-50)<1e-6),'移動平均賣出應同比例分攤剩餘買進紀錄');

const home=readFileSync('src/screens/HomeScreen.tsx','utf8');
assert.ok(home.includes('totalPnl={portfolio.totalPriceUnrealizedProfit}'));
assert.ok(!home.includes('totalPnl={portfolio.totalUnrealizedProfit}'));
assert.ok(home.includes("label:'投資總報酬（含息）'"));

const overview=readFileSync('src/components/dashboard/DashboardAssetOverview.tsx','utf8');
assert.ok(overview.includes('持股總損益'));
assert.ok(overview.includes('查看持股損益統計'));

const modal=readFileSync('src/components/dashboard/PurchasePnlStatsModal.tsx','utf8');
for(const token of ['ETF 彙總','購買紀錄','每日走勢','股息、已實現損益與預估清算費用不併入']){
  assert.ok(modal.includes(token),token);
}

console.log('V3.2.46 purchase-record P/L statistics PASS');
