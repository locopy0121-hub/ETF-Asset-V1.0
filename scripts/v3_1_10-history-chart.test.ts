import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isValidHistorySymbol,normalizeHistorySymbol} from '../src/market/twseDailyHistory';
import {CHART_DATA_OPTIONS,normalizeHoldingChart} from '../src/domain/chartEditor';
import {mergeDisplayState} from '../src/editor/editorModel';

assert.equal(normalizeHistorySymbol(' 009816 '),'009816');
assert.equal(isValidHistorySymbol('009816'),true,'six-digit ETF must pass historical symbol validation');
assert.equal(isValidHistorySymbol('00406A'),true,'alphanumeric ETF remains supported');
assert.equal(isValidHistorySymbol('@@9816'),false);

const keys=CHART_DATA_OPTIONS.map(item=>item.key);
for(const required of ['price','change','changePct','cost','pnl','comprehensivePnl','roi','marketValue'])
  assert.ok(keys.includes(required as never),'missing holding chart data option '+required);
const normalized=normalizeHoldingChart({style:'area',range:'6月',dataKeys:['close','pnl','changePct','cost'],crosshairEnabled:false,costLineEnabled:true});
assert.equal(normalized.style,'area');
assert.equal(normalized.range,'6月');
assert.deepEqual(normalized.dataKeys,['close','pnl','changePct','cost']);
assert.equal(normalized.crosshairEnabled,false);
const display=mergeDisplayState({portfolio:{holdingChart:normalized}});
assert.equal(display.portfolio.holdingChart?.range,'6月');
assert.ok(display.portfolio.holdingChart?.dataKeys.includes('pnl'));

const history=readFileSync('src/market/twseDailyHistory.ts','utf8');
const detail=readFileSync('src/screens/HoldingDetailScreen.tsx','utf8');
const chart=readFileSync('src/components/OfficialCandleChart.tsx','utf8');
const home=readFileSync('src/screens/HomeScreen.tsx','utf8');
const maintenance=readFileSync('src/maintenance/MaintenanceWorkbench.tsx','utf8');
const skills=readFileSync('src/maintenance/skillTree.ts','utf8');

assert.match(history,/\^\[0-9A-Z\]\{4,8\}\$/);
assert.match(history,/rwd\/zh\/afterTrading\/STOCK_DAY/);
assert.match(history,/for\(let offset=0;offset<months;offset\+\+\)/);
assert.match(detail,/CHART_DATA_OPTIONS\.map/);
assert.doesNotMatch(detail,/CHART_DATA_OPTIONS\.filter/);
assert.match(detail,/holding=\{\{shares:holding\.shares,costAvg:holding\.costAvg/);
assert.match(chart,/TWSE 歷史資料源/);
assert.match(chart,/secondaryKey=.*'pnl'/);
assert.match(chart,/持股損益估值/);
assert.match(home,/<PortfolioQuickBar firstMode=\{homeFirstMode\}/);
assert.doesNotMatch(home,/<SegmentedControl/);
assert.match(home,/HoldingQuoteCollection rows=\{sorted\}/,'Home holding content renderer must remain unchanged');
assert.match(maintenance,/HoldingChartEditor/);
assert.match(maintenance,/持股歷史圖表/);
assert.match(maintenance,/if\(key==='list'\).*PortfolioListEditor/s);
assert.match(skills,/list-settings','頁面設定：庫存清單／持股圖表','page:list'/);

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const app=JSON.parse(readFileSync('app.json','utf8'));
assert.equal(pkg.version,'3.1.18');
assert.equal(app.expo.version,'3.1.18');
assert.equal(app.expo.android.versionCode,30118);
assert.equal(app.expo.ios.buildNumber,'30118');
console.log('V3.1.18 historical source, 009816, holding PnL chart editor, Home shared icon quickbar: PASS');
