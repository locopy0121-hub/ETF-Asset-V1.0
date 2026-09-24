// Native integration contract only. Gradle compile + real Android Widget are independent acceptance gates.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
const receiver=read('native/android/TfAssetWidgetProvider.kt');
const bridge=read('native/android/TfAssetNativeModule.kt');
const app=read('App.tsx');
const adapter=read('src/finance/sharedSnapshotAdapter.ts');
const widgetSettings=read('src/widget/WidgetSettingsRuntime.tsx');

assert.match(receiver,/ACTION_FORCE_REFRESH/);
assert.match(receiver,/putLong\("widget_force_refresh_requested_at",System\.currentTimeMillis\(\)\)/,
  'A native Widget tap must be consumed on next App foreground');
assert.match(receiver,/putString\("wall_market_overrides",merged\.toString\(\)\)/,
  'Partial quote updates must merge with existing unsynced native overrides');
assert.match(receiver,/財務待同步/,
  'Price-only background updates must not claim current profit or market value');
assert.match(receiver,/行情更新失敗｜保留原資料/);
assert.match(receiver,/quotes\.length\(\)==symbols\.size/,
  'Partial quote coverage must remain visible');
assert.match(bridge,/verifiedQuoteAt>0L && verifiedQuoteAt>=nativeQuoteAt/,
  'Old App or startup fallback snapshots may not erase newer native quotes');
assert.match(bridge,/canonicalSnapshot\.optJSONArray\("holdings"\)/,
  'Only dated holdings quotes can prove that the App market snapshot is newer');
assert.match(bridge,/if\(canReconcile\)/);
assert.match(bridge,/edit\.remove\("wall_market_overrides"\)\.remove\("wall_market_refreshed_at"\)/);
assert.match(bridge,/行情較新｜財務待同步/);
assert.match(app,/consumeNativeWidgetForceRefreshRequest/);
assert.match(app,/market\.refresh\(\{force:true\}\)/);
assert.match(app,/syncNativeWidget\(widgetSettings\.config,finance\.sharedSnapshot\)/);
assert.match(adapter,/buildSharedSnapshot/);
assert.match(adapter,/canonical:CanonicalLedgerSnapshot/);
assert.match(widgetSettings,/sort:/);
for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md']){
  assert.ok(fs.existsSync(core),'Protected finance core remains present: '+core);
}
console.log('V2.1.14 Widget native/JS sync contract smoke PASS; native compilation and real-device freshness remain separate gates.');
