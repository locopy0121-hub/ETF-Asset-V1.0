import assert from 'node:assert/strict';
import fs from 'node:fs';
import {omitRegressedTransportQuotes} from '../src/market/saiEtfSnapshotContract';
import type {UnifiedMarketRow,UnifiedMarketSnapshot} from '../src/native/TfAssetNativeBridge';
import type {RuntimeQuote} from '../src/finance/financeSeed';

const base=Date.parse('2026-10-12T03:08:00Z');
const quote=(symbol:string,at:number,sequence:number,price:number,source:'FUGLE'|'TWSE_MIS'='FUGLE'):UnifiedMarketRow=>({
  symbol,name:symbol,currentPrice:price,previousClose:price-1,officialTradePrice:price,
  sourceQuoteAt:at,sessionDate:'2026-10-12',source,
  quality:'trade',priceType:'REALTIME_TRADE',quoteStatus:'LIVE',
  isFallback:false,market:'TSE',statusMessage:'TF Asset direct Fugle stream',
  checkedAt:at,sequence,
});
const old0050=quote('0050',base,10,114.50) as unknown as RuntimeQuote;
const old00406A=quote('00406A',base+2_000,20,10.15) as unknown as RuntimeQuote;
const snapshot:UnifiedMarketSnapshot={
  version:33,queriedAt:base+4_000,phase:'live',
  quotes:[quote('0050',base+3_000,11,114.65),quote('00406A',base-1_000,19,10.10)],
};
const result=omitRegressedTransportQuotes(snapshot,[old0050,old00406A]);
assert.deepEqual(result.quotes.map(row=>row.symbol),['0050'],
  'one stale symbol must never block the fresh Fugle trade for another holding');
assert.equal(result.quotes[0]?.currentPrice,114.65);
assert.equal(snapshot.quotes.length,2,'the original immutable native snapshot is never mutated');
const equalTimeSequence:UnifiedMarketSnapshot={
  ...snapshot,quotes:[quote('0050',base,11,114.55),quote('00406A',base+2_000,19,10.10)],
};
assert.deepEqual(
  omitRegressedTransportQuotes(equalTimeSequence,[old0050,old00406A]).quotes.map(row=>row.symbol),
  ['0050'],'Fugle serial increments at the same millisecond must still advance independently',
);
const core=fs.readFileSync('native/android/SaiEtfMarketRuntime.kt','utf8');
const provider=fs.readFileSync('native/android/SaiEtfFugleWebSocketProvider.kt','utf8');
const controller=fs.readFileSync('native/android/SaiEtfFugleStreamingController.kt','utf8');
const runtime=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');
assert.match(core,/onTrade = \{ quote -> if\(!paused&&TfAssetMarketSchedule\.allows\(appContext\)\)liveQuotes\.accept\(quote\) \}/,
  'TF Asset must accept Fugle socket trades directly into its own in-process hot store');
assert.match(provider,/onTrade\(quote\)[\s\S]*_events\.tryEmit\(MarketEvent\.Quote\(quote\)\)/,
  'buffer saturation must not discard LIVE prices');
assert.match(controller,/is MarketEvent\.Quote -> Unit/,
  'the diagnostic event stream must not arbitrate quotes a second time');
assert.match(runtime,/const orderedSnapshot=omitRegressedTransportQuotes\(snapshot,sessionRows\)/,
  'the React Native UI must filter delayed bridge envelopes per symbol');
assert.match(provider,/wss:\/\/api\.fugle\.tw\/marketdata\/v1\.0\/stock\/streaming/);
assert.match(provider,/private const val TRADE_CHANNEL = "trades"/);
assert.match(provider,/value >= 100_000_000_000_000L -> value \/ 1_000L/,
  'Fugle trade microseconds must be converted to milliseconds');
assert.doesNotMatch(core,/https?:\/\/.*SaiETF/,
  'no external SaiETF App or relay is permitted');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8'));
assert.equal(pkg.version,'4.0.52');
assert.equal(app.expo.version,'4.0.52');
assert.equal(app.expo.android.versionCode,40052);
console.log('TF Asset V4.0.52 direct Fugle WebSocket and per-symbol LIVE propagation PASS');
