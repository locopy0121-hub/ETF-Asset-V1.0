const fs=require('fs');
const assert=require('assert');

const app=fs.readFileSync('App.tsx','utf8');
const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
const portfolio=fs.readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const dividend=fs.readFileSync('src/screens/DividendScreen.tsx','utf8');
const detail=fs.readFileSync('src/screens/HoldingDetailScreen.tsx','utf8');
const demo=fs.readFileSync('src/data/demoData.ts','utf8');
const financeRuntime=fs.readFileSync('src/finance/FinanceRuntime.tsx','utf8');
const financeSeed=fs.readFileSync('src/finance/financeSeed.ts','utf8');

assert.match(app,/FinanceProvider/,'app must mount canonical finance runtime');
for(const row of [['home',home],['portfolio',portfolio],['dividend',dividend],['detail',detail]]) {
  assert.match(row[1],/useFinance/,row[0]+' must read finance runtime');
}
assert.ok(!home.includes('DEMO_HOLDINGS'),'home must not use demo holdings');
assert.ok(!portfolio.includes('DEMO_HOLDINGS'),'portfolio must not use demo holdings');
assert.ok(!dividend.includes('DEMO_DIVIDENDS'),'dividend must not use demo dividends');
assert.ok(!demo.includes('DEMO_HOLDINGS'),'legacy demo holdings must be removed');
assert.ok(!demo.includes('DEMO_LEDGER'),'legacy demo ledger must be removed');
assert.ok(!demo.includes('DEMO_DIVIDENDS'),'legacy demo dividends must be removed');
assert.ok(!financeRuntime.includes('FALLBACK_QUOTES'),'FinanceRuntime must never consume static fallback quotes directly');
assert.ok(!financeRuntime.includes('SEED_QUOTES'),'FinanceRuntime must never consume seed quotes as market truth');
assert.match(financeSeed,/FALLBACK_QUOTES/,'static quotes must be explicitly named fallback');
console.log('TF_ASSET_FINANCE_RUNTIME: PASS');
