import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p:string)=>fs.readFileSync(p,'utf8');
const runtime=read('src/market/MarketRuntime.tsx');
const persistence=read('src/market/MarketPersistence.ts');
const nativeDb=read('native/android/TfAssetMarketDatabase.kt');
const settings=read('src/screens/SettingsScreen.tsx');

// V4 architecture: MarketDataCenter/Memory Hot Store is the live SSOT. Android SQLite is
// the durable persistence boundary used for crash/restart hydration, not a second quote engine.
assert.match(runtime,/const persistedQuotes=await persistence\.loadSnapshots\(\)/,
  'startup must hydrate durable market snapshots before live providers begin');
assert.match(runtime,/const center=new MarketDataCenter\(\[twse,yahoo\]\)/);
assert.match(runtime,/if\(persistedQuotes\.length\)center\.seedCache\(persistedQuotes,true\)/,
  'persisted SQLite snapshots must seed the MarketDataCenter on startup');
assert.match(runtime,/centerUnsubscribeRef\.current=center\.subscribe\(snapshot=>\{/,
  'App consumers must project from MarketDataCenter publications');
assert.match(runtime,/persistenceControllerRef\.current=new MarketPersistenceController\(center,persistence\)/,
  'one persistence controller must bridge MarketDataCenter publications to durable storage');
assert.doesNotMatch(runtime,/refreshUnifiedMarketData\(|loadUnifiedMarketData\(/,
  'V4 JS runtime must not reactivate the legacy Android quote engine as a second SSOT');

assert.match(persistence,/nativeRuntimeAvailable[\s\S]*?await loadNativeMarketCache\(\)/,
  'Android startup must read Market Core persistence from native SQLite');
assert.match(persistence,/const ok=await persistNativeMarketCache\(serialized\)/);
assert.match(persistence,/if\(!ok\)throw new Error\('Android SQLite market persistence failed'\)/,
  'failed native persistence must never be reported as successful');
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

console.log('V3.2.19/V4 MarketDataCenter <=> SQLite persistence <=> App single-SSOT contract PASS');
