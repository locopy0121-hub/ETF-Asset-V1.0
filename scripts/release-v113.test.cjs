const fs=require('fs');
const assert=require('assert');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8'));
const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');
const workflow=fs.readFileSync('.github/workflows/release-v1.yml','utf8');

assert.strictEqual(pkg.version,'1.0.13');
assert.strictEqual(app.expo.version,'1.0.13');
assert.strictEqual(app.expo.android.versionCode,10013);
assert.strictEqual(app.expo.android.package,'com.tfasset.app');
assert(settings.includes("const VERSION='1.0.13';"));
assert(settings.includes("const BUILD='10013';"));
assert(workflow.includes('1.0.13'),'release workflow identity must be V1.0.13');
assert(workflow.includes('10013'),'release workflow versionCode must be 10013');
assert(workflow.includes('npm run test:v113'),'release workflow must run V1.0.13 gates');

console.log('V1.0.13 release identity PASS');
