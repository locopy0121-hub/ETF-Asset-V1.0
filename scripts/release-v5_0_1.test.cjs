const assert=require('node:assert/strict');
const fs=require('node:fs');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8'));
const ci=fs.readFileSync('.github/workflows/ci.yml','utf8');
const release=fs.readFileSync('.github/workflows/release-v1.yml','utf8');

assert.equal(pkg.version,'5.0.1');
assert.equal(app.expo.version,'5.0.1');
assert.equal(app.expo.android.versionCode,50001);
assert.equal(app.expo.ios.buildNumber,'50001');
assert.match(ci,/test:v5_0_1/);
assert.match(release,/TF Asset V5\.0\.1 GitHub APK/);
assert.match(release,/versionCode 50001/);
assert.match(release,/versionName "5\.0\.1"/);
assert.match(release,/TF-Asset-V5\.0\.1-github\.apk/);
console.log('TF ASSET V5.0.1 RELEASE IDENTITY: PASS');
