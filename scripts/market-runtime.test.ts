import assert from 'node:assert/strict';
import fs from 'node:fs';

import { DEFAULT_MARKET_UPDATE, marketRefreshSeconds } from '../src/market/MarketRuntime';

assert.equal(marketRefreshSeconds(DEFAULT_MARKET_UPDATE,'live'),5);
assert.equal(marketRefreshSeconds({...DEFAULT_MARKET_UPDATE,live:{...DEFAULT_MARKET_UPDATE.live,refreshSeconds:1}},'live'),1);
assert.equal(marketRefreshSeconds(DEFAULT_MARKET_UPDATE,'afterHours'),60);
assert.equal(marketRefreshSeconds(DEFAULT_MARKET_UPDATE,'offline'),0);

const source=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');
assert.match(source,/quotesRef/,'market refresh must use quote ref to keep callback stable');
assert.match(source,/symbolsRef/,'market refresh must use symbol ref to keep callback stable');
assert.match(source,/if\(refreshingRef\.current\)return/,'market refresh must prevent overlapping requests');
assert.match(source,/AsyncStorage/,'market config and quote cache must persist');
assert.match(source,/AppState\.addEventListener/,'foreground refresh must be wired');
assert.match(source,/setInterval/,'market schedule must use one interval');
assert.match(source,/mis\.twse\.com\.tw/,'TWSE runtime source must be wired');

console.log('TF_ASSET_MARKET_RUNTIME: PASS');
