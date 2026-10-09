const assert=require('node:assert/strict');
require('tsx/cjs');
const v=require('../src/market/marketCenterViews.ts');
const now=Date.parse('2026-10-09T10:36:00+08:00');
const row={symbol:'0050',currentPrice:100,sourceQuoteAt:Date.parse('2026-10-08T13:30:00+08:00'),sessionDate:'2026-10-08',quality:'trade',quoteStatus:'STALE'};
assert.equal(v.valuationSessionActive(now),false,'National Day substitute holiday must be closed');
assert.equal(v.marketValuationQuoteFromRow(row,{now})?.currentPrice,100,'holiday retains last quote');
assert.equal(v.marketValuationQuoteFromRow(row,{now:Date.parse('2026-10-12T09:01:00+08:00'),unresolvedSymbols:['0050']})?.currentPrice,100,'opening with no tick retains reference');
assert.equal(v.marketValuationQuoteFromRow(row,{now:Date.parse('2026-10-26T10:00:00+08:00')})?.currentPrice,100,'age changes freshness, not availability');
assert.equal(v.marketValuationQuoteFromRow({...row,currentPrice:0},{now}),undefined);
assert.equal(v.marketValuationQuoteFromRow({...row,quality:'bid_ask'},{now}),undefined);
assert.equal(v.marketValuationQuoteFromRow({...row,sourceQuoteAt:now+120001},{now}),undefined);
console.log('V4.0.18 holiday / last known price / invalid data PASS');

const {marketRowsToRuntimeQuotes}=require('../src/market/unifiedMarketAdapter.ts');
const valid={...row,name:'ETF',previousClose:99,source:'TWSE_MIS',priceType:'REALTIME_TRADE',isFallback:false,market:'TSE',statusMessage:'last trade',checkedAt:now};
const initial=marketRowsToRuntimeQuotes({version:1,quotes:[valid]},[],now);
assert.equal(initial.length,1);
assert.equal(marketRowsToRuntimeQuotes({version:2,quotes:[]},initial,now)[0].currentPrice,100);
assert.equal(marketRowsToRuntimeQuotes({version:3,quotes:[{...valid,currentPrice:0}]},initial,now)[0].currentPrice,100);
assert.equal(marketRowsToRuntimeQuotes({version:4,quotes:[{...valid,currentPrice:98,sourceQuoteAt:valid.sourceQuoteAt-1000}]},initial,now)[0].currentPrice,100);
assert.equal(marketRowsToRuntimeQuotes({version:5,quotes:[{...valid,currentPrice:101,sourceQuoteAt:valid.sourceQuoteAt+1000}]},initial,now)[0].currentPrice,101);
console.log('Empty / invalid / older / newer snapshot merge PASS');

assert.match(v.marketCalendarLabel('2026-10-09'),/國慶日補假/);
assert.equal(v.marketCalendarLabel('2026-10-08'),'');
assert.equal(v.marketCalendarLabel('2026-10-11'),'週末休市');
v.applyMarketClosedDates(['2027-01-01']);
assert.equal(v.valuationSessionActive(Date.parse('2027-01-01T10:00:00+08:00')),false);
