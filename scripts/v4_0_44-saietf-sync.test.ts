import assert from 'node:assert/strict';
import fs from 'node:fs';
import {marketRowsToRuntimeQuotes} from '../src/market/unifiedMarketAdapter';
import {valuationSessionActive,marketValuationQuoteFromRow} from '../src/market/marketCenterViews';
import type {RuntimeQuote} from '../src/finance/financeSeed';
import type {UnifiedMarketSnapshot,UnifiedMarketRow} from '../src/native/TfAssetNativeBridge';

// V4.0.49 supersedes the prior UI cadence with Fugle subscription updates,
// but MUST leave provider circuit breakers and source priorities in native.
const runtime=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');
const native=fs.readFileSync('native/android/SaiEtfMarketDataCenter.kt','utf8');
const nativeRuntime=fs.readFileSync('native/android/SaiEtfMarketRuntime.kt','utf8');
assert.doesNotMatch(runtime,/setInterval\(/,'market prices are subscription-driven; no global cadence');
assert.match(runtime,/subscribeUnifiedMarketData\(applySnapshot\)/);
assert.match(native,/minFetchIntervalMillis = 1_000L/);
assert.match(native,/minFetchIntervalMillis = 15_000L/);
assert.match(nativeRuntime,/FugleStreamingController/);
assert.match(nativeRuntime,/cachedSaiEtfMarketReferences\(persistence\.persistedQuotes\(\)\.values\)/);
assert.match(nativeRuntime,/runBlocking \{ fugle\.fetchSnapshot\(symbols\) \}/);
assert.doesNotMatch(nativeRuntime,/center\.restorePersistedQuotes/);
assert.match(nativeRuntime,/TwseMisQuoteProvider\(\)/);
assert.match(nativeRuntime,/YahooQuoteProvider\(\)/);
assert.equal(valuationSessionActive(Date.parse('2026-10-12T01:09:00Z')),true);
assert.equal(valuationSessionActive(Date.parse('2026-10-09T01:09:00Z')),false);

const current=Date.parse('2026-10-12T01:09:00Z');
const oldAt=Date.parse('2026-10-08T05:30:00Z');
const prior={symbol:'1301',name:'台塑',currentPrice:81.30,previousClose:75.40,previousCloseKnown:true,
  sourceQuoteAt:oldAt,sessionDate:'2026-10-08',quality:'trade',source:'TWSE_MIS',
  priceType:'REALTIME_TRADE',isFallback:false,market:'TSE',statusMessage:'official',checkedAt:oldAt,
  liquidationTradeMode:'ROUND_LOT',dividendFrequency:4,pinned:false,sparkline:[81.3]} as RuntimeQuote;
const make=(price:number,prev:number|null,at:number,session:string,source:'FUGLE'|'TWSE_MIS'='FUGLE')=>({
  symbol:'1301',name:'台塑',currentPrice:price,previousClose:prev,officialTradePrice:prev===null?null:price,
  sourceQuoteAt:at,sessionDate:session,quality:'trade',source,priceType:'REALTIME_TRADE',
  isFallback:false,market:'TSE',statusMessage:'verified',checkedAt:at,
}) as UnifiedMarketRow;
const snap=(row:UnifiedMarketRow,version:number):UnifiedMarketSnapshot=>({
  version,queriedAt:current,quotes:[row],missing:[],phase:'live',
});
assert.equal(marketValuationQuoteFromRow(prior,{now:current}),undefined,'prior-session cache cannot count as a live-session valuation');
assert.ok(marketValuationQuoteFromRow(prior,{now:Date.parse('2026-10-12T08:00:00Z')}),'after-hours last valid quote remains visible');
const stream=marketRowsToRuntimeQuotes(snap(make(81.5,null,current,'2026-10-12'),1),[prior],current)[0]!;
assert.equal(stream.currentPrice,81.5);
assert.equal(stream.previousCloseKnown,false,'old pre-holiday comparison must be discarded');
assert.equal(stream.previousClose,81.5,'without verified previous close use neutral reference, not old 75.40');
assert.equal(stream.intradayPreviousClose,null);
const official=marketRowsToRuntimeQuotes(snap(make(81.5,81.3,current+1000,'2026-10-12','TWSE_MIS'),2),[stream],current+1000)[0]!;
assert.equal(official.previousClose,81.3);
assert.equal(official.previousCloseKnown,true);
const sameDay=marketRowsToRuntimeQuotes(snap(make(81.8,null,current+2000,'2026-10-12'),3),[official],current+2000)[0]!;
assert.equal(sameDay.previousClose,81.3,'same-session known previous close should survive stream-only updates');
assert.equal(sameDay.previousCloseKnown,true);
console.log('V4.0.44 SaiETF market policy, subscription lifecycle, official holiday, day-roll, previous-close contracts PASS');
