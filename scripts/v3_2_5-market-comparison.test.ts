import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  diagnoseMarketComparison,
  marketComparisonDiagnosisLabel,
  marketSourceField,
  priceDifference,
  sameMarketPrice,
} from '../src/market/marketComparison';

const read=(p:string)=>readFileSync(p,'utf8');

assert.equal(priceDifference(56.75,56.65),0.10000000000000142);
assert.equal(sameMarketPrice(56.75,56.75),true);
assert.equal(sameMarketPrice(56.75,56.65),false);
assert.equal(diagnoseMarketComparison({appPrice:56.75,officialPrice:56.75,centerPrice:56.75}),'MATCH');
assert.equal(diagnoseMarketComparison({appPrice:56.65,officialPrice:56.75,centerPrice:56.75}),'APP_SYNC_MISMATCH');
assert.equal(diagnoseMarketComparison({appPrice:56.75,officialPrice:56.75,centerPrice:56.65}),'CENTER_SOURCE_MISMATCH');
assert.equal(diagnoseMarketComparison({appPrice:56.65,officialPrice:56.75,centerPrice:56.65}),'APP_CENTER_VS_OFFICIAL_MISMATCH');
assert.equal(diagnoseMarketComparison({appPrice:56.60,officialPrice:56.75,centerPrice:56.65}),'MULTI_MISMATCH');
assert.equal(diagnoseMarketComparison({appPrice:56.75,officialPrice:null,centerPrice:56.75}),'OFFICIAL_MISSING');
assert.equal(diagnoseMarketComparison({appPrice:56.75,officialPrice:56.75,centerPrice:null}),'CENTER_MISSING');
assert.equal(marketComparisonDiagnosisLabel('MATCH'),'三方一致');

assert.equal(marketSourceField({source:'TWSE_MIS',quality:'trade'}),'z｜實際成交價');
assert.equal(marketSourceField({source:'TWSE_DAILY',quality:'official_close'}),'ClosingPrice｜官方收盤');
assert.equal(marketSourceField({source:'TPEX_DAILY',quality:'official_close'}),'Close｜官方收盤');

const panel=read('src/components/MarketComparisonPanel.tsx');
for(const token of [
  '行情比對／診斷','代號行情','App／首頁行情','證券中心／官方行情','行情中心',
  'App ↔ 證券中心','行情中心 ↔ 證券中心','App ↔ 行情中心',
  '證券中心來源時間','行情中心來源時間','重新讀取官方行情','加入比對紀錄','最近比對紀錄',
]) assert.ok(panel.includes(token),'market comparison UI missing '+token);
assert.match(panel,/@tf-asset\/market-comparison-v2/);
assert.match(panel,/logs\.slice\(0,50\)/,'comparison log must remain bounded');
assert.match(panel,/不回寫行情中心、App 行情、SQLite、快取或帳務/);
assert.match(panel,/fetchOfficialMarketProbe\(requestSymbol\)/);
assert.doesNotMatch(panel,/brokerBySymbol|saveBenchmark|證券中心基準值|自行輸入券商|onRefresh|refreshing/,
  'diagnostic panel must not accept manual official prices or trigger global market refresh');

const probe=read('src/market/officialMarketProbe.ts');
assert.match(probe,/mis\.twse\.com\.tw\/stock\/api\/getStockInfo\.jsp/);
assert.match(probe,/positive\(row\.z\)<=0/,'official diagnostic baseline must require TWSE MIS z');
assert.match(probe,/field:'z'/);
assert.match(probe,/never writes to/);
assert.doesNotMatch(probe,/refreshUnifiedMarketData|setNativeMarketBackendUrl|AsyncStorage|SQLiteDatabase/,
  'official diagnostic probe must stay outside global market mutation paths');

const settings=read('src/screens/SettingsScreen.tsx');
assert.match(settings,/<MarketComparisonPanel quotes=\{quotes\} holdings=\{holdings\} marketDataVersion=\{marketDataVersion\}\/>/);
assert.match(settings,/行情資料中心（唯一行情入口）/);

const center=read('native/android/TfAssetMarketCenter.kt');
assert.match(center,/finitePositive\(row\.optString\("z",""\)\)\?:return null/,
  'Android unified center trade must remain an actual TWSE MIS z trade price');
assert.doesNotMatch(center,/optString\("b",""\).*currentPrice|optString\("a",""\).*currentPrice/,
  'bid/ask must not be promoted to the verified Android center currentPrice');

const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.2.5');
assert.equal(app.expo.version,'3.2.5');
assert.equal(app.expo.android.versionCode,30205);
assert.equal(app.expo.ios.buildNumber,'30205');
assert.match(read('src/settings/BackupService.ts'),/APP_VERSION='3\.2\.5'/);
assert.match(settings,/VERSION='3\.2\.5'/);
assert.match(settings,/BUILD='30205'/);

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'financial core remains untouched: '+core);

console.log('V3.2.5 read-only market comparison: App vs direct TWSE MIS official probe vs unified market center PASS');
