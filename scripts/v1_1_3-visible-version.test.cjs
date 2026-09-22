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
assert.ok(fs.existsSync('scripts/finance-ledger-v378.test.ts'),'V3.7.8 golden ledger regression must remain');
assert.ok(fs.existsSync('scripts/calculator-v378.test.ts'),'V3.7.8 calculator regression must remain');
console.log('V1.1.3 user-visible version cleanup: PASS');
