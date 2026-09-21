import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');

assert.match(source,/live:\s*\{\s*enabled:\s*true,\s*start:\s*'09:00',\s*end:\s*'13:30',\s*refreshSeconds:\s*5\s*\}/,'live refresh default must remain 5 seconds');
assert.match(source,/afterHours:\s*\{\s*enabled:\s*true,\s*start:\s*'13:31',\s*end:\s*'18:00',\s*refreshSeconds:\s*60\s*\}/,'after-hours refresh default must remain 60 seconds');
assert.match(source,/Math\.max\(1,Math\.min\(3600,/,'market refresh must support a 1-second minimum');
assert.match(source,/phase==='live'\?clampSeconds\(config\.live\.refreshSeconds\):phase==='afterHours'\?clampSeconds\(config\.afterHours\.refreshSeconds\):0/,'market refresh interval must follow phase config and return 0 offline');
assert.match(source,/quotesRef/,'market refresh must use quote ref to keep callback stable');
assert.match(source,/symbolsRef/,'market refresh must use symbol ref to keep callback stable');
assert.match(source,/if\(refreshPromiseRef\.current\)return refreshPromiseRef\.current/,'market refresh must coalesce overlapping requests');
assert.match(source,/AsyncStorage/,'market config and quote cache must persist');
assert.match(source,/AppState\.addEventListener/,'foreground refresh must be wired');
assert.match(source,/setInterval/,'market schedule must use one interval');
assert.match(source,/mis\.twse\.com\.tw/,'TWSE runtime source must be wired');

console.log('TF_ASSET_MARKET_RUNTIME: PASS');
