import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p:string)=>fs.readFileSync(p,'utf8');
const db=read('native/android/TfAssetMarketDatabase.kt');
const panel=read('src/components/MarketComparisonPanel.tsx');
const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));

assert.match(db,/if\(newRank<oldRank\)\{[\s\S]*?continue/,
  'a newer lower-quality quote must not replace stronger SQLite last-known-good data');
assert.match(db,/if\(at==existing\.first&&newRank<=oldRank\)/,
  'same-timestamp equal/lower quality must remain non-destructive');
assert.match(panel,/官方 ↔ SQLite 來源時差/);
assert.match(panel,/同步判定/);
assert.match(panel,/officialLag<=2000\?'同步':'SQLite 待追上'/);
assert.match(panel,/setInterval\(\(\)=>setClock\(Date\.now\(\)\),1000\)/);

assert.ok(pkg.version.startsWith('3.2.') && Number(pkg.version.split('.')[2])>=20,'V3.2.20 no-downgrade contract must survive later versions');
assert.equal(app.expo.version,pkg.version);
const expectedCode=30200+Number(pkg.version.split('.')[2]);
assert.equal(app.expo.android.versionCode,expectedCode);
assert.equal(app.expo.ios.buildNumber,String(expectedCode));
assert.equal(pkg.scripts['test:v3_2_20'],'npm run test:v3_2_19 && tsx scripts/v3_2_20-live-freshness-stability.test.ts');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.20 live freshness + no quality downgrade PASS');
