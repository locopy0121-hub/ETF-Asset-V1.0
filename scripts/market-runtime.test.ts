import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');
const bridge=fs.readFileSync('src/native/TfAssetNativeBridge.ts','utf8');
const nativeModule=fs.readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const nativeRuntime=fs.readFileSync('native/android/SaiEtfMarketRuntime.kt','utf8');

assert.match(source,/live:\s*\{\s*enabled:\s*true,\s*start:\s*'09:00',\s*end:\s*'13:30',\s*refreshSeconds:\s*1\s*\}/,'live refresh default must remain 1 second');
assert.match(source,/afterHours:\s*\{\s*enabled:\s*true,\s*start:\s*'13:31',\s*end:\s*'18:00',\s*refreshSeconds:\s*60\s*\}/,'after-hours refresh default must remain 60 seconds');
assert.match(source,/Math\.max\(1,Math\.min\(3600,/,'market refresh must support a 1-second minimum');
assert.match(source,/phase==='live'\?clampSeconds\(config\.live\.refreshSeconds\):phase==='afterHours'\?clampSeconds\(config\.afterHours\.refreshSeconds\):0/,'market refresh interval must follow phase config and return 0 offline');
assert.match(source,/quotesRef/,'market refresh must use quote ref to keep callback stable');
assert.match(source,/symbolsRef/,'market refresh must use symbol ref to keep callback stable');
assert.match(source,/if\(refreshPromiseRef\.current\)\{/,'market refresh must coalesce overlapping requests');
assert.match(source,/return refreshPromiseRef\.current;/,'joined refresh callers must reuse the same in-flight promise');
assert.match(source,/refreshVisibleRef/,'a manual caller joining silent refresh must promote visible refresh state');
assert.match(source,/AsyncStorage/,'market config and quote cache must persist');
assert.match(source,/AppState\.addEventListener/,'foreground refresh must be wired');
assert.match(source,/setInterval\(tick,1000\)/,'market scheduler must heartbeat every second and re-evaluate market phase');
assert.match(source,/refreshUnifiedMarketData/,'JS runtime must refresh through the native SaiETF market bridge');
assert.match(source,/loadUnifiedMarketData/,'JS runtime must hydrate from the native SaiETF market bridge');
assert.doesNotMatch(source,/new MarketDataCenter/,'JS runtime must not own a second MarketDataCenter');
assert.doesNotMatch(source,/new FugleWebSocketProvider/,'JS runtime must not own a second Fugle websocket');
assert.doesNotMatch(source,/mis\.twse\.com\.tw/,'JS runtime must not bypass the native market boundary');
assert.match(nativeModule,/SaiEtfMarketRuntime/,'native bridge must host the SaiETF market runtime');
assert.match(nativeModule,/saietfMarket\.refresh\(symbols\)/,'native refresh must delegate to SaiETF market runtime');
assert.match(nativeRuntime,/MarketDataCenter\(/,'SaiETF native runtime must own MarketDataCenter');
assert.match(nativeRuntime,/TwseMisQuoteProvider\(\)/,'SaiETF native runtime must own TWSE provider');
assert.match(nativeRuntime,/YahooQuoteProvider\(\)/,'SaiETF native runtime must own Yahoo provider');
assert.match(nativeRuntime,/FugleWebSocketProvider/,'SaiETF native runtime must own Fugle streaming provider');
assert.match(bridge,/marketCore\?:'SAIETF_NATIVE'/,'bridge snapshot contract must identify SaiETF native core');

console.log('TF_ASSET_MARKET_RUNTIME: PASS');
