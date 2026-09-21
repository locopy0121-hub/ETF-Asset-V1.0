const fs=require('fs');
const assert=require('assert');

const nativeModule=fs.readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const service=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');
const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');

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
assert.match(settings,/label="立即啟動 Monitor"[\s\S]*startNativeMonitor\(\)/,'React layer must retain explicit Monitor start control');
assert.match(settings,/label="停止 Monitor"[\s\S]*stopNativeMonitor\(\)/,'React layer must retain explicit Monitor stop control');

console.log('V1.0.10 MONITOR DISABLED GUARD: PASS');
