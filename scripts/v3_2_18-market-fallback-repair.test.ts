import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');

const native=read('native/android/TfAssetMarketCenter.kt');
const views=read('src/market/marketCenterViews.ts');
const finance=read('src/finance/FinanceRuntime.tsx');
const models=read('src/domain/uiModels.ts');
const runtime=read('src/market/MarketRuntime.tsx');

assert.match(native,/val realtimeCovered=candidates\.filter\{[\s\S]*?backup_realtime[\s\S]*?val needsRealtime=symbols\.filterNot/,
  'low-quality MIS rows must not block realtime fallback');
assert.match(native,/for\(symbol in needsRealtime\)[\s\S]*?yahooQuote\(symbol,now\)/,
  'symbols lacking realtime quality must attempt Yahoo backup realtime');
assert.match(views,/VALUATION_QUALITIES=new Set\(\['trade','backup_realtime','bid_ask','previous_close','official_close'\]\)/,
  'verified bid/ask must remain usable as indicative valuation');
assert.match(finance,/case 'bid_ask':/);
assert.match(models,/quoteQuality\?: 'trade'\|'backup_realtime'\|'bid_ask'/);
assert.match(runtime,/legacyLive\.refreshSeconds===5\?\{\.\.\.legacyLive,refreshSeconds:1\}:legacyLive/,
  'legacy 5-second default must migrate to the 1-second live rule');

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,app.expo.version,'package/app semantic versions must stay aligned');
assert.ok(Number(app.expo.android.versionCode)>=30218,'V3.2.18 fallback regression requires build 30218 or newer');
assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode),'iOS/Android build identities must stay aligned');
assert.equal(pkg.scripts['test:v3_2_18'],'npm run test:v3_2_17 && tsx scripts/v3_2_18-market-fallback-repair.test.ts');

console.log('V3.2.18 market fallback + indicative valuation + 1s migration PASS');
