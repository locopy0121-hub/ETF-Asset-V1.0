const fs=require('node:fs'),assert=require('node:assert/strict');
const native=fs.readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const monitor=native.slice(native.indexOf('@ReactMethod fun syncMonitor'),native.indexOf('@ReactMethod fun requestWidgetRefresh'));
assert.match(monitor,/TfAssetOverlayService\.requestRefresh\(\)/,'an already visible Monitor must enqueue a coalesced render, not another service intent per quote');
const overlay=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');
assert.match(overlay,/LatestSurfaceRenderQueue/);
assert.match(overlay,/renderQueue\.close\(\)/);
console.log('V4.0.55 Monitor render wiring smoke PASS; compiled queue overload tests are separate');
