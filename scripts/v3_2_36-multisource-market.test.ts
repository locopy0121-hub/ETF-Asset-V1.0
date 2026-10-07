import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

function main(){
  const pkg=JSON.parse(read('package.json')) as {version:string;scripts:Record<string,string>};
  const app=JSON.parse(read('app.json')) as {expo:{version:string;android:{versionCode:number}}};
  const [major=0,minor=0,patch=0]=pkg.version.split('.').map(Number);
  assert.ok(major>3||(major===3&&(minor>2||(minor===2&&patch>=36))),
    'multi-source market gate requires V3.2.36 or later');
  assert.equal(app.expo.version,pkg.version);
  assert.equal(app.expo.android.versionCode,major*10000+minor*100+patch);

  const sources=read('server/src/sources.mjs');
  assert.match(sources,/TWSE_MIS/);
  assert.match(sources,/FUGLE/);
  assert.match(sources,/YAHOO/);
  assert.match(sources,/CircuitBreaker/);
  assert.match(sources,/QUALITY_RANK/);

  const parser=read('server/src/parser.mjs');
  assert.match(parser,/fugleQuoteFromPayload/);
  assert.match(parser,/epochLikeToMs/);
  assert.match(parser,/lastTrade\?\.price\?\?payload\?\.closePrice/);
  assert.doesNotMatch(parser,/lastTrial\?\.price\?\?payload\?\.closePrice/,
    'trial price must never be promoted ahead of an actual Fugle trade');

  const nav=read('server/src/nav.mjs');
  assert.match(nav,/TWSE_MIS_ETF_NAV/);
  assert.match(nav,/premiumDiscountPercent/);
  assert.match(nav,/marketPrice-nav\.estimatedNav/);
  assert.match(nav,/nav\.estimatedNav\)\*100/);
  assert.match(nav,/cacheMs=15_000/);

  const sqlite=read('native/android/TfAssetMarketDatabase.kt');
  assert.match(sqlite,/null,[6-9]\d*/,'market SQLite schema may advance beyond V6 for verified quote migrations');
  assert.match(sqlite,/market_core_snapshots/);
  assert.match(sqlite,/market_core_minute_candles/);

  const models=read('native/android/SaiEtfMarketModels.kt');
  const arbitrator=read('native/android/SaiEtfMarketArbitrator.kt');
  const center=read('native/android/SaiEtfMarketDataCenter.kt');
  const runtime=read('native/android/SaiEtfMarketRuntime.kt');
  assert.match(models,/FUGLE[\s\S]*TWSE_MIS[\s\S]*YAHOO[\s\S]*CACHE/);
  assert.match(arbitrator,/MarketSource\.FUGLE to 0/);
  assert.match(arbitrator,/MarketSource\.TWSE_MIS to 1/);
  assert.match(arbitrator,/MarketSource\.YAHOO to 2/);
  assert.match(arbitrator,/MarketSource\.CACHE to 3/);
  assert.match(center,/ProviderCircuitBreaker/);
  assert.match(center,/backoffFor/);
  assert.match(center,/httpStatusCode == 429/);
  assert.match(center,/httpStatusCode == 403/);
  assert.doesNotMatch(runtime,/Shioaji/i,
    'SaiETF Android runtime must not require a brokerage account/API');

  const contract=read('src/market/marketQuoteContract.ts');
  for(const field of ['symbol','price','change','changePercent','volume','source','isRealtime'])
    assert.ok(contract.includes(field),'MarketQuote field missing: '+field);

  for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
    assert.ok(read(core).length>0,'immutable finance core missing: '+core);

  console.log('V3.2.36/V4 SaiETF multi-source market / ETF NAV / circuit breaker PASS');
}

main();
