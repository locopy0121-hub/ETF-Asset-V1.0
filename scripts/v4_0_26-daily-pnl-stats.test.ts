import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bucketValue,filterPnlRows,pagePnlRows,periodKey,recentPnlPeriods,samplePnlBuckets,sortPnlRows,
  summarizePeriods,winRate} from '../src/finance/dailyPnlAnalytics';
import {summarizeDailyPnl,type DailyPnlRecord} from '../src/finance/dailyPnlHistory';

function make(date:string,todayPnl:number,totalPnl:number,marketValue:number,
  basis:'official-history'|'live-previous-close'='official-history',
  flow=0):DailyPnlRecord{
  return {date,todayPnl,totalPnl,totalMarketValue:marketValue,previousMarketValue:marketValue-todayPnl-flow,
    previousTotalPnl:totalPnl-todayPnl,tradeMarketFlow:flow,accountingAdjustment:0,
    capturedAt:1,sourceQuoteAt:1,marketDataVersion:1,final:basis==='official-history',basis};
}
const history=[
  make('2025-12-30',40,40,10040),
  make('2025-12-31',-10,30,10030),
  make('2026-01-02',100,130,10130,'official-history',2500),
  make('2026-01-05',-60,70,10070),
  make('2026-02-02',30,100,10100),
  make('2026-02-03',0,100,10100),
  make('2026-10-08',-20,80,10080,'live-previous-close'),
];
const original=JSON.stringify(history);
const day=summarizePeriods(history,'day');
const month=summarizePeriods(history,'month');
const year=summarizePeriods(history,'year');
assert.equal(day.length,history.length);
assert.deepEqual(month.map(b=>b.key),['2025-12','2026-01','2026-02','2026-10']);
assert.deepEqual(month.map(b=>b.periodPnl),[30,40,30,-20]);
assert.equal(month[1]?.days,2);
assert.equal(month[1]?.lastTotalPnl,70,'monthly cumulative value must be last valuation, not sum');
assert.equal(month[1]?.lastMarketValue,10070);
assert.equal(month[1]?.gainDays,1);assert.equal(month[1]?.lossDays,1);
assert.equal(month[2]?.flatDays,1);
assert.equal(month[3]?.estimatedDays,1,'live values must carry estimated status');
assert.equal(month[3]?.officialDays,0);
assert.deepEqual(year.map(b=>b.key),['2025','2026']);
assert.deepEqual(year.map(b=>b.periodPnl),[30,50]);
assert.equal(year[1]?.lastTotalPnl,80);
assert.equal(year[1]?.lastMarketValue,10080);
assert.equal(bucketValue(year[1]!,'dailyPnl'),50);
assert.equal(bucketValue(year[1]!,'totalPnl'),80);
assert.equal(bucketValue(year[1]!,'marketValue'),10080);
assert.equal(periodKey('2026-10-08','month'),'2026-10');
assert.deepEqual(recentPnlPeriods(month,2).map(b=>b.key),['2026-02','2026-10']);
assert.deepEqual(recentPnlPeriods(month,'all').map(b=>b.key),month.map(b=>b.key));
assert.equal(summarizeDailyPnl(history).periodPnl,80,'no trading principal may enter daily P&L aggregation');
assert.equal(winRate(2,3),40);
assert.equal(winRate(0,0),null);
assert.deepEqual(filterPnlRows(history,'gain').map(r=>r.date),['2025-12-30','2026-01-02','2026-02-02']);
assert.deepEqual(filterPnlRows(history,'flat').map(r=>r.date),['2026-02-03']);
assert.equal(filterPnlRows(history,'official').length,6);
assert.equal(sortPnlRows(history,'dailyPnl',true)[0]?.todayPnl,-60);
assert.equal(sortPnlRows(history,'dailyPnl',false)[0]?.todayPnl,100);
assert.equal(sortPnlRows(history,'date',false)[0]?.date,'2026-10-08');
const p1=pagePnlRows(sortPnlRows(history,'date',false),0,10);
assert.equal(p1.rows.length,7);assert.equal(p1.pageCount,1);
const many=Array.from({length:53},(_,i)=>make('2026-01-'+String(i+1).padStart(2,'0'),i,i,1000+i));
assert.equal(pagePnlRows(many,0,20).rows.length,20);
assert.equal(pagePnlRows(many,1,20).rows.length,20);
assert.equal(pagePnlRows(many,8,20).rows.length,13);
assert.equal(pagePnlRows(many,-7,10).page,0);
assert.equal(pagePnlRows(many,77,50).page,1);
assert.deepEqual(pagePnlRows([],0,10).rows,[]);
assert.equal(JSON.stringify(history),original,'statistics must not mutate canonical daily record objects');
assert.deepEqual(samplePnlBuckets(month,'dailyPnl',120),month);
assert.equal(samplePnlBuckets(day,'dailyPnl',4)[0]?.key,'2025-12-30');

const modal=readFileSync('src/components/dashboard/DailyPnlHistoryModal.tsx','utf8');
const core=readFileSync('src/finance/canonicalLedger.ts','utf8');
const settings=readFileSync('src/screens/SettingsScreen.tsx','utf8');
assert.match(modal,/損益走勢 · 日／月／年/);
assert.match(modal,/\{key:'day',label:'日走勢'\}/);
assert.match(modal,/\{key:'month',label:'月走勢'\}/);
assert.match(modal,/\{key:'year',label:'年走勢'\}/);
assert.match(modal,/recentPnlPeriods\(grouped,periodCount\)/);
assert.match(modal,/summarizePeriods\(chronological,period\)/);
assert.match(modal,/bucketValue\(bucket,metric\)/);
assert.match(modal,/\{key:'area',label:'面積'\}/);
assert.match(modal,/\{key:'bar',label:'柱狀'\}/);
assert.match(modal,/\[10,20,50\]/);
assert.match(modal,/pagePnlRows\(ordered,page,pageSize\)/);
assert.match(modal,/月度損益摘要/);
assert.match(modal,/onPress=\{\(\)=>setSelectedDate\(point\.bucket\.endDate\)\}/);
assert.match(modal,/獲利勝率/);
assert.match(modal,/目前沒有符合條件的每日紀錄/);
assert.doesNotMatch(modal,/PAGE_SIZE=30/);
assert.doesNotMatch(settings,/dailyPnlAnalytics|DailyPnlHistoryModal/,'protected settings page is not changed');
assert.match(core,/calculateCanonicalLedgerSnapshot/,'canonical finance calculator preserved');
console.log('V4.0.26 day/month/year trend regrouping, ROI-safe metrics, month summaries, 10/20/50 pagination, sort/filter: PASS');
