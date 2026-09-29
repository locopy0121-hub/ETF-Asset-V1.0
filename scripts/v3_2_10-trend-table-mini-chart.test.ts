import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p:string)=>readFileSync(p,'utf8');

const modal=read('src/components/dashboard/DailyPnlHistoryModal.tsx');
for(const token of [
  "type TrendMetric='asset'|'totalPnl'|'dailyPnl'",
  'sampleRows(',
  '每日統計表',
  'PAGE_SIZE=30',
  'tableShell',
  'fixedColumn',
  '資產／損益走勢',
  '7日',
  '30日',
  '90日',
  '今年',
  '全部',
]) assert.ok(modal.includes(token),'daily statistics UI missing '+token);
assert.ok(!modal.includes('trendBar'),'legacy bar-chart renderer must be removed');
assert.ok(modal.includes('<ScrollView horizontal'),'statistics table must horizontally scroll while the date column stays fixed');
assert.ok(modal.indexOf('fixedColumn')<modal.indexOf('<ScrollView horizontal'),'fixed date column must render outside the horizontal scroller');

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
assert.equal(pkg.version,'3.2.11');
assert.equal(app.expo.version,'3.2.11');
assert.equal(app.expo.android.versionCode,30211);
assert.equal(app.expo.ios.buildNumber,'30211');
assert.equal(pkg.scripts['test:v3_2_10'],'npm run test:v3_2_9 && tsx scripts/v3_2_10-trend-table-mini-chart.test.ts');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.11 trend table and Mini financial chart regression PASS');
