import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');

const center=read('native/android/SaiEtfMarketDataCenter.kt');
const providers=read('native/android/SaiEtfAndroidMarketProviders.kt');
const nativeRuntime=read('native/android/SaiEtfMarketRuntime.kt');
const adapter=read('src/market/unifiedMarketAdapter.ts');
const runtime=read('src/market/MarketRuntime.tsx');

assert.match(nativeRuntime,/TwseMisQuoteProvider\(\)[\s\S]*YahooQuoteProvider\(\)/,
  'SaiETF native source order must remain TWSE MIS then Yahoo polling fallback');
assert.match(center,/providers\.forEach \{ provider ->[\s\S]*provider\.fetch\(pending\.toSet\(\)\)/,
  'only unresolved symbols may fall through to the next SaiETF provider');
assert.match(providers,/val price = marketNumber\(row\.optString\("z"\)\) \?: continue/,
  'TWSE MIS must require a real z trade before producing currentPrice');
assert.doesNotMatch(providers,/row\.optString\("pz"\)/,
  'TWSE pz must never be promoted to holdings currentPrice');
assert.match(providers,/class YahooQuoteProvider/);
assert.match(providers,/query1\.finance\.yahoo\.com/,
  'symbols unresolved by TWSE must be eligible for Yahoo fallback');
assert.match(adapter,/row\.quality!=='bid_ask'/,
  'bid/ask diagnostics must not become TF Asset holdings currentPrice');

assert.match(runtime,/V3_RUNTIME_STORAGE_KEY='@tf-asset\/market-runtime-v231'/,
  'V3.2.49 market settings must remain discoverable during V4 migration');
assert.match(runtime,/LEGACY_RUNTIME_STORAGE_KEY='@tf-asset\/market-runtime'/);
assert.match(runtime,/migratedFromPreviousRuntime&&legacyLive\?\.refreshSeconds===5/,
  'legacy 5-second default must migrate to the 1-second live rule');
assert.match(runtime,/live:\{enabled:true,start:'09:00',end:'13:30',refreshSeconds:1\}/);

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,app.expo.version,'package/app semantic versions must stay aligned');
assert.ok(Number(app.expo.android.versionCode)>=30218,'V3.2.18 fallback regression requires build 30218 or newer');
assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode),'iOS/Android build identities must stay aligned');
assert.equal(pkg.scripts['test:v3_2_18'],'npm run test:v3_2_17 && tsx scripts/v3_2_18-market-fallback-repair.test.ts');

console.log('V3.2.18 SaiETF native fallback + 1s migration PASS');
