import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MarketArbitrator,ProviderCircuitBreaker,type MarketQuote} from '../src/market/MarketCore';

const quote=(patch:Partial<MarketQuote>):MarketQuote=>({
  symbol:'2330',name:'台積電',price:1425,source:'FUGLE',quality:'LIVE',
  sourceTimestampEpochMillis:Date.parse('2026-10-07T10:00:00+08:00'),
  receivedAtEpochMillis:Date.parse('2026-10-07T10:00:01+08:00'),
  sessionDate:'2026-10-07',fallbackLevel:0,...patch,
});

const arbitrator=new MarketArbitrator();
assert.equal(arbitrator.decide(undefined,quote({})).accepted,true);
assert.equal(arbitrator.decide(
  quote({sessionDate:'2026-10-07',sourceTimestampEpochMillis:200,sequence:20}),
  quote({sessionDate:'2026-10-06',sourceTimestampEpochMillis:300,sequence:30}),
).accepted,false,'prior session must never replace current session');
assert.equal(arbitrator.decide(
  quote({sourceTimestampEpochMillis:200,sequence:20}),
  quote({sourceTimestampEpochMillis:300,sequence:19}),
).accepted,false,'out-of-order Fugle sequence must be rejected');
assert.equal(arbitrator.decide(
  quote({source:'YAHOO',quality:'DELAYED',fallbackLevel:2,sourceTimestampEpochMillis:200}),
  quote({source:'TWSE_MIS',quality:'LIVE',fallbackLevel:1,sourceTimestampEpochMillis:300}),
).accepted,true);

const breaker=new ProviderCircuitBreaker();
breaker.recordFailure(1000,5000);
assert.equal(breaker.snapshot(1000).state,'DEGRADED');
breaker.recordFailure(2000,5000);
assert.equal(breaker.snapshot(2000).state,'COOLDOWN');
assert.equal(breaker.canAttempt(3000),false);
assert.equal(breaker.canAttempt(8000),true);
assert.equal(breaker.snapshot(8000).state,'RECOVERING');
breaker.recordSuccess(8000);
breaker.recordSuccess(9000);
assert.equal(breaker.snapshot(9000).state,'HEALTHY');

const runtime=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');
const providers=fs.readFileSync('src/market/MarketProviders.ts','utf8');
const catalog=fs.readFileSync('src/market/TaiwanSecurityCatalog.ts','utf8');
const persistence=fs.readFileSync('src/market/MarketPersistence.ts','utf8');
const nativeModule=fs.readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const nativeDb=fs.readFileSync('native/android/TfAssetMarketDatabase.kt','utf8');

assert.doesNotMatch(runtime,/function fetchTwseQuotes|mis\.twse\.com\.tw/,'legacy direct TWSE fetch must be removed from MarketRuntime');
assert.match(runtime,/new MarketDataCenter\(\[twse,yahoo\]\)/);
assert.match(runtime,/FugleWebSocketProvider/);
assert.match(providers,/class TwseMisQuoteProvider/);
assert.match(providers,/class YahooQuoteProvider/);
assert.match(catalog,/STOCK_DAY_ALL/);
assert.match(catalog,/tpex_mainboard_quotes/);
assert.match(catalog,/t187ap03_L/);
assert.match(catalog,/mopsfin_t187ap03_O/);
assert.doesNotMatch(catalog,/\^00/,'full Taiwan catalog must not be restricted to ETF codes');
assert.match(persistence,/persistIntervalMillis=5000/);
assert.match(persistence,/MarketMinuteCandle/);
assert.match(persistence,/persistNativeMarketCache/,'Android persistence must route to native SQLite');
assert.match(nativeDb,/SQLiteOpenHelper/);
assert.match(nativeDb,/market_quote_snapshots/);
assert.match(nativeDb,/market_minute_candles/);
assert.match(nativeModule,/loadMarketCache/);
assert.match(nativeModule,/persistMarketCache/);
assert.match(nativeModule,/AndroidKeyStore/);
assert.match(nativeModule,/AES\/GCM\/NoPadding/);

console.log('TF ASSET V4.0.1 MARKET CORE: PASS');
