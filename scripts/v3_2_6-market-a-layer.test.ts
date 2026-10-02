import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveTwsePriceDecision} from '../src/market/twseQuoteParser';
import {marketSourceField} from '../src/market/marketComparison';

const read=(p:string)=>readFileSync(p,'utf8');

const fallback=resolveTwsePriceDecision({z:'-',pz:'9.86',y:'9.80',b:'9.85_',a:'9.87_'});
assert.equal(fallback,null,'TWSE non-trade fields are diagnostics only; Yahoo handles trade-like fallback');
assert.equal(resolveTwsePriceDecision({z:'-',pz:'9.86',y:'9.80'}),null,
  'pz/previous-close only must stay unresolved instead of becoming currentPrice');
assert.equal(marketSourceField({source:'TWSE_MIS',quality:'trade'}),'z｜實際成交價');

const probe=read('src/market/officialMarketProbe.ts');
assert.match(probe,/price=positive\(selected\.z\)\|\|null/,'diagnostic official truth must remain z-only');
assert.match(probe,/field:'z'/);
assert.doesNotMatch(probe,/resolveTwsePriceDecision|YAHOO|BACKUP_REALTIME/,
  'official diagnostic probe must stay isolated from effective-price fallback');

const serverParser=read('server/src/parser.mjs');
for(const token of ['misNormalizedQuote','yahooQuoteFromChart','officialTradePrice','BACKUP_REALTIME','PREV_CLOSE'])
  assert.ok(serverParser.includes(token),'server A-layer missing '+token);
const serverSources=read('server/src/sources.mjs');
assert.match(serverSources,/query1\.finance\.yahoo\.com\/v8\/finance\/chart/);
assert.match(serverSources,/misNormalizedQuote/);
assert.match(serverSources,/this\.yahoo\(symbol,now\)/);

const nativeCenter=read('native/android/TfAssetMarketCenter.kt');
for(const token of ['misQuote','yahooQuote','officialTradePrice','priceType','isFallback','qualityRank'])
  assert.ok(nativeCenter.includes(token),'native A-layer missing '+token);
assert.match(nativeCenter,/YAHOO_URL/);
assert.doesNotMatch(nativeCenter,/val pz=finitePositive\(row\.optString\("pz"/);
assert.match(nativeCenter,/previous_close/);

const nativeDb=read('native/android/TfAssetMarketDatabase.kt');
assert.match(nativeDb,/tf_asset_market_center_v1\.db",null,\d+/,'market SQLite schema must remain versioned without touching the Ledger');
assert.match(nativeDb,/market_intraday[\s\S]*previous_close/,'intraday schema must retain the displayed session previous-close baseline');
for(const token of ['backup_realtime','bid_ask','previous_close','official_trade_price','price_type','is_fallback'])
  assert.ok(nativeDb.includes(token),'native B schema missing '+token);

const bridge=read('src/native/TfAssetNativeBridge.ts');
for(const source of ['TWSE_MIS','FUGLE','SHIOAJI','YAHOO','TWSE_DAILY','TPEX_DAILY'])
  assert.ok(bridge.includes(`'${source}'`),'native bridge missing market source '+source);
assert.match(bridge,/priceType:'REALTIME_TRADE'\|'BACKUP_REALTIME'\|'BID_ASK'\|'PREV_CLOSE'\|'OFFICIAL_CLOSE'/);

const panel=read('src/components/MarketComparisonPanel.tsx');
for(const token of ['行情中心價格型態','行情中心 Fallback','行情中心說明','證券中心原始欄位（唯讀）'])
  assert.ok(panel.includes(token),'diagnostic provenance UI missing '+token);

const app=JSON.parse(read('app.json')),pkg=JSON.parse(read('package.json'));
assert.match(pkg.version,/^3\.2\.[1-9]\d*$/);
assert.equal(app.expo.version,pkg.version);
assert.ok(Number.isInteger(app.expo.android.versionCode)&&app.expo.android.versionCode>0);
assert.equal(String(app.expo.ios.buildNumber),String(app.expo.android.versionCode));
assert.ok(read('src/settings/BackupService.ts').includes("APP_VERSION='"+pkg.version+"'"));
assert.ok(read('src/screens/SettingsScreen.tsx').includes("VERSION='"+pkg.version+"'"));
assert.ok(read('src/screens/SettingsScreen.tsx').includes("BUILD='"+String(app.expo.android.versionCode)+"'"));

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'finance core missing: '+core);
assert.doesNotMatch(nativeCenter,/canonicalLedger|actual_fee|actual_tax/);
assert.doesNotMatch(serverParser,/canonicalLedger|actual_fee|actual_tax/);

console.log('V3.2.11 A→B normalized market fallback / Yahoo failover / z-truth separation PASS');
