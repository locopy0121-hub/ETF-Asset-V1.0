const assert=require('node:assert/strict');
const fs=require('node:fs');

const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');
const runtime=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');
const persistence=fs.readFileSync('native/android/SaiEtfMarketPersistenceController.kt','utf8');
const db=fs.readFileSync('native/android/TfAssetMarketDatabase.kt','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('app.json','utf8'));

assert.equal(pkg.version,'5.0.2');
assert.equal(manifest.expo.version,'5.0.2');
assert.equal(manifest.expo.android.versionCode,50002);

assert.match(home,/title="資產管家"/,'V4.0.65 home presentation must be preserved');
assert.match(home,/DashboardAssetOverview/);
assert.match(home,/DashboardProfitAnalysis/);
assert.match(home,/DashboardQuickActions/);
assert.match(home,/WatchlistPanel/);
assert.match(home,/wallSource/);
assert.doesNotMatch(home,/所有資產與損益來自 V3\.7\.8 Finance Core/,'legacy V3.7.8 dashboard subtitle must not return');

assert.match(app,/MarketResearchScreen/,'V4.0.65 market page must remain wired');
assert.match(runtime,/subscribeUnifiedMarketData/,'native live push path must remain');
assert.doesNotMatch(runtime,/setInterval\s*\(/,'legacy seconds REST polling must not return');
assert.match(runtime,/setTrackedSymbolsState\(current=>sameStrings\(current,normalized\)\?current:normalized\)/,'tracked symbols must remain replaceable');
assert.match(persistence,/persistedVersions/,'market persistence must persist only changed quotes');
assert.match(persistence,/writes\.withLock/,'market persistence must remain single-flight');
assert.match(db,/loadMarketCoreSnapshots\(\)/,'cold start must support snapshot-only hydration');

console.log('TF ASSET V5.0.2 V4.0.65 UI LINEAGE: PASS');
