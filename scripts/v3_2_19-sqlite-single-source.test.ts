import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p:string)=>fs.readFileSync(p,'utf8');
const runtime=read('src/market/MarketRuntime.tsx');
const bridge=read('src/native/TfAssetNativeBridge.ts');
const nativeRuntime=read('native/android/SaiEtfMarketRuntime.kt');
const nativePersistence=read('native/android/SaiEtfMarketPersistenceRepository.kt');
const nativePersistenceController=read('native/android/SaiEtfMarketPersistenceController.kt');
const nativeCenter=read('native/android/SaiEtfMarketDataCenter.kt');
const nativeDb=read('native/android/TfAssetMarketDatabase.kt');
const settings=read('src/screens/SettingsScreen.tsx');

// V4 architecture: SaiETF native MarketDataCenter/Memory Hot Store is the live SSOT.
// React Native is only a consumer/adapter; TF Asset market-only SQLite is durable persistence.
assert.match(runtime,/refreshUnifiedMarketData\(combinedSymbols\(\)\)/,
  'App runtime must refresh holdings and selected research symbols through the SaiETF native market bridge');
assert.match(runtime,/loadUnifiedMarketData\(\)/,
  'startup must hydrate through the SaiETF native market bridge');
assert.match(runtime,/marketRowsToRuntimeQuotes/,'native market rows must be adapted for TF Asset UI consumers');
assert.doesNotMatch(runtime,/new MarketDataCenter\(/,'JS must not own a second MarketDataCenter');
assert.doesNotMatch(runtime,/new MarketPersistenceRepository\(/,'JS must not own a second market persistence engine');

assert.match(bridge,/refreshUnifiedMarketData/);
assert.match(bridge,/readUnifiedMarketData/);
assert.match(nativeRuntime,/private val center = MarketDataCenter\(/);
assert.match(nativeRuntime,/TwseMisQuoteProvider\(\)/);
assert.match(nativeRuntime,/YahooQuoteProvider\(\)/);
assert.match(nativeRuntime,/FugleWebSocketProvider/);
assert.match(nativeRuntime,/MarketPersistenceController/);
assert.match(nativeRuntime,/MarketPersistenceRepository/);
assert.match(nativeRuntime,/SAIETF_NATIVE/);
assert.match(nativeCenter,/private val hotStore: MemoryMarketStore/);
assert.match(nativeCenter,/private val arbitrator: MarketArbitrator/);
assert.match(nativePersistenceController,/PERSIST_INTERVAL_MILLIS = 5_000L/);
assert.match(nativePersistence,/TfAssetMarketDatabase/,'SaiETF persistence adapter must use TF Asset market-only SQLite');
assert.doesNotMatch(nativePersistence,/Ledger|ledger/,'market persistence must never touch TF Asset ledger');

assert.match(nativeDb,/fun persistMarketCoreCache\(payloadJson:String\):Boolean/);
assert.match(nativeDb,/db\.beginTransaction\(\)[\s\S]*?market_core_snapshots[\s\S]*?market_core_minute_candles[\s\S]*?db\.setTransactionSuccessful\(\)/,
  'snapshot and minute-candle persistence must remain one SQLite transaction');
assert.match(nativeDb,/fun loadMarketCoreCache\(\):String/);

assert.match(settings,/SaiETF Market Core｜唯一行情中心/);
assert.match(settings,/Memory Hot Store 為行情入口，SQLite 僅做持久化/);
assert.match(settings,/新報價直接推送至首頁、持股損益、Widget、Monitor 與 Mini/);

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,app.expo.version,'package/app semantic versions must stay aligned');
assert.ok(Number(app.expo.android.versionCode)>=30219,'V3.2.19 persistence regression requires build 30219 or newer');
assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode),'iOS/Android build identities must stay aligned');
assert.equal(pkg.scripts['test:v3_2_19'],'npm run test:v3_2_18 && tsx scripts/v3_2_19-sqlite-single-source.test.ts');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.19/V4 SaiETF native MarketDataCenter <=> SQLite persistence <=> App single-SSOT contract PASS');
