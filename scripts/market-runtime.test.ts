import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');
const bridge=fs.readFileSync('src/native/TfAssetNativeBridge.ts','utf8');
const nativeModule=fs.readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const nativeRuntime=fs.readFileSync('native/android/SaiEtfMarketRuntime.kt','utf8');
const nativeCenter=fs.readFileSync('native/android/SaiEtfMarketDataCenter.kt','utf8');
const nativeProviders=fs.readFileSync('native/android/SaiEtfAndroidMarketProviders.kt','utf8');

assert.doesNotMatch(source,/marketRefreshSeconds/,'SaiETF events replace JS fixed cadence');
assert.doesNotMatch(source,/config\.live|config\.afterHours|config\.stopAll/,'retired TF scheduler cannot override SaiETF');
assert.match(source,/quotesRef/,'market refresh must use quote ref to keep callback stable');
assert.match(source,/symbolsRef/,'market refresh must use symbol ref to keep callback stable');
assert.match(source,/if\(refreshPromiseRef\.current\)\{/,'market refresh must coalesce overlapping requests');
assert.match(source,/return refreshPromiseRef\.current;/,'joined refresh callers must reuse the same in-flight promise');
assert.match(source,/refreshVisibleRef/,'a manual caller joining silent refresh must promote visible refresh state');
assert.match(source,/AsyncStorage/,'market catalog and last source time must persist');
assert.match(source,/AppState\.addEventListener/,'foreground refresh must be wired');
assert.match(source,/subscribeUnifiedMarketData\(applySnapshot\)/,'market must receive native memory events');

// V4 execution ownership: React Native is a consumer/adapter only.
assert.match(source,/refreshUnifiedMarketData/,'JS runtime must refresh through the native market bridge');
assert.match(source,/loadUnifiedMarketData/,'JS runtime must hydrate through the native market bridge');
assert.doesNotMatch(source,/new MarketDataCenter/,'JS runtime must not own a second MarketDataCenter');
assert.doesNotMatch(source,/mis\.twse\.com\.tw/,'JS runtime must not bypass the native provider boundary');
assert.match(bridge,/refreshUnifiedMarketData/);
assert.match(nativeModule,/saietfMarket\.refresh\(symbols\)/,'NativeModule must route refreshes into SaiETF runtime');

// SaiETF native core owns TWSE/Yahoo arbitration.
assert.match(nativeRuntime,/MarketDataCenter\(/);
assert.match(nativeRuntime,/TwseMisQuoteProvider\(\)/);
assert.match(nativeRuntime,/YahooQuoteProvider\(\)/);
assert.match(nativeCenter,/class MarketDataCenter/);
assert.match(nativeProviders,/mis\.twse\.com\.tw/,'SaiETF TWSE provider source must be wired');
assert.match(nativeProviders,/query1\.finance\.yahoo\.com/,'SaiETF Yahoo fallback provider must be wired');

console.log('TF_ASSET_MARKET_RUNTIME: PASS');
