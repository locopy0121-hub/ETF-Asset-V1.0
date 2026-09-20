const fs=require('fs');
const assert=require('assert');

const service=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');
const module=fs.readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const bridge=fs.readFileSync('src/native/TfAssetNativeBridge.ts','utf8');
const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');

for(const token of ['monitor_running','monitor_runtime_mode','monitor_runtime_x','monitor_runtime_y','monitor_runtime_width','monitor_runtime_height','monitor_last_sync_at','monitor_display_symbol']){
  assert.ok(service.includes(token),'service runtime status missing '+token);
}
assert.match(module,/getMonitorStatus/,'native module must expose monitor status');
assert.match(module,/permissionRequired/,'native status must distinguish missing overlay permission');
assert.match(bridge,/NativeMonitorStatus/,'bridge monitor status type missing');
assert.match(bridge,/getNativeMonitorStatus/,'bridge monitor status reader missing');
assert.match(settings,/Native 實際狀態/,'settings must show real native state');
assert.match(settings,/實際顯示 ETF/,'settings must show actual displayed ETF');
assert.match(settings,/實際位置/,'settings must show actual position');
assert.match(settings,/實際尺寸/,'settings must show actual size');
assert.match(settings,/最後 Native 同步/,'settings must show actual sync time');
assert.match(settings,/setInterval\(refresh,1000\)/,'settings must refresh runtime status while monitor settings are open');
assert.ok(!settings.includes('summary={monitor.config.enabled?\'已啟用\':\'未啟用\'}'),'monitor summary must not pretend config enabled equals runtime running');

console.log('V1.0.7 MONITOR RUNTIME STATUS: PASS');
