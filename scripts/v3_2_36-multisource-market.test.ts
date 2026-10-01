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
  assert.match(sources,/SHIOAJI/);
  assert.match(sources,/YAHOO/);
  assert.match(sources,/CircuitBreaker/);
  assert.match(sources,/breakerThreshold=3/);
  assert.match(sources,/breakerCooldownMs=5\*60_000/);
  assert.match(sources,/QUALITY_RANK/);

  const parser=read('server/src/parser.mjs');
  assert.match(parser,/fugleQuoteFromPayload/);
  assert.match(parser,/shioajiQuoteFromPayload/);
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

  const http=read('server/src/http.mjs');
  assert.match(http,/\/v1\/market\/nav/);
  assert.match(http,/sources:typeof sources\?\.health/);

  const sqlite=read('native/android/TfAssetMarketDatabase.kt');
  assert.match(sqlite,/null,6/);
  assert.match(sqlite,/FUGLE/);
  assert.match(sqlite,/SHIOAJI/);
  assert.match(sqlite,/market_quotes_v5/);

  const nativeCenter=read('native/android/TfAssetMarketCenter.kt');
  assert.match(nativeCenter,/setOf\("TWSE_MIS","FUGLE","SHIOAJI","YAHOO","TWSE_DAILY","TPEX_DAILY"\)/);

  const contract=read('src/market/marketQuoteContract.ts');
  for(const field of ['symbol','price','change','changePercent','volume','source','isRealtime'])
    assert.ok(contract.includes(field),'MarketQuote field missing: '+field);

  for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
    assert.ok(read(core).length>0,'immutable finance core missing: '+core);

  console.log('V3.2.36 multi-source market aggregator / ETF NAV / circuit breaker PASS');
}

main();
