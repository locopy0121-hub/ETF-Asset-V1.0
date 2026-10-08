import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(path:string)=>fs.readFileSync(path,'utf8');
for(const retired of ['MarketCore.ts','MarketProviders.ts','MarketPersistence.ts','FugleWebSocketProvider.ts'])
  assert.equal(fs.existsSync('src/market/'+retired),false,retired+' must stay retired');
const runtime=read('src/market/MarketRuntime.tsx');
const bridge=read('src/native/TfAssetNativeBridge.ts');
const native=read('native/android/SaiEtfMarketRuntime.kt');
const center=read('native/android/SaiEtfMarketDataCenter.kt');
const adapter=read('src/market/unifiedMarketAdapter.ts');
const widget=read('native/android/TfAssetWidgetProvider.kt');
assert.match(runtime,/loadUnifiedMarketData\(\)/);
assert.match(runtime,/refreshUnifiedMarketData\(symbolsRef\.current\)/);
assert.match(runtime,/latestSnapshotAtRef/);
assert.match(runtime,/setTrackedSymbolsState\(current=>sameStrings\(current,normalized\)\?current:normalized\)/,'removed holdings must be unsubscribed');
assert.doesNotMatch(runtime,/backendUrl|new MarketDataCenter|new FugleWebSocketProvider|new TwseMisQuoteProvider|new YahooQuoteProvider/);
assert.doesNotMatch(bridge,/loadMarketCoreCache|persistMarketCoreCache|setMarketBackendUrl|SHIOAJI/);
assert.match(native,/@Synchronized fun refresh/,'provider polling must serialize health state');
assert.doesNotMatch(native,/@Synchronized fun snapshot/,'hot-store reads cannot wait for provider HTTP');
assert.match(native,/MarketDataCenter\([\s\S]*TwseMisQuoteProvider\(\)[\s\S]*YahooQuoteProvider\(\)/);
assert.match(center,/hotStore\.publish\(listOf\(normalized\)\)[\s\S]*pending\.remove\(symbol\)/);
assert.doesNotMatch(adapter,/SHIOAJI/);
assert.doesNotMatch(widget,/HttpURLConnection|mis\.twse|query1\.finance/);
for(const core of ['SaiEtfMarketArbitrator.kt','SaiEtfMarketModels.kt','SaiEtfMemoryMarketStore.kt'])
  assert.ok(fs.existsSync('native/android/'+core));
console.log('V4.0.8 SaiETF-only market owner / immediate hot-store bridge / no legacy JS engine or Shioaji contract PASS');
