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

assert.match(pkg.version,/^4\.0\.\d+$/);
assert.ok(Number(pkg.version.split('.')[2])>=12);
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,40000+Number(pkg.version.split('.')[2]));
assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode));
assert.ok(workflow.includes(`TF Asset V${pkg.version} CI / QA APK`));
assert.ok(workflow.includes(`TF-Asset-V${pkg.version}-QA.apk`));
assert.ok(workflow.includes(`versionCode='${app.expo.android.versionCode}'`));
assert.ok(workflow.includes(`versionName='${pkg.version}'`));

console.log('V4.0.12 exclusive 13:30 boundary / release identity / CI artifact contract: PASS');
