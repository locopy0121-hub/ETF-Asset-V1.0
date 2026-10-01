import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
const shortcuts=read('native/android/res/xml/tf_asset_shortcuts.xml');
const strings=read('native/android/res/values/tf_asset_shortcut_strings.xml');
const injector=read('scripts/inject-v1_1_2-android.cjs');
const appSource=read('App.tsx');
const ci=read('.github/workflows/ci.yml');

const [major=0,minor=0,patch=0]=String(pkg.version).split('.').map(Number);
assert.equal(major,3);
assert.equal(minor,2);
assert.ok(patch>=41,'launcher shortcuts require V3.2.41+');
const expectedCode=major*10000+minor*100+patch;
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,expectedCode);
assert.equal((shortcuts.match(/<shortcut\b/g)??[]).length,5,'must declare exactly five TF Asset launcher shortcuts');

for(const [id,label,route] of [
  ['add_buy','新增買進','buy'],
  ['floating_monitor','浮動監視器','monitor'],
  ['today_pnl','今日損益','today-pnl'],
  ['dividend_calendar','股息日曆','dividend'],
  ['ai_assistant','AI 助理','ai'],
] as const){
  assert.ok(shortcuts.includes(`android:shortcutId="${id}"`),id+' shortcut missing');
  assert.ok(shortcuts.includes(`android:data="tfasset://shortcut/${route}"`),route+' route missing');
  assert.ok(strings.includes('>'+label+'</string>'),label+' label missing');
}
assert.ok(injector.includes('android.app.shortcuts'),'launcher aliases must expose static shortcut metadata');
assert.ok(injector.includes('shortcutMetadataCount!==10'),'all ten selectable launcher aliases must carry shortcut metadata');
assert.ok(appSource.includes('resolveLauncherShortcutUrl'),'React Native must resolve launcher shortcut deep links');
for(const route of ["case 'buy'","case 'monitor'","case 'today-pnl'","case 'dividend'","case 'ai'"]){
  assert.ok(appSource.includes(route),route+' routing branch missing');
}
assert.ok(ci.includes('tf_asset_shortcuts.xml'),'QA APK must package shortcut XML');
assert.ok(ci.includes('tf_asset_shortcut_strings.xml'),'QA APK must package shortcut labels');
assert.ok(ci.includes("grep -c 'android.app.shortcuts'"),'QA APK must validate alias metadata');
assert.ok(ci.includes('tf_asset_shortcuts.xml)" = "5"'),'QA APK must validate shortcut count');
console.log('V3.2.41 Android launcher shortcuts: PASS');
