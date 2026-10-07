import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p:string)=>fs.readFileSync(p,'utf8');
const runtime=read('src/market/MarketRuntime.tsx');
const nativeRuntime=read('native/android/SaiEtfMarketRuntime.kt');
const nativePersistence=read('native/android/SaiEtfMarketPersistenceRepository.kt');
const nativePersistenceController=read('native/android/SaiEtfMarketPersistenceController.kt');
const nativeDb=read('native/android/TfAssetMarketDatabase.kt');
const settings=read('src/screens/SettingsScreen.tsx');

// V4.0.1 migration contract: the imported SaiETF native MarketDataCenter/MemoryMarketStore
// is the only live quote engine. React Native is only a bridge consumer. TF Asset's
// market-only SQLite is durable persistence and must never become a second network engine.
assert.match(runtime,/refreshUnifiedMarketData\(symbolsRef\.current\)/,
  'React runtime must request snapshots through the native SaiETF market bridge');
assert.match(runtime,/loadUnifiedMarketData\(\)/,
  'cold start must hydrate the native SaiETF market snapshot');
assert.doesNotMatch(runtime,/new MarketDataCenter\(/,
  'React runtime must not instantiate a second MarketDataCenter');
assert.doesNotMatch(runtime,/new TwseMisQuoteProvider\(/,
  'React runtime must not own a second TWSE provider');
assert.doesNotMatch(runtime,/new YahooQuoteProvider\(/,
  'React runtime must not own a second Yahoo provider');
assert.doesNotMatch(runtime,/new FugleWebSocketProvider\(/,
  'React runtime must not own a second Fugle websocket');

assert.match(nativeRuntime,/private val center = MarketDataCenter\(/,
  'SaiETF native MarketDataCenter must be the live SSOT');
assert.match(nativeRuntime,/TwseMisQuoteProvider\(\)/);
assert.match(nativeRuntime,/YahooQuoteProvider\(\)/);
assert.match(nativeRuntime,/FugleWebSocketProvider/);
assert.match(nativeRuntime,/FugleStreamingController/);
assert.match(nativeRuntime,/MarketPersistenceController/);
assert.match(nativeRuntime,/center\.refresh\(/);
assert.match(nativeRuntime,/center\.memoryQuotes\(symbols\)/);

assert.match(nativePersistence,/TfAssetMarketDatabase/,
  'SaiETF persistence adapter must persist only into TF Asset market-only SQLite');
assert.doesNotMatch(nativePersistence,/Ledger|ledger/,
  'market persistence must never touch the immutable TF Asset ledger');
assert.match(nativePersistenceController,/PERSIST_INTERVAL_MILLIS = 5_000L/);
assert.match(nativeDb,/fun persistMarketCoreCache\(payloadJson:String\):Boolean/);
assert.match(nativeDb,/db\.beginTransaction\(\)[\s\S]*?market_core_snapshots[\s\S]*?market_core_minute_candles[\s\S]*?db\.setTransactionSuccessful\(\)/,
  'snapshot and minute-candle persistence must remain one SQLite transaction');
assert.match(nativeDb,/fun loadMarketCoreCache\(\):String/);

assert.match(settings,/SaiETF Market Core｜唯一行情中心/);
assert.match(settings,/Memory Hot Store 為盤中 SSOT，SQLite 僅做持久化/);
assert.match(settings,/首頁、庫存、圖表、Finance、Widget 與 Monitor 不再各自建立第二條行情抓取路徑/);

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,app.expo.version,'package/app semantic versions must stay aligned');
assert.ok(Number(app.expo.android.versionCode)>=30219,'V3.2.19 persistence regression requires build 30219 or newer');
assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode),'iOS/Android build identities must stay aligned');
assert.equal(pkg.scripts['test:v3_2_19'],'npm run test:v3_2_18 && tsx scripts/v3_2_19-sqlite-single-source.test.ts');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.19/V4 SaiETF native MarketDataCenter <=> market-only SQLite <=> App single-SSOT contract PASS');
