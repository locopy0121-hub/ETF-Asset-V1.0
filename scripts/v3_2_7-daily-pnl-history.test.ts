import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveDailyPnlRecord,summarizeDailyPnl,upsertDailyPnlRecord} from '../src/finance/dailyPnlHistory';
import {calculateCanonicalLedgerSnapshot,freezeTradeEntry} from '../src/finance/canonicalLedger';
import type {RuntimeQuote} from '../src/finance/financeSeed';

const read=(p:string)=>readFileSync(p,'utf8');
const entries=[
  freezeTradeEntry({id:'b1',date:'2026-09-28',kind:'buy',symbol:'0050',name:'0050',tradeMode:'ROUND_LOT',shares:1000,price:50}),
];
const quote:RuntimeQuote={
  symbol:'0050',name:'0050',currentPrice:55,previousClose:54,previousCloseKnown:true,
  sourceQuoteAt:Date.UTC(2026,8,29,6,0,0),quality:'official_close',source:'TWSE_DAILY',priceType:'OFFICIAL_CLOSE',
  liquidationTradeMode:'ROUND_LOT',dividendFrequency:4,sparkline:[54,55],
};
const current=calculateCanonicalLedgerSnapshot({initialCash:0,entries,quotes:[quote]});
const row=deriveDailyPnlRecord({
  initialCash:0,entries,rawQuotes:[quote],currentSnapshot:current,valuationComplete:true,marketDataVersion:7,
  now:Date.UTC(2026,8,29,7,46,0),
});
assert.ok(row);
assert.equal(row?.date,'2026-09-29');
assert.equal(row?.final,true);
assert.equal(row?.totalPnl,current.portfolio.totalPnl);
assert.equal(row?.todayPnl,(row?.totalMarketValue??0)-(row?.previousMarketValue??0),'daily PnL must be market-value delta when there is no trade flow');
assert.equal(
  (row?.previousTotalPnl??0)+(row?.todayPnl??0)+(row?.accountingAdjustment??0),
  row?.totalPnl,
  'accounting bridge must reconcile market PnL to canonical total PnL',
);

const frozen=upsertDailyPnlRecord([row!],{...row!,totalPnl:row!.totalPnl+999,todayPnl:row!.todayPnl+999});
assert.equal(frozen[0]?.totalPnl,row?.totalPnl,'final daily record must never be rewritten by another live estimate');
const stats=summarizeDailyPnl([
  {...row!,date:'2026-09-28',todayPnl:-20,final:true},
  {...row!,date:'2026-09-29',todayPnl:30,final:true},
]);
assert.equal(stats.gainDays,1);
assert.equal(stats.lossDays,1);
assert.equal(stats.periodPnl,10);
assert.equal(stats.best?.todayPnl,30);
assert.equal(stats.worst?.todayPnl,-20);

const overview=read('src/components/dashboard/DashboardAssetOverview.tsx');
assert.match(overview,/前日總損益/);
assert.match(overview,/今日市值變動/);
assert.match(overview,/總損益/);
assert.match(overview,/onPressTotalPnl/);
assert.doesNotMatch(overview,/>＋<\/Text>/,'dashboard must not claim market-value delta is a simple accounting addition');
assert.doesNotMatch(overview,/>＝<\/Text>/,'dashboard must not claim market-value delta directly equals total PnL');
assert.match(overview,/linkedColor\(card\.backgroundColor,card\.backgroundProfitColor,totalTone/);
const home=read('src/screens/HomeScreen.tsx');
assert.match(home,/useDailyPnlHistory/);
assert.match(home,/DailyPnlHistoryModal/);
assert.match(home,/onPressTotalPnl=\{\(\)=>setPnlHistoryOpen\(true\)\}/);

const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.2.9');
assert.equal(app.expo.version,'3.2.9');
assert.equal(app.expo.android.versionCode,30209);
assert.equal(app.expo.ios.buildNumber,'30209');
assert.match(read('src/settings/BackupService.ts'),/APP_VERSION='3\.2\.9'/);
assert.match(read('src/screens/SettingsScreen.tsx'),/VERSION='3\.2\.9'/);
assert.match(read('src/screens/SettingsScreen.tsx'),/BUILD='30209'/);

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.9 daily market-value PnL bridge regression PASS');
