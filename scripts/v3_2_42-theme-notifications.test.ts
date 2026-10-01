import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
const [major=0,minor=0,patch=0]=String(pkg.version).split('.').map(Number);
assert.equal(major,3);
assert.equal(minor,2);
assert.ok(patch>=42,'theme/notification contract requires V3.2.42+');
const expectedCode=major*10000+minor*100+patch;
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,expectedCode);

const theme=read('src/theme/ThemeRuntime.tsx');
const labels=['經典金融','極簡清新','科技藍光','行情動能','股息收益','成長動能','牛市活力','永續綠能','AI 智慧','尊榮質感'];
for(const label of labels)assert.ok(theme.includes("label:'"+label+"'"),'theme label missing: '+label);
for(let i=1;i<=10;i++){
  const key=String(i).padStart(2,'0');
  assert.ok(existsSync('src/assets/theme/icon_'+key+'.jpg'),'preview icon missing: '+key);
  assert.ok(existsSync('src/assets/theme/background_'+key+'.jpg'),'background missing: '+key);
  assert.ok(existsSync('native/android/res/drawable/tf_theme_icon_'+key+'.jpg'),'native icon missing: '+key);
  assert.ok(theme.includes("require('../assets/theme/icon_"+key+".jpg')"),'preview icon not bound: '+key);
  assert.ok(theme.includes("require('../assets/theme/background_"+key+".jpg')"),'background not bound: '+key);
}

const injector=read('scripts/inject-v1_1_2-android.cjs');
assert.ok(injector.includes('android.permission.POST_NOTIFICATIONS'),'POST_NOTIFICATIONS manifest injection missing');
assert.ok(injector.includes('android.permission.VIBRATE'),'VIBRATE manifest injection missing');
assert.ok(injector.includes('@drawable/tf_theme_icon_${key}'),'approved ETF launcher icons not wired');

const notification=read('native/android/TfAssetNotificationCenter.kt');
for(const channel of ['tf_asset_dividend','tf_asset_market','tf_asset_updates','tf_asset_backup','tf_asset_general'])
  assert.ok(notification.includes(channel),'notification channel missing: '+channel);
for(const label of ['股息與除息','行情與價格','更新與錯誤','資料與備份','一般通知'])
  assert.ok(notification.includes(label),'notification channel label missing: '+label);
assert.ok(notification.includes('createNotificationChannelGroup'),'notification channel group missing');
assert.ok(notification.includes('postTest'),'test notification missing');

const bridge=read('src/native/TfAssetNativeBridge.ts');
for(const fn of ['ensureNativeNotificationChannels','getNativeNotificationStatus','openNativeNotificationSettings','postNativeTestNotification'])
  assert.ok(bridge.includes(fn),'native notification bridge missing: '+fn);

const settings=read('src/screens/SettingsScreen.tsx');
assert.ok(settings.includes('開啟 Android 通知設定'));
assert.ok(settings.includes('發送測試通知'));
assert.ok(settings.includes('通知頻道'));
assert.ok(settings.includes("VERSION='"+pkg.version+"'"));
assert.ok(settings.includes("BUILD='"+expectedCode+"'"));

const ci=read('.github/workflows/ci.yml');
assert.ok(ci.includes('tf_theme_icon_*.jpg'),'QA APK must package approved ETF icons');
assert.ok(ci.includes('tf_notification_small.xml'),'QA APK must package notification icon');
assert.ok(ci.includes('POST_NOTIFICATIONS'),'QA APK must validate notification permission');
console.log('V3.2.42 approved ETF theme assets + Android notification center PASS');
