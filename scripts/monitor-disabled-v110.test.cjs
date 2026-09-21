const fs=require('fs');
const assert=require('assert');

const nativeModule=fs.readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const service=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');
const app=fs.readFileSync('App.tsx','utf8');

assert.match(nativeModule,/optBoolean\("enabled",false\)/,'native module must read persisted monitor enabled state');
assert.match(nativeModule,/if\(!enabled\)[\s\S]*stopService/,'disabled sync must stop service instead of starting refresh');
assert.match(nativeModule,/startMonitor[\s\S]*if\(!cfg\.optBoolean\("enabled",false\)\)/,'explicit start must be rejected while disabled');
assert.match(nativeModule,/stopMonitor[\s\S]*putBoolean\("monitor_running",false\)/,'stop must synchronously clear runtime running state');

const guardIndex=service.indexOf('if(!cfg.optBoolean("enabled",false))');
const ensureIndex=service.indexOf('ensureView();');
assert.ok(guardIndex>=0&&ensureIndex>guardIndex,'service enabled guard must execute before view creation/render');
assert.match(service,/removeViewImmediate/,'disabled/destroy path must remove overlay immediately');
assert.match(service,/stopSelf\(\)/,'disabled service must stop itself');
assert.match(service,/START_NOT_STICKY/,'disabled service must never remain sticky');
assert.match(app,/if\(monitorSettings\.config\.enabled\)void startNativeMonitor\(\);\s*else void stopNativeMonitor\(\);/,'React layer must retain explicit enable/disable control');

console.log('V1.0.10 MONITOR DISABLED GUARD: PASS');
