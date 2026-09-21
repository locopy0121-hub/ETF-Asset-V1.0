import assert from 'node:assert/strict';
import {buildEtfScreenItem,classifyEtf,classifyIndustry,filterEtfs,filterEtfsForMetricEnrichment,parseYahooEtfMetrics} from '../src/market/etfScreener';

assert.equal(classifyEtf('0056','元大高股息'),'高股息');
assert.equal(classifyEtf('00679B','元大美債20年'),'債券');
assert.equal(classifyIndustry('00891','中信關鍵半導體'),'半導體');

const rows=[
  buildEtfScreenItem({symbol:'0050',name:'元大台灣50',market:'TWSE'},{expenseRatioPct:.43,yieldPct:2.1}),
  buildEtfScreenItem({symbol:'0056',name:'元大高股息',market:'TWSE'},{expenseRatioPct:.86,yieldPct:5.4}),
  buildEtfScreenItem({symbol:'00980D',name:'主動債券ETF',market:'TPEx'},{expenseRatioPct:.6,yieldPct:4.2}),
];
assert.deepEqual(filterEtfs(rows,{query:'高股息',market:'all',kind:'all',industry:'all'}).map(x=>x.symbol),['0056']);
assert.deepEqual(filterEtfs(rows,{query:'',market:'TWSE',kind:'高股息',industry:'all',minYieldPct:5}).map(x=>x.symbol),['0056']);
assert.deepEqual(filterEtfs(rows,{query:'',market:'all',kind:'all',industry:'all',maxExpenseRatioPct:.5}).map(x=>x.symbol),['0050']);

const missingMetrics=[
  buildEtfScreenItem({symbol:'0050',name:'元大台灣50',market:'TWSE'}),
  buildEtfScreenItem({symbol:'0056',name:'元大高股息',market:'TWSE'}),
];
assert.deepEqual(
  filterEtfs(missingMetrics,{query:'',market:'TWSE',kind:'all',industry:'all',minYieldPct:4}).map(x=>x.symbol),
  [],
);
assert.deepEqual(
  filterEtfsForMetricEnrichment(missingMetrics,{query:'',market:'TWSE',kind:'all',industry:'all',minYieldPct:4}).map(x=>x.symbol),
  ['0050','0056'],
);

const metrics=parseYahooEtfMetrics({quoteSummary:{result:[{fundProfile:{feesExpensesInvestment:{annualReportExpenseRatio:{raw:.0045}}},summaryDetail:{trailingAnnualDividendYield:{raw:.052}}}]}});
assert.ok(Math.abs((metrics.expenseRatioPct??0)-.45)<1e-9);
assert.ok(Math.abs((metrics.yieldPct??0)-5.2)<1e-9);
console.log('v1.1.2 ETF screener PASS');
