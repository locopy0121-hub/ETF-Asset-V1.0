// Supplement the compiled runtime and owner behavior tests with module wiring checks.
const assert=require('node:assert/strict'),fs=require('node:fs');
const runtime=fs.readFileSync('native/android/SaiEtfMarketRuntime.kt','utf8');
// V5.0.32 intentionally uses cache-only reads when the market is closed or the phone is locked.
assert.match(runtime,/if \(!TfAssetMarketSchedule\.allows\(appContext\)\) return snapshot\(symbols\)/);
assert.match(runtime,/persistenceController\.setActive\(false\)/);
assert.match(runtime,/scope\.launch \{ persistenceController\.flushNow\(\) \}/);
assert.match(runtime,/settledVersion=refresh\(trackedSymbols\)\.getLong\("version"\)/);
const moduleSource=fs.readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const persist=moduleSource.slice(moduleSource.indexOf('private fun persistSurfaceSnapshot'),moduleSource.indexOf('private fun refreshBackgroundMonitor'));
assert.ok(persist.indexOf('acceptsSurfaceSnapshot')<persist.indexOf('acknowledgeSurface'),'Rejected price versions cannot acknowledge final surface');
assert.match(persist,/acknowledgeSurface\(reactContext,incoming\.optLong\("marketDataVersion",0L\)\)/);
const ci=fs.readFileSync('.github/workflows/ci.yml','utf8');
const pkg=require('../package.json');
assert.match(pkg.scripts['test:v5_0_2'],/npm run test:v4_0_65/);
assert.match(pkg.scripts['test:v5_0_3'],/npm run test:v5_0_2/);
assert.match(ci,/npm run test:v5_0_3/);
assert.ok(/^5\.0\.\d+$/.test(pkg.version)&&Number(pkg.version.split('.')[2])>=3);
assert.equal(require('../app.json').expo.android.versionCode,50000+Number(pkg.version.split('.')[2]));
console.log('V4.0.58 close reconciliation / persistence / accepted surface ACK / release wiring PASS');
