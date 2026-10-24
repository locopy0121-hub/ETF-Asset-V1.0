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

  const models=read('native/android/SaiEtfMarketModels.kt');
  const arbitrator=read('native/android/SaiEtfMarketArbitrator.kt');
  const breaker=read('native/android/SaiEtfProviderCircuitBreaker.kt');
  const nativeRuntime=read('native/android/SaiEtfMarketRuntime.kt');
  const fugle=read('native/android/SaiEtfFugleWebSocketProvider.kt');
  const providers=read('native/android/SaiEtfAndroidMarketProviders.kt');

  assert.match(models,/FUGLE[\s\S]*TWSE_MIS[\s\S]*YAHOO[\s\S]*CACHE/);
  assert.doesNotMatch(models,/SHIOAJI/,'retired Shioaji must not be an active SaiETF provider in TF Asset V4');
  assert.match(arbitrator,/MarketSource\.FUGLE to 0/);
  assert.match(arbitrator,/MarketSource\.TWSE_MIS to 1/);
  assert.match(arbitrator,/MarketSource\.YAHOO to 2/);
  assert.match(arbitrator,/MarketSource\.CACHE to 3/);
  assert.match(breaker,/class ProviderCircuitBreaker/);
  assert.match(breaker,/failureThreshold: Int = 2/);
  assert.match(breaker,/RECOVERING/);
  assert.match(nativeRuntime,/TwseMisQuoteProvider\(\)[\s\S]*YahooQuoteProvider\(\)/);
  assert.match(nativeRuntime,/FugleWebSocketProvider/);
  assert.match(fugle,/wss:\/\/api\.fugle\.tw\/marketdata\/v1\.0\/stock\/streaming/);
  assert.match(providers,/mis\.twse\.com\.tw/);
  assert.match(providers,/query1\.finance\.yahoo\.com/);

  // ETF NAV analysis remains available, but quote execution ownership is native SaiETF Market Core.
  const nav=read('server/src/nav.mjs');
  assert.match(nav,/TWSE_MIS_ETF_NAV/);
  assert.match(nav,/premiumDiscountPercent/);
  assert.match(nav,/marketPrice-nav\.estimatedNav/);
  assert.match(nav,/nav\.estimatedNav\)\*100/);

  const contract=read('src/market/marketQuoteContract.ts');
  for(const field of ['symbol','price','change','changePercent','volume','source','isRealtime'])
    assert.ok(contract.includes(field),'MarketQuote field missing: '+field);

  for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
    assert.ok(read(core).length>0,'immutable finance core missing: '+core);

  console.log('V3.2.36 SaiETF native multi-source market / ETF NAV / circuit breaker PASS');
}

main();
