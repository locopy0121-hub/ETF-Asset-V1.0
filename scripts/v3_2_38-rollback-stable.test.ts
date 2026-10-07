import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

function main(){
  const pkg=JSON.parse(read('package.json')) as {version:string};
  const app=JSON.parse(read('app.json')) as {expo:{version:string;android:{versionCode:number};ios:{buildNumber:string}}};
  const [major=0,minor=0,patch=0]=String(pkg.version).split('.').map(Number);
  assert.ok(major>3||(major===3&&(minor>2||(minor===2&&patch>=38))),'V3.2.38 rollback contract must survive later versions');
  assert.equal(app.expo.version,pkg.version);
  assert.equal(app.expo.android.versionCode,major*10000+minor*100+patch);
  assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode));

  // This release is intentionally the V3.2.36 known-good behavior with a new identity.
  const sources=read('server/src/sources.mjs');
  assert.match(sources,/SOURCE_PRIORITY=\{TWSE_MIS:10,FUGLE:11,SHIOAJI:20,YAHOO:30,TWSE_DAILY:40,TPEX_DAILY:41\}/);
  assert.doesNotMatch(sources,/FugleStream/);
  assert.doesNotMatch(sources,/FUGLE_STREAM/);
  assert.doesNotMatch(sources,/wss:\/\/api\.fugle\.tw\/marketdata\/v1\.0\/stock\/streaming/);

  const jobs=read('server/src/jobs.mjs');
  assert.match(jobs,/pollSeconds=1/);
  assert.doesNotMatch(jobs,/this\.sources\.start\?\.\(/);
  assert.doesNotMatch(jobs,/this\.sources\.stop\?\.\(/);

  const ai=read('src/ai/aiAssistant.ts');
  assert.ok(ai.length>0,'AI assistant must remain present from known-good baseline');

  const settings=read('src/screens/SettingsScreen.tsx');
  assert.ok(settings.includes("const VERSION='"+pkg.version+"'"));
  assert.match(settings,/const BUILD='30238'/);

  const backup=read('src/settings/BackupService.ts');
  assert.ok(backup.includes("const APP_VERSION='"+pkg.version+"'"));

  for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
    assert.ok(read(core).length>0,'immutable finance core missing: '+core);

  console.log('V3.2.38 rollback-to-V3.2.36 behavior with upgraded release identity PASS');
}
main();
