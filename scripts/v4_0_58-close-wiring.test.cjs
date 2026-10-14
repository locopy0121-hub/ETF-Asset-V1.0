// Supplement the compiled runtime and owner behavior tests with module wiring checks.
const assert=require('node:assert/strict'),fs=require('node:fs');
const runtime=fs.readFileSync('native/android/SaiEtfMarketRuntime.kt','utf8');
assert.match(runtime,/if \(!TfAssetMarketSchedule\.allows\(appContext\)\) \{\s*if\(closeReconciler\.reconcile/);
assert.match(runtime,/runBlocking \{ persistenceController\.flushNow\(\) \}/);
assert.match(runtime,/settledVersion=refresh\(trackedSymbols\)\.getLong\("version"\)/);
const moduleSource=fs.readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const persist=moduleSource.slice(moduleSource.indexOf('private fun persistSurfaceSnapshot'),moduleSource.indexOf('private fun refreshBackgroundMonitor'));
assert.ok(persist.indexOf('acceptsSurfaceSnapshot')<persist.indexOf('acknowledgeSurface'),'Rejected price versions cannot acknowledge final surface');
assert.match(persist,/acknowledgeSurface\(reactContext,incoming\.optLong\("marketDataVersion",0L\)\)/);
const ci=fs.readFileSync('.github/workflows/ci.yml','utf8');
assert.match(ci,/npm run test:v4_0_58/);
assert.equal(require('../package.json').version,'4.0.58');
assert.equal(require('../app.json').expo.android.versionCode,40058);
console.log('V4.0.58 close reconciliation / persistence / accepted surface ACK / release wiring PASS');
