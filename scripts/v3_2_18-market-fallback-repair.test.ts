import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');

const providers=read('native/android/SaiEtfAndroidMarketProviders.kt');
const center=read('native/android/SaiEtfMarketDataCenter.kt');
const nativeRuntime=read('native/android/SaiEtfMarketRuntime.kt');
const views=read('src/market/marketCenterViews.ts');
const finance=read('src/finance/FinanceRuntime.tsx');
const models=read('src/domain/uiModels.ts');
const runtime=read('src/market/MarketRuntime.tsx');

assert.match(providers,/marketNumber\(row\.optString\("z"\)\) \?: continue/,
  'TWSE non-trade rows must stay unresolved so fallback can continue');
assert.match(center,/val pending = requested\.toMutableSet\(\)[\s\S]*?providers\.forEach \{ provider ->/,
  'SaiETF MarketDataCenter must carry unresolved symbols across providers');
assert.match(nativeRuntime,/TwseMisQuoteProvider\(\)[\s\S]*YahooQuoteProvider\(\)/,
  'Yahoo must remain the polling fallback after TWSE MIS');
assert.match(views,/VALUATION_QUALITIES=new Set\(\['trade','backup_realtime','bid_ask','previous_close','official_close'\]\)/,
  'verified bid/ask must remain usable as indicative valuation where legacy UI supports it');
assert.match(finance,/case 'bid_ask':/);
assert.match(models,/quoteQuality\?: 'trade'\|'backup_realtime'\|'bid_ask'/);
assert.match(runtime,/live:\{enabled:true,start:'09:00',end:'13:30',refreshSeconds:1\}/,
  'V4 live scheduler default must remain 1 second');
assert.doesNotMatch(runtime,/new MarketDataCenter\(/,
  'React runtime must not recreate the quote engine');

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,app.expo.version,'package/app semantic versions must stay aligned');
assert.ok(Number(app.expo.android.versionCode)>=30218,'V3.2.18 fallback regression requires build 30218 or newer');
assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode),'iOS/Android build identities must stay aligned');
assert.equal(pkg.scripts['test:v3_2_18'],'npm run test:v3_2_17 && tsx scripts/v3_2_18-market-fallback-repair.test.ts');

console.log('V3.2.18/V4 SaiETF fallback + indicative valuation + 1s scheduling PASS');
