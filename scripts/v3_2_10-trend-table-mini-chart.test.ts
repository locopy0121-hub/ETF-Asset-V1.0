import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p:string)=>readFileSync(p,'utf8');

const modal=read('src/components/dashboard/DailyPnlHistoryModal.tsx');
// V4.0.26 replaces the old fixed 30-row horizontal table with a ledger-style
// 10/20/50 row list; the mini/holding chart contracts below are unchanged.
for(const token of [
  '損益走勢 · 日／月／年',
  "key:'day',label:'日走勢'",
  "key:'month',label:'月走勢'",
  "key:'year',label:'年走勢'",
  '每日損益紀錄',
  '月度損益摘要',
  'pagePnlRows(ordered,page,pageSize)',
  'recordCard',
  '10,20,50',
  '每日損益',
  '累積總損益',
  '持股市值',
  '7日',
  '30日',
  '90日',
  '全部',
])assert.ok(modal.includes(token),'daily statistics UI missing '+token);
assert.ok(!modal.includes('trendBar'),'legacy bar-chart renderer must be removed');
assert.ok(modal.indexOf('損益走勢 · 日／月／年')<modal.indexOf('每日損益紀錄'),
  'period trend needs to render before ledger-style daily records');
assert.ok(modal.includes('onPress={()=>setSelectedDate(row.date)}'),
  'daily records must update the selected chart and detail');


const mini=read('src/components/MiniHoldingChart.tsx');
for(const token of [
  "holding.intradayPreviousClose",
  "holding.previousClose>0",
  "borderStyle:'dashed'",
  "width:'100%'",
  "backgroundColor:'transparent'",
  'priorDelta*nextDelta>0',
  'segmentView(prior,cross',
]) assert.ok(mini.includes(token),'Mini financial trend missing '+token);
assert.ok(!mini.includes("backgroundColor:'#090E15'"),'Mini chart must inherit the market-card background instead of drawing a black tile');

const quote=read('src/components/HoldingQuoteModule.tsx');
assert.ok(quote.includes('showChart&&styles.chartCardLayout'),'chart cards must stack quote content and Mini trend vertically');
assert.ok(quote.includes('showChart&&item.quoteVerified!==false?<View style={styles.miniChartWrap}'),'verified quote cards must keep the Mini chart surface while real intraday points are still loading');
assert.ok(quote.indexOf('style={styles.bodyPress}')<quote.indexOf('style={styles.miniChartWrap}'),'quote/name/price content must render before the Mini trend');

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.match(pkg.version,/^\d+\.\d+\.\d+$/);
assert.equal(app.expo.version,pkg.version);
assert.ok(Number.isInteger(app.expo.android.versionCode)&&app.expo.android.versionCode>0);
assert.equal(String(app.expo.ios.buildNumber),String(app.expo.android.versionCode));
assert.equal(pkg.scripts['test:v3_2_10'],'npm run test:v3_2_9 && tsx scripts/v3_2_10-trend-table-mini-chart.test.ts');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.11 trend table and Mini financial chart regression PASS');
