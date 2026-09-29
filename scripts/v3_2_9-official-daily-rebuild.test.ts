import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freezeTradeEntry} from '../src/finance/canonicalLedger';
import {
  rebuildDailyPnlRecordsFromOfficialHistory,
  tradeMarketFlowOnDate,
} from '../src/finance/dailyPnlHistory';
import {
  parseTpexMonthly,
  parseTwseMonthly,
  type DailyCandle,
} from '../src/market/twseDailyHistory';

const read=(p:string)=>readFileSync(p,'utf8');

const twse=parseTwseMonthly({
  stat:'OK',
  data:[
    ['115/09/28','1,000','54,000','53','55','52','54','+1','10'],
    ['115/09/29','1,200','66,000','54','56','53','55','+1','12'],
  ],
});
assert.equal(twse.length,2);
assert.equal(twse[0]?.date,'2026-09-28');
assert.equal(twse[1]?.close,55);
assert.equal(twse[0]?.source,'TWSE');

const tpex=parseTpexMonthly({
  stat:'ok',
  tables:[{data:[
    ['115/09/28','10','540','53','55','52','54','+1','10'],
    ['115/09/29','12','660','54','56','53','55','+1','12'],
  ]}],
});
assert.equal(tpex.length,2);
assert.equal(tpex[0]?.volume,10_000);
assert.equal(tpex[0]?.source,'TPEX');

const entries=[
  freezeTradeEntry({
    id:'b1',date:'2026-09-28',kind:'buy',symbol:'0050',name:'元大台灣50',
    tradeMode:'ROUND_LOT',shares:1000,price:50,actualFee:0,
  }),
];
const histories=new Map<string,readonly DailyCandle[]>([['0050',twse]]);
const rows=rebuildDailyPnlRecordsFromOfficialHistory({
  initialCash:0,
  entries,
  histories,
  marketDataVersion:9,
  capturedAt:Date.UTC(2026,8,29,10),
});
assert.equal(rows.length,2);
assert.equal(rows[0]?.date,'2026-09-28');
assert.equal(rows[0]?.previousMarketValue,0);
assert.equal(rows[0]?.totalMarketValue,54_000);
assert.equal(rows[0]?.tradeMarketFlow,50_000);
assert.equal(rows[0]?.todayPnl,4_000,'first-day buy principal must be removed from market PnL');
assert.equal(rows[1]?.previousMarketValue,54_000);
assert.equal(rows[1]?.totalMarketValue,55_000);
assert.equal(rows[1]?.tradeMarketFlow,0);
assert.equal(rows[1]?.todayPnl,1_000,'no-trade day must equal close-to-close portfolio market-value delta');
assert.equal(
  rows[1]!.previousTotalPnl+rows[1]!.todayPnl+rows[1]!.accountingAdjustment,
  rows[1]!.totalPnl,
  'market PnL plus accounting bridge must exactly reconcile to Finance Core total PnL',
);
assert.equal(rows[1]?.basis,'official-history');
assert.equal(rows[1]?.final,true);

const sell=freezeTradeEntry({
  id:'s1',date:'2026-09-29',kind:'sell',symbol:'0050',name:'元大台灣50',
  tradeMode:'ROUND_LOT',shares:100,price:55,actualFee:0,actualTax:0,
});
assert.equal(tradeMarketFlowOnDate([...entries,sell],'2026-09-29'),-5_500,'sell principal must reduce market flow');

const daily=read('src/finance/dailyPnlHistory.ts');
for(const token of [
  'rebuildDailyPnlRecordsFromOfficialHistory',
  'todayPnl=totalMarketValue-previousMarketValue-tradeMarketFlow',
  "basis:'official-history'",
  'MAX_RECORDS=8000',
]) assert.ok(daily.includes(token),'daily history missing '+token);

const hook=read('src/finance/useDailyPnlHistory.ts');
for(const token of [
  'fetchOfficialDailyHistoryRange',
  'firstTradeDate',
  'tradeSymbols',
  '@tf-asset/v3.2.9-daily-pnl-history',
]) assert.ok(hook.includes(token),'history hook missing '+token);

const historySource=read('src/market/twseDailyHistory.ts');
assert.ok(historySource.includes('afterTrading/tradingStock'),'TPEx monthly official history route missing');
assert.ok(historySource.includes('MAX_HISTORY_MONTHS=360'),'first-trade history must not be limited to 12 chart months');

const overview=read('src/components/dashboard/DashboardAssetOverview.tsx');
assert.ok(overview.includes('前日總損益'));
assert.ok(overview.includes('今日市值變動'));
assert.ok(!overview.includes('>＋</Text>'));
assert.ok(!overview.includes('>＝</Text>'));

const modal=read('src/components/dashboard/DailyPnlHistoryModal.tsx');
for(const token of ['前日持股市值','帳務調整','證券中心正式日收盤','第一筆交易日'])
  assert.ok(modal.includes(token),'daily history UI missing '+token);

const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.2.9');
assert.equal(app.expo.version,'3.2.9');
assert.equal(app.expo.android.versionCode,30209);
assert.equal(app.expo.ios.buildNumber,'30209');
assert.equal(pkg.scripts['test:v3_2_9'],'npm run test:v3_2_8 && tsx scripts/v3_2_9-official-daily-rebuild.test.ts');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.9 official first-trade daily portfolio rebuild PASS');
