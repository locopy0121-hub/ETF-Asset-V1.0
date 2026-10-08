const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=file=>fs.readFileSync(file,'utf8');
const runtime=read('native/android/SaiEtfMarketRuntime.kt');
const valuation=read('src/market/marketCenterViews.ts');
const workflow=read('.github/workflows/ci.yml');
const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));

assert.match(valuation,/minutes>=540&&minutes<810/,
  'TypeScript valuation session must treat exactly 13:30 Asia\/Taipei as after-hours');
assert.match(runtime,/time\.isBefore\(LocalTime\.of\(13, 30\)\)/,
  'Android market phase must use an exclusive 13:30 close boundary');
assert.doesNotMatch(runtime,/!time\.isAfter\(LocalTime\.of\(13, 30\)\)/,
  'Android must not keep the whole 13:30 minute live');

assert.equal(pkg.version,'4.0.12');
assert.equal(app.expo.version,'4.0.12');
assert.equal(app.expo.android.versionCode,40012);
assert.equal(app.expo.ios.buildNumber,'40012');
assert.match(workflow,/TF Asset V4\.0\.12 CI \/ QA APK/);
assert.match(workflow,/TF-Asset-V4\.0\.12-QA\.apk/);
assert.match(workflow,/versionCode='40012'/);
assert.match(workflow,/versionName='4\.0\.12'/);

console.log('V4.0.12 exclusive 13:30 boundary / release identity / CI artifact contract: PASS');
