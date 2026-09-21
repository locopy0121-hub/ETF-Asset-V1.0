const fs=require('fs');const assert=require('assert');
const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
const collection=fs.readFileSync('src/components/HoldingQuoteCollection.tsx','utf8');
const finance=fs.readFileSync('src/finance/FinanceRuntime.tsx','utf8');
const market=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');

assert.match(home,/market\.refresh\(\{force:true\}\)/,'manual update must force market refresh');
assert.match(home,/sortHoldingQuotes\(finance\.holdings,sortKey,true\)/,'home wall must sort current finance holdings');
assert.ok(!/sorted\.slice\(/.test(home),'home wall must not truncate holdings');
for(const mode of ['list','grid2','grid3','horizontal','paged2'])assert.ok(home.includes(mode),'layout mode missing '+mode);
assert.match(collection,/rows\.map\(/,'collection must render every row');
assert.match(finance,/ensureLedgerQuoteCoverage\(entries,market\.quotes\)/,'finance snapshot must consume current market quotes');
assert.match(finance,/\[snapshot,market\.quotes\]/,'holding cards must recompute when market quotes change');
assert.match(market,/setQuotes\(result\.quotes\)/,'successful refresh must publish quotes');
assert.match(market,/setLastSuccessAt\(Date\.now\(\)\)/,'successful refresh must publish refresh time');
assert.match(market,/updatedCount<=0/,'refresh must reject empty quote responses instead of pretending success');
assert.match(market,/refreshPromiseRef/,'refresh must dedupe concurrent refreshes');
console.log('V1.0.19 market wall runtime linkage gate: PASS');
