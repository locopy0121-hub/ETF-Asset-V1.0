import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_RELEASE_NOTES} from '../src/settings/appReleaseNotes';
const read=(file:string)=>readFileSync(file,'utf8');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json')).expo;
const screen=read('src/screens/SettingsScreen.tsx'),ci=read('.github/workflows/ci.yml');
assert.equal(APP_RELEASE_NOTES.version,pkg.version,'release note version must equal actual installed version');
assert.equal(APP_RELEASE_NOTES.version,app.version);
assert.equal(APP_RELEASE_NOTES.androidVersionCode,app.android.versionCode);
assert.equal(app.ios.buildNumber,String(app.android.versionCode));
assert.match(screen,new RegExp("const VERSION='"+pkg.version.replaceAll('.','\\.')+"'"));
assert.ok(screen.includes("const BUILD='"+app.android.versionCode+"'"));
assert.ok(screen.includes("APP_RELEASE_NOTES.changes.map("),'version and updates sections must render same structured content');
assert.equal(screen.split('APP_RELEASE_NOTES.changes.map(').length-1,2,'both existing settings panels show latest changes');
assert.ok(screen.includes("<Panel title={'V'+VERSION+' 更新資訊'}>"),'updates header must follow installed version');
assert.ok(!screen.includes('V3.2.49 更新資訊'),'static old notes cannot survive');
assert.ok(APP_RELEASE_NOTES.headline.trim().length>=4);
assert.ok(APP_RELEASE_NOTES.changes.length>=1,'release notes must include real changes');
for(const item of APP_RELEASE_NOTES.changes){
  assert.ok(item.id.trim().length>2);
  assert.ok(item.title.trim().length>4);
  assert.ok(item.detail.trim().length>16);
  assert.doesNotMatch(item.title+' '+item.detail,/TODO|TBD|placeholder|待填寫/i);
}
assert.match(APP_RELEASE_NOTES.notice,/QA|真機/,'QA state and device limits must be explicit');
assert.ok(ci.includes('TF-Asset-V'+pkg.version+'-QA.apk'));
assert.ok(read('Work_Project_Rules.md').includes('## 27. App 版本資訊必須逐版顯示真實更新說明'));
console.log('V5.0.21 release notes version synchronization, protected panels, meaningful details PASS');
