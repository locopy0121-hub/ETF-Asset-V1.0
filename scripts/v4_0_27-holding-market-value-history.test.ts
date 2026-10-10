import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterPnlRows,pagePnlRows,sortPnlRows,summarizePeriods,
  recentPnlPeriods,bucketValue,winRate} from '../src/finance/dailyPnlAnalytics';
import {summarizeDailyPnl,type DailyPnlRecord} from '../src/finance/dailyPnlHistory';

const data=(date:string,todayPnl:number,totalMarketValue:number,
  basis:'official-history'|'live-previous-close'='official-history'):DailyPnlRecord=>({
  date,todayPnl,totalMarketValue,totalPnl:todayPnl,
  previousTotalPnl:0,previousMarketValue:totalMarketValue-todayPnl,
  tradeMarketFlow:0,accountingAdjustment:0,
  capturedAt:1,sourceQuoteAt:1,marketDataVersion:1,
  final:basis==='official-history',basis,
});
const original=[
  data('2025-12-31',-40,10000),
  data('2026-01-02',100,11200),
  data('2026-01-05',-25,11000),
  data('2026-02-02',90,13500),
  data('2026-02-03',0,13200),
  data('2026-10-08',-17,28255,'live-previous-close'),
];
const baseline=JSON.stringify(original);
const months=summarizePeriods(original,'month');
assert.deepEqual(months.map(x=>x.key),['2025-12','2026-01','2026-02','2026-10']);
assert.deepEqual(months.map(x=>x.lastMarketValue),[10000,11000,13200,28255],
  'month market value must reflect the last valid snapshot, not sum');
assert.deepEqual(months.map(x=>x.periodPnl),[-40,75,90,-17],
  'month profit must aggregate daily P&L rather than differences of market values');
const years=summarizePeriods(original,'year');
assert.deepEqual(years.map(x=>x.lastMarketValue),[10000,28255]);
assert.equal(bucketValue(years[1]!,'marketValue'),28255);
assert.equal(bucketValue(years[1]!,'dailyPnl'),148);
assert.equal(recentPnlPeriods(months,2)[0]?.key,'2026-02');
assert.equal(summarizeDailyPnl(original).gainDays,2);
assert.equal(winRate(0,0),null);
const profitOnly=filterPnlRows(original,'gain');
assert.equal(profitOnly.length,2);
assert.equal(filterPnlRows(original,'official').length,5);
const sorted=sortPnlRows(original,'date',false);
assert.equal(sorted[0]?.date,'2026-10-08');
assert.equal(sortPnlRows(original,'marketValue',true)[0]?.totalMarketValue,10000);
const many=Array.from({length:73},(_,i)=>data(
  '2026-'+String(Math.floor(i/26)+1).padStart(2,'0')+'-'+String(i%26+1).padStart(2,'0'),
  i,12000+i*17,
));
assert.equal(pagePnlRows(many,0,10).rows.length,10);
assert.equal(pagePnlRows(many,1,20).rows.length,20);
assert.equal(pagePnlRows(many,1,50).rows.length,23);
assert.equal(pagePnlRows(many,500,50).page,1);
assert.equal(pagePnlRows([],500,20).page,0);
assert.equal(JSON.stringify(original),baseline,'read-only analytics must not mutate daily finance records');

const panel=readFileSync('src/components/dashboard/HoldingMarketValueHistoryPanel.tsx','utf8');
const purchase=readFileSync('src/components/dashboard/PurchasePnlStatsModal.tsx','utf8');
const history=readFileSync('src/finance/dailyPnlHistory.ts','utf8');
const ledger=readFileSync('src/finance/canonicalLedger.ts','utf8');
const settings=readFileSync('src/screens/SettingsScreen.tsx','utf8');
assert.match(purchase,/tab==='daily'\?<HoldingMarketValueHistoryPanel records={dailyRecords}\/>:null/,
  'the screenshot's holding stats daily tab must use the new panel');
assert.doesNotMatch(purchase,/\.slice\(0,120\)/,'historic records must not be truncated at 120');
assert.match(panel,/setPeriod\(next\)/);
assert.match(panel,/summarizePeriods\(chronological,period\)/);
assert.match(panel,/recentPnlPeriods\(grouped,range\)/);
assert.match(panel,/bucketValue\(bucket,metric\)/);
assert.match(panel,/metric==='marketValue'\?'期末持股市值':'期間損益'/);
assert.match(panel,/label="持股市值"/);
assert.match(panel,/label="期間損益"/);
assert.match(panel,/SIZES:readonly PnlPageSize\[\]=\[10,20,50\]/);
assert.match(panel,/pagePnlRows\(visible,page,pageSize\)/);
assert.match(panel,/setPageSize\(size\);setPage\(0\)/);
assert.match(panel,/setPage\(n=>Math\.max\(0,n-1\)\)/);
assert.match(panel,/setPage\(n=>Math\.min\(paging\.pageCount-1,n\+1\)\)/);
assert.match(panel,/filterPnlRows\(ranged,filter\)/);
assert.match(panel,/sortPnlRows\(filterPnlRows/);
assert.match(panel,/月度市值／損益摘要/);
assert.match(panel,/setSelectedDate\(point\.bucket\.endDate\)/);
assert.match(panel,/市值走勢是資產估值，不代表投資報酬/);
assert.match(history,/export type DailyPnlRecord/);
assert.match(ledger,/calculateCanonicalLedgerSnapshot/);
assert.doesNotMatch(settings,/HoldingMarketValueHistoryPanel|dailyPnlAnalytics/,
  'protected settings page must not host the new module');
console.log('V4.0.27 holding daily-market-value chart, day/month/year, 10/20/50 pagination, proper P&L isolation: PASS');
