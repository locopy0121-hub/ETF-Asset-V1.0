// Native integration contract only. Real Android device background behavior remains separate QA.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const receiver=read('native/android/TfAssetWidgetProvider.kt');
const bridge=read('native/android/TfAssetNativeModule.kt');
const marketCenter=read('native/android/TfAssetMarketCenter.kt');
const marketDb=read('native/android/TfAssetMarketDatabase.kt');
const presentation=read('native/android/TfAssetMarketPresentation.kt');
const overlay=read('native/android/TfAssetOverlayService.kt');
const app=read('App.tsx');
const adapter=read('src/finance/sharedSnapshotAdapter.ts');
const widgetSettings=read('src/widget/WidgetSettingsRuntime.tsx');

assert.match(receiver,/ACTION_FORCE_REFRESH/);
assert.match(receiver,/putLong\("widget_force_refresh_requested_at",System\.currentTimeMillis\(\)\)/,
  'Widget tap must be consumable on App foreground');
assert.match(receiver,/TfAssetMarketCenter\(context\)\.refresh\(symbols\)/,
  'Widget tap must refresh the SAME market repository as all React screens');
assert.doesNotMatch(receiver,/getStockInfo\.jsp|wall_market_overrides/,
  'Widget must not carry a second direct API client or competing quote cache');
assert.match(receiver,/TfAssetMarketPresentation\.decorate\(context,snapshot\)/,
  'Widget must read market SQLite version and finance snapshot through shared adapter');
assert.match(receiver,/missing\.length\(\)>0/,'Missing individual symbols must not hide partial coverage');
assert.match(receiver,/財務按 App 快照同步/,'Background price change cannot recalculate Ledger PnL');
assert.match(receiver,/行情資料中心查詢失敗｜保留已驗證資料/);
assert.match(marketDb,/db\.beginTransaction\(\)/,'Partial official quotes must commit atomically');
assert.match(marketDb,/source_at INTEGER/,'per-symbol official source time persists in SQLite');
assert.match(marketCenter,/fun refresh\(requested:Collection<String>\)/);
assert.match(presentation,/marketDataVersion/,'Finance snapshot must prove it consumed same market version');
assert.match(presentation,/!synchronized/,'Unsynced native financial metrics must be masked');
assert.match(overlay,/TfAssetMarketPresentation\.decorate\(this,/,
  'Monitor and Widget must render the same native source and version');
assert.match(bridge,/refreshUnifiedMarketData/);
assert.match(bridge,/readUnifiedMarketData/);
assert.match(app,/consumeNativeWidgetForceRefreshRequest/);
assert.match(app,/market\.refresh\(\{force:true\}\)/);
assert.match(app,/syncNativeWidget\(widgetSettings\.config,finance\.sharedSnapshot\)/);
assert.match(adapter,/buildSharedSnapshot/);
assert.match(adapter,/canonical:CanonicalLedgerSnapshot/);
assert.match(widgetSettings,/sort:/);
for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md']){
  assert.ok(fs.existsSync(core),'Protected finance core remains present: '+core);
}
console.log('V2.3.1 Widget/Monitor single SQLite official-source + canonical finance safety contract PASS; Android device pending');
