const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8');

for(const path of [
  'src/screens/HomeScreen.tsx',
  'src/screens/LedgerScreen.tsx',
  'src/screens/PortfolioScreen.tsx',
  'src/screens/DividendScreen.tsx',
  'src/screens/HoldingDetailScreen.tsx',
]){
  assert.doesNotMatch(read(path),/3\.7\.8/i,path+' still exposes obsolete 3.7.8 labeling');
}
const settings=read('src/screens/SettingsScreen.tsx');
assert.match(settings,/const VERSION='1\.1\.3'/,'Settings must report current V1.1.3');
assert.match(settings,/summary="V1\.1\.3 [^"]+"/,'current update summary must be V1.1.3');
assert.match(settings,/Panel title="V1\.1\.3 更新資訊"/,'current update panel must be V1.1.3');
assert.doesNotMatch(settings,/summary="V1\.1\.2 /,'V1.1.2 must not be presented as the current update');
assert.doesNotMatch(settings,/Panel title="V1\.1\.2 更新資訊"/,'V1.1.2 must not be presented as the current update panel');

assert.ok(fs.existsSync('scripts/finance-ledger-v378.test.ts'),'V3.7.8 golden ledger regression must remain');
assert.ok(fs.existsSync('scripts/calculator-v378.test.ts'),'V3.7.8 calculator regression must remain');
console.log('V1.1.3 user-visible version cleanup: PASS');
