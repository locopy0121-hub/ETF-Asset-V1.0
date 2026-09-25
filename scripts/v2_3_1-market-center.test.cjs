const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const read=path=>fs.readFileSync(path,'utf8');
const blob=path=>{
  const bytes=fs.readFileSync(path);
  return crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
};
const locked={
  'src/finance/canonicalLedger.ts':'84324138ec2e56a655e0ceacaed3ee541ba7f5c6',
  'src/utils/etfCalculators.ts':'6f31ce33eaa140340c274adaa936c97641d418f2',
  'docs/finance/CORE_LOCK.md':'7865dab714d9dbe266d98f99f116778acef9c3f4',
};
for(const [path,expected] of Object.entries(locked))
  assert.equal(blob(path),expected,'Locked finance file differs from V2.1.20 backup: '+path);
const app=JSON.parse(read('app.json')),pkg=JSON.parse(read('package.json'));
assert.ok(/^2\.3\.[123456]$/.test(pkg.version),'Expected V2.3.1–V2.3.6 continuation');
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,20300+Number(pkg.version.split('.')[2]));
assert.equal(app.expo.android.package,'com.tfasset.app');
const market=read('src/market/MarketRuntime.tsx');
const db=read('native/android/TfAssetMarketDatabase.kt');
const center=read('native/android/TfAssetMarketCenter.kt');
const widget=read('native/android/TfAssetWidgetProvider.kt');
const monitor=read('native/android/TfAssetOverlayService.kt');
const shared=read('native/android/TfAssetMarketPresentation.kt');
const server=read('server/src/index.mjs');
assert.match(db,/tf_asset_market_center_v1\.db/);
assert.match(db,/db\.beginTransaction\(\)/);
assert.match(db,/source_at INTEGER/);
assert.match(center,/remoteSnapshot\(backend,symbols,now\)/);
assert.match(center,/TPEX_DAILY/);
assert.match(center,/TWSE_DAILY/);
assert.match(center,/quality","official_close"/);
assert.doesNotMatch(widget,/getStockInfo\.jsp/,'Widget cannot fetch independently');
assert.match(widget,/TfAssetMarketPresentation\.decorate\(context,snapshot\)/);
assert.match(monitor,/TfAssetMarketPresentation\.decorate\(this,/);
assert.match(shared,/marketDataVersion/);
assert.match(shared,/valuationComplete/);
assert.match(market,/marketRowsToRuntimeQuotes\(state,quotesRef\.current\)/);
assert.match(market,/new WebSocket/);
assert.match(server,/market:changed/);
assert.match(read('server/src/store.mjs'),/FOR UPDATE/);
assert.match(read('server/src/sources.mjs'),/dailyCacheMs/);
assert.match(read('server/src/parser.mjs'),/MIS/); // source provenance is never a bid/ask proxy
assert.match(read('native/android/TfAssetNativeModule.kt'),/Intent\.ACTION_CREATE_DOCUMENT/);
assert.match(read('native/android/TfAssetNativeModule.kt'),/Intent\.ACTION_OPEN_DOCUMENT/);
assert.match(read('src/settings/BackupService.ts'),/recordVerifiedExternalBackup/);
assert.match(read('src/settings/backupDocumentFormat.ts'),/TF_LEDGER_KEY/);
assert.match(read('src/screens/SettingsScreen.tsx'),/本輪暫停危險清除/);
assert.ok(read('src/screens/SettingsScreen.tsx').includes("const VERSION='"+pkg.version+"'"),'Settings build version must match package');
console.log('V2.3.1 identity + locked finance blob equality + single Android data-center architecture + external SAF backup guards: PASS');
