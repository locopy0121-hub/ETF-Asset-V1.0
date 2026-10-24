import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveTwsePriceDecision} from '../src/market/twseQuoteParser';

const bidOnly={c:'0050',d:'20261002',t:'12:15:00',z:'-',pz:'112.55',b:'112.55_',a:'112.60_',y:'112.90'};
assert.equal(resolveTwsePriceDecision(bidOnly),null,'bid/ask/pz cannot drive holdings currentPrice');

const trade={...bidOnly,z:'112.75'};
assert.equal(resolveTwsePriceDecision(trade)?.price,112.75);
assert.equal(resolveTwsePriceDecision(trade)?.quality,'trade');

const providers=fs.readFileSync('native/android/SaiEtfAndroidMarketProviders.kt','utf8');
const arbitrator=fs.readFileSync('native/android/SaiEtfMarketArbitrator.kt','utf8');
const runtime=fs.readFileSync('native/android/SaiEtfMarketRuntime.kt','utf8');
assert.match(providers,/val price = marketNumber\(row\.optString\("z"\)\) \?: continue/,
  'SaiETF TWSE provider must publish only actual z trades');
assert.doesNotMatch(providers,/row\.optString\("pz"\)/);
assert.doesNotMatch(providers,/row\.optString\("b"\)/);
assert.doesNotMatch(providers,/row\.optString\("a"\)/);
assert.match(providers,/class YahooQuoteProvider/,'Yahoo must remain the polling fallback when TWSE has no z trade');
assert.match(runtime,/TwseMisQuoteProvider\(\)[\s\S]*YahooQuoteProvider\(\)/);
assert.match(arbitrator,/REJECT_OLDER_SESSION/);
assert.match(arbitrator,/REJECT_OLDER_TIMESTAMP/);
assert.match(arbitrator,/REJECT_OUT_OF_ORDER_SEQUENCE/);

const db=fs.readFileSync('native/android/TfAssetMarketDatabase.kt','utf8');
assert.match(db,/tf_asset_market_center_v1\.db",null,9/);
assert.match(db,/db\.delete\("market_quotes","quality=\?",arrayOf\("bid_ask"\)\)/);

const adapter=fs.readFileSync('src/market/unifiedMarketAdapter.ts','utf8');
assert.match(adapter,/row\.quality!=='bid_ask'/);
assert.match(adapter,/row\.source==='TWSE_MIS'&&row\.quality==='backup_realtime'/);

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8'));
const [major=0,minor=0,patch=0]=String(pkg.version).split('.').map(Number);
assert.ok(major>3||(major===3&&(minor>2||(minor===2&&patch>=49))),'must remain a descendant of V3.2.49');
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,major*10000+minor*100+patch);
assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode));

for(const locked of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(fs.existsSync(locked),locked);

console.log('V3.2.49 SaiETF native trade-price synchronization gate PASS');
