const fs=require('fs');
const assert=require('assert');

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8'));
const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');
const ci=fs.readFileSync('.github/workflows/ci.yml','utf8');
const release=fs.readFileSync('.github/workflows/release-v1.yml','utf8');

assert.equal(pkg.version,'1.0.15');
assert.equal(app.expo.version,'1.0.15');
assert.equal(app.expo.android.versionCode,10015);
assert.equal(app.expo.android.package,'com.tfasset.app');
assert.match(settings,/const VERSION='1\.0\.15';/);
assert.match(settings,/const BUILD='10015';/);
assert.match(ci,/V1\.0\.15 Hard Gates/);
assert.match(ci,/npm run test:v115/);
assert.match(release,/TF Asset V1\.0\.15 GitHub APK/);
assert.match(release,/Freeze V1\.0\.15 identity/);
assert.match(release,/versionCode 10015/);
assert.match(release,/versionName "1\.0\.15"/);
assert.match(release,/npm run test:v115/);
assert.match(release,/TF-Asset-V1\.0\.15-github\.apk/);
assert.ok(!/eas\s+build/i.test(release),'APK release workflow must remain GitHub-only');

console.log('V1.0.15 RELEASE IDENTITY: PASS');
