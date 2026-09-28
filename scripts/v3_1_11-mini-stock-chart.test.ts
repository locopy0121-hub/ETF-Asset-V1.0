import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

const app=JSON.parse(read('app.json'));
const pkg=JSON.parse(read('package.json'));
assert.equal(app.expo.version,'3.1.17');
assert.equal(app.expo.android.versionCode,30117);
assert.equal(app.expo.ios.buildNumber,'30117');
assert.equal(pkg.version,'3.1.17');

const domain=read('src/domain/chartEditor.ts');
assert.match(domain,/MARKET_CHART_DATA_OPTIONS/);
assert.match(domain,/HOLDING_CHART_DATA_OPTIONS/);
for(const style of ['column','price-volume','cost-price','pnl','roi'])assert.ok(domain.includes("'"+style+"'"),'missing native style '+style);

const mini=read('src/components/MiniHoldingChart.tsx');
assert.match(mini,/DOUBLE_TAP_MS=240/);
assert.match(mini,/onOpen\?\.\(\)/);
assert.match(mini,/MINI_STYLES/);
assert.match(mini,/單點開啟完整圖表，連點切換樣式/);

const quote=read('src/components/HoldingQuoteModule.tsx');
assert.match(quote,/MiniHoldingChart/);
assert.doesNotMatch(quote,/function Sparkline/);
assert.match(quote,/onOpenChart/);

const collection=read('src/components/HoldingQuoteCollection.tsx');
assert.match(collection,/onOpenChart/);

const home=read('src/screens/HomeScreen.tsx');
const portfolio=read('src/screens/PortfolioScreen.tsx');
for(const screen of [home,portfolio]){
  assert.match(screen,/onOpenChart/);
  assert.doesNotMatch(screen,/OfficialCandleChart/);
}

const chartPage=read('src/screens/StockChartScreen.tsx');
assert.match(chartPage,/專業圖表/);
assert.match(chartPage,/市場數據/);
assert.match(chartPage,/持股相關數據/);
assert.match(chartPage,/輸入 ETF／股票代號/);
assert.match(chartPage,/OfficialCandleChart/);

const appTs=read('App.tsx');
assert.match(appTs,/StockChartScreen/);
assert.match(appTs,/chartHolding/);
assert.match(appTs,/HOLDING_CHART_TAP/);

const renderer=read('src/components/OfficialCandleChart.tsx');
for(const style of ['price-volume','cost-price','pnl','roi','column'])assert.ok(renderer.includes("'"+style+"'"),'renderer missing '+style);

console.log('V3.1.17 Mini/full chart separation and stock-chart workspace regression PASS');
