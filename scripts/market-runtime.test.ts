import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');

assert.match(source,/live:\s*\{enabled:true,start:'09:00',end:'13:30',refreshSeconds:1\}/,'live UI refresh default must be 1 second');
assert.match(source,/afterHours:\s*\{enabled:true,start:'13:31',end:'18:00',refreshSeconds:60\}/,'after-hours refresh default must remain 60 seconds');
assert.match(source,/Math\.max\(1,Math\.min\(3600,/,'market refresh must support a 1-second minimum');
assert.match(source,/new MarketDataCenter\(\[twse,yahoo\]\)/,'runtime must delegate provider arbitration to MarketDataCenter');
assert.match(source,/FugleWebSocketProvider/,'runtime must wire optional Fugle streaming');
assert.match(source,/MarketPersistenceController/,'runtime must wire throttled persistence');
assert.match(source,/TaiwanSecurityCatalog/,'runtime must use full Taiwan security catalog');
assert.match(source,/if\(refreshPromiseRef\.current\)return refreshPromiseRef\.current/,'market refresh must coalesce overlapping requests');
assert.match(source,/AppState\.addEventListener/,'foreground refresh must be wired');
assert.match(source,/setInterval/,'market schedule must use one interval');
assert.doesNotMatch(source,/function fetchTwseQuotes|mis\.twse\.com\.tw/,'provider HTTP logic must not live in React runtime');

console.log('TF_ASSET_MARKET_RUNTIME: PASS');
