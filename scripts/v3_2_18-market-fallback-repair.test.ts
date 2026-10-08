import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');

const nativeRuntime=read('native/android/SaiEtfMarketRuntime.kt');
const nativeCenter=read('native/android/SaiEtfMarketDataCenter.kt');
const providers=read('native/android/SaiEtfAndroidMarketProviders.kt');
const runtime=read('src/market/MarketRuntime.tsx');

assert.match(nativeRuntime,/providers = listOf\([\s\S]*?TwseMisQuoteProvider\(\)[\s\S]*?YahooQuoteProvider\(\)/,
  'SaiETF native core must keep TWSE MIS before Yahoo fallback');
assert.match(nativeCenter,/providers\.forEach \{ provider ->[\s\S]*?if \(pending\.isEmpty\(\)\) return@forEach/,
  'fallback providers must only receive symbols still unresolved by stronger sources');
assert.match(nativeCenter,/hotStore\.snapshot\(pending\.toSet\(\)\)[\s\S]*?raw\.source != MarketSource\.FUGLE/,
  'fresh Fugle streaming quotes must be consumed before polling fallbacks');
assert.match(providers,/val price = marketNumber\(row\.optString\("z"\)\) \?: continue/,
  'TWSE MIS rows without a real z trade must remain unresolved for Yahoo fallback');
assert.match(providers,/class YahooQuoteProvider : MarketQuoteProvider/);
assert.match(providers,/regularMarketPrice/);

assert.match(runtime,/V3_RUNTIME_STORAGE_KEY='@tf-asset\/market-runtime-v231'/,
  'V3 runtime settings must still be discoverable during V4 migration');
assert.match(runtime,/LEGACY_RUNTIME_STORAGE_KEY='@tf-asset\/market-runtime'/);
assert.doesNotMatch(runtime,/migratedFromLegacy|legacyLive|refreshSeconds:5/);
assert.match(runtime,/return phase==='live'\?1:30/,
  'legacy 5-second default cannot override SaiETF 1-second live rule');

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,app.expo.version,'package/app semantic versions must stay aligned');
assert.ok(Number(app.expo.android.versionCode)>=30218,'V3.2.18 fallback regression requires build 30218 or newer');
assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode),'iOS/Android build identities must stay aligned');
assert.equal(pkg.scripts['test:v3_2_18'],'npm run test:v3_2_17 && tsx scripts/v3_2_18-market-fallback-repair.test.ts');

console.log('V3.2.18 SaiETF native Fugle -> TWSE MIS -> Yahoo fallback + 1s migration PASS');
