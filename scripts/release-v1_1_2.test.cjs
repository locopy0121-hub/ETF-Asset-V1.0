const fs=require('fs');const assert=require('assert');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8'));
const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');
const backup=fs.readFileSync('src/settings/BackupService.ts','utf8');
const workflow=fs.readFileSync('.github/workflows/release-v1.yml','utf8');

assert.equal(pkg.version,'1.1.2');
assert.equal(app.expo.version,'1.1.2');
assert.equal(app.expo.android.versionCode,10102);
assert.equal(app.expo.android.package,'com.tfasset.app');
assert.match(settings,/const VERSION='1\.1\.2'/);
assert.match(settings,/const BUILD='10102'/);
assert.match(backup,/const APP_VERSION='1\.1\.2'/);
assert.equal(typeof pkg.scripts['test:v1_1_2'],'string');
assert.match(workflow,/TF Asset V1\.1\.2 GitHub APK/);
assert.match(workflow,/test:v1_1_2/);
assert.match(workflow,/versionCode 10102/);
assert.match(workflow,/versionName "1\.1\.2"/);
assert.match(workflow,/TF-Asset-V1\.1\.2-github\.apk/);
assert.match(workflow,/TF-Asset-V1\.1\.2-GitHub-APK/);
assert.match(workflow,/tf_icon_\*\.xml/);
assert.match(workflow,/activity-alias/);
assert.match(workflow,/Icon01/);
assert.match(workflow,/Icon10/);
assert.ok(!/eas build|eas submit|expo eas/i.test(workflow),'Release workflow must stay GitHub/native build only');
for(const locked of ['src/utils/etfCalculators.ts','src/finance/canonicalLedger.ts','docs/finance/CORE_LOCK.md'])assert(fs.existsSync(locked),locked+' must remain present');

console.log('V1.1.2 release identity and GitHub APK gate: PASS');
