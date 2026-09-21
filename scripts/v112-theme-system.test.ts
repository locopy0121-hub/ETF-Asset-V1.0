import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const runtime=readFileSync('src/theme/ThemeRuntime.tsx','utf8');
const settings=readFileSync('src/screens/SettingsScreen.tsx','utf8');
const app=readFileSync('App.tsx','utf8');
const shell=readFileSync('src/components/PageShell.tsx','utf8');
const nativeBridge=readFileSync('src/native/TfAssetNativeBridge.ts','utf8');
const nativeModule=readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const workflow=readFileSync('.github/workflows/ci.yml','utf8');

const themeIds=['finance-blue','deep-sea','forest','sunrise','amethyst','glacier','mist','copper','neon','black-gold'];
for(const id of themeIds)assert.match(runtime,new RegExp("id:'"+id+"'"),'missing theme '+id);
for(let i=1;i<=10;i++){
  const id=String(i).padStart(2,'0');
  assert.match(runtime,new RegExp("id:'icon-"+id+"'"),'missing icon option '+id);
  assert.match(runtime,new RegExp("id:'bg-"+id+"'"),'missing builtin background '+id);
  assert.ok(existsSync('native/android/res/drawable/tf_asset_icon_'+id+'.xml'),'missing native launcher icon '+id);
}
assert.match(runtime,/\[1,2,3,4,5\]\.map/,'theme system must keep five custom slots');
assert.match(runtime,/fit:'fill'/);
assert.match(settings,/主題系統/);
assert.match(settings,/10 張內建背景/);
assert.match(settings,/適寬/);
assert.match(settings,/適高/);
assert.match(settings,/填滿/);
assert.match(settings,/背景透明度/);
assert.match(settings,/背景模糊/);
assert.match(settings,/背景遮罩/);
assert.match(settings,/5 組自訂主題儲存/);
assert.match(settings,/選擇自訂背景圖片/);
assert.match(app,/ThemeRuntimeProvider/);
assert.match(shell,/ThemeBackdrop/);
assert.match(nativeBridge,/setNativeAppIcon/);
assert.match(nativeBridge,/pickNativeThemeBackgroundImage/);
assert.match(nativeModule,/setAppIcon/);
assert.match(nativeModule,/ACTION_OPEN_DOCUMENT/);
assert.match(nativeModule,/takePersistableUriPermission/);
assert.match(workflow,/MainActivityIcon01/);
assert.match(workflow,/tf_asset_icon_\*\.xml/);

console.log('v1.1.2 theme system PASS');
