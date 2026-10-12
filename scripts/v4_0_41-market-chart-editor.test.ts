import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');
const app=JSON.parse(read('app.json')).expo,pkg=JSON.parse(read('package.json'));
const market=read('src/screens/MarketResearchScreen.tsx');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const chart=read('src/components/OfficialCandleChart.tsx');
assert.ok(Number(pkg.version.split('.')[2])>=41,'V4.0.41 chart editor remains supported');
assert.equal(app.version,pkg.version);
const build=Number(pkg.version.split('.')[0])*10000+Number(pkg.version.split('.')[1])*100+Number(pkg.version.split('.')[2]);
assert.equal(app.android.versionCode,build);
assert.equal(app.ios.buildNumber,String(build));
assert.ok(read('src/settings/BackupService.ts').includes("APP_VERSION='"+pkg.version+"'"));
for(const id of ['market:chart:tabs','market:chart:intraday','market:chart:period',
  'market:chart:range','market:chart:style','market:chart:history','market:chart:signals']){
  assert.ok(market.includes('id="'+id+'"'),'missing chart surface target '+id);
}
for(const id of ['market:chart:title','market:chart:hint']){
  assert.ok(market.includes('id="'+id+'"'),'missing chart text target '+id);
}
assert.match(market,/market:chart:indicator:/);
assert.match(market,/MarketPreviewActionGuard><OfficialCandleChart/);
assert.match(market,/MarketPreviewActionGuard><ChartStyleDropdown/);
assert.match(market,/MarketPreviewActionGuard><ChartPeriodDropdown/);
assert.match(workbench,/id:'market:chart:history'/);
assert.match(workbench,/id:'market:chart:indicator:MA5:value'/);
assert.match(workbench,/\['market-index','market-search','market-summary','market-chart'(?:,'market-details')?\]\.includes\(item\.key\)/);
// Existing chart zoom/pan/crosshair engine remains functional and intact.
assert.match(chart,/onPress=\{\(\)=>applyZoom\(stepChartZoom\(zoom,1\)\)\}/);
assert.match(chart,/onPress=\{\(\)=>applyZoom\(stepChartZoom\(zoom,-1\)\)\}/);
assert.match(chart,/onTouchMove=/);
assert.match(chart,/onScroll=\{event=>\{scrollX\.current=/);
assert.match(chart,/crosshairEnabled/);
assert.doesNotMatch(read('src/finance/FinanceRuntime.tsx'),/market:chart:/);
assert.match(read('src/screens/SettingsScreen.tsx'),/駐點維護工程師｜全局總開關/);
console.log('V4.0.41 live market chart editor surfaces, UI controls and zoom/pan isolation PASS');
