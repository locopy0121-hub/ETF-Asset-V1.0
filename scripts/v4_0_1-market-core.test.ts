import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const runtime=read('src/market/MarketRuntime.tsx');
const bridge=read('src/native/TfAssetNativeBridge.ts');
const nativeModule=read('native/android/TfAssetNativeModule.kt');
const nativeDb=read('native/android/TfAssetMarketDatabase.kt');
const nativeRuntime=read('native/android/SaiEtfMarketRuntime.kt');
const center=read('native/android/SaiEtfMarketDataCenter.kt');
const models=read('native/android/SaiEtfMarketModels.kt');
const arbitrator=read('native/android/SaiEtfMarketArbitrator.kt');
const breaker=read('native/android/SaiEtfProviderCircuitBreaker.kt');
const memory=read('native/android/SaiEtfMemoryMarketStore.kt');
const providerV2=read('native/android/SaiEtfMarketDataProviderV2.kt');
const providers=read('native/android/SaiEtfAndroidMarketProviders.kt');
const fugle=read('native/android/SaiEtfFugleWebSocketProvider.kt');
const fugleController=read('native/android/SaiEtfFugleStreamingController.kt');
const persistence=read('native/android/SaiEtfMarketPersistenceRepository.kt');
const persistenceController=read('native/android/SaiEtfMarketPersistenceController.kt');
const catalog=read('src/market/TaiwanSecurityCatalog.ts');
const ledgerScreen=read('src/screens/LedgerScreen.tsx');
const portfolioScreen=read('src/screens/PortfolioScreen.tsx');
const pkg=JSON.parse(read('package.json')) as {version:string};
const app=JSON.parse(read('app.json')) as {expo:{version:string;android:{versionCode:number}}};

assert.ok(/^4\.0\.\d+$/.test(pkg.version));
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,40000+Number(pkg.version.split('.')[2]));

// JS is now an adapter/consumer only. It must not instantiate another quote engine.
assert.match(runtime,/refreshUnifiedMarketData/);
assert.match(runtime,/loadUnifiedMarketData/);
assert.match(runtime,/marketRowsToRuntimeQuotes/);
assert.doesNotMatch(runtime,/new MarketDataCenter/,'JS must not own a second MarketDataCenter');
assert.doesNotMatch(runtime,/new FugleWebSocketProvider/,'JS must not own a second Fugle websocket');
assert.doesNotMatch(runtime,/new TwseMisQuoteProvider/,'JS must not own a second TWSE provider');
assert.doesNotMatch(runtime,/new YahooQuoteProvider/,'JS must not own a second Yahoo provider');
assert.doesNotMatch(runtime,/new MarketPersistenceRepository/,'JS must not own a second market persistence engine');
assert.match(runtime,/@tf-asset\/v4-market-runtime/,'V4 settings migration must remain available');

// Imported SaiETF native Market Core must be present as the execution owner.
assert.match(models,/enum class MarketSource/);
assert.match(models,/FUGLE[\s\S]*TWSE_MIS[\s\S]*YAHOO[\s\S]*CACHE/);
assert.match(center,/class MarketDataCenter/);
assert.match(center,/private val hotStore: MemoryMarketStore/);
assert.match(center,/private val arbitrator: MarketArbitrator/);
assert.match(center,/ProviderCircuitBreaker/);
assert.match(center,/acceptStreamingQuote/);
assert.match(arbitrator,/MarketSource\.FUGLE to 0/);
assert.match(arbitrator,/MarketSource\.TWSE_MIS to 1/);
assert.match(arbitrator,/MarketSource\.YAHOO to 2/);
assert.match(arbitrator,/MarketSource\.CACHE to 3/);
assert.match(breaker,/class ProviderCircuitBreaker/);
assert.match(breaker,/RECOVERING/);
assert.match(memory,/class MemoryMarketStore/);
assert.match(memory,/MutableStateFlow/);
assert.match(providerV2,/interface MarketDataProvider/);
assert.match(providerV2,/STREAM/);
assert.match(providerV2,/POLL/);

assert.match(providers,/class TwseMisQuoteProvider/);
assert.match(providers,/class YahooQuoteProvider/);
assert.match(providers,/mis\.twse\.com\.tw/);
assert.match(providers,/query1\.finance\.yahoo\.com/);
assert.match(fugle,/wss:\/\/api\.fugle\.tw\/marketdata\/v1\.0\/stock\/streaming/);
assert.match(fugle,/TRADE_CHANNEL = "trades"/);
assert.match(fugle,/scheduleReconnect/);
assert.match(fugleController,/marketDataCenter\.acceptStreamingQuote/);

assert.match(nativeRuntime,/MarketDataCenter\(/);
assert.match(nativeRuntime,/TwseMisQuoteProvider\(\)/);
assert.match(nativeRuntime,/YahooQuoteProvider\(\)/);
assert.match(nativeRuntime,/FugleWebSocketProvider/);
assert.match(nativeRuntime,/FugleStreamingController/);
assert.match(nativeRuntime,/MarketPersistenceController/);
assert.match(nativeRuntime,/SAIETF_NATIVE/);
assert.match(persistenceController,/PERSIST_INTERVAL_MILLIS = 5_000L/);
assert.match(persistence,/TfAssetMarketDatabase/,'SaiETF persistence adapter must use TF Asset market-only SQLite');
assert.doesNotMatch(persistence,/Ledger|ledger/,'market persistence must never touch TF Asset ledger');

assert.match(nativeModule,/SaiEtfMarketRuntime/);
assert.match(nativeModule,/saietfMarket\.refresh\(symbols\)/);
assert.match(nativeModule,/saietfMarket\.snapshot\(symbols\)/);
assert.match(nativeModule,/saietfMarket\.saveFugleKey/);
assert.match(bridge,/marketCore\?:'SAIETF_NATIVE'/);

assert.match(catalog,/STOCK_DAY_ALL/);
assert.match(catalog,/tpex_mainboard_quotes/);
assert.match(catalog,/t187ap03_L/);
assert.match(catalog,/mopsfin_t187ap03_O/);
assert.doesNotMatch(catalog,/const validSymbol=.*\^00/,'Taiwan catalog must include stocks as well as ETFs');

assert.match(nativeDb,/tf_asset_market_center_v1\.db",null,9/);
assert.match(nativeDb,/market_core_snapshots/);
assert.match(nativeDb,/market_core_minute_candles/);
assert.match(nativeDb,/market_quotes/);
assert.match(nativeDb,/market_intraday/);

assert.doesNotMatch(ledgerScreen,/3\.7\.8/);
assert.doesNotMatch(portfolioScreen,/3\.7\.8/);

console.log('TF ASSET V4.0.1 SAIETF NATIVE MARKET CORE MIGRATION: PASS');
