const fs=require('fs');const assert=require('assert');
const wall=fs.readFileSync('src/components/HoldingMarketWallEditor.tsx','utf8');
const modal=fs.readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
const ai=fs.readFileSync('src/screens/AiScreen.tsx','utf8');
const dividend=fs.readFileSync('src/screens/DividendScreen.tsx','utf8');
const model=fs.readFileSync('src/editor/editorModel.ts','utf8');
const floating=fs.readFileSync('src/components/FloatingDashboardChart.tsx','utf8');
const question=fs.readFileSync('src/components/AiQuestionBox.tsx','utf8');

assert.match(wall,/新建主體行情牆工具/);
assert.ok(!wall.includes('miniSource'),'main market wall editor must not depend on Mini runtime');
assert.ok(!wall.includes('copyMini'),'main market wall must not copy Mini');
assert.ok(!wall.includes('複製 Mini 設定至主體行情牆'),'old Mini-copy action must be removed');

assert.ok(!home.includes('Linking.openURL(item.url)'),'home news must not force an external browser');
assert.match(home,/NewsReaderModal/,'home news must open the in-app reader');
assert.match(home,/FloatingDashboardChart/);
assert.match(home,/dashboardMetrics/);
assert.match(home,/dashboardCharts/);

assert.match(ai,/AiQuestionBox/);
assert.ok(!ai.includes('Linking.openURL(item.url)'),'AI conversation must not behave like a news link list');
assert.match(ai,/對話內新聞以文字摘要播送/);
assert.match(dividend,/股息 AI 問答/);
assert.match(dividend,/AiQuestionBox/);
assert.match(question,/onAsk/);
assert.match(question,/送出/);

assert.match(model,/DEFAULT_DASHBOARD_METRICS/);
assert.match(model,/DEFAULT_DASHBOARD_CHARTS/);
for(const token of ['line','area','bar','horizontalBar','stackedBar','pie','donut','allocation','pnlTrend','dividendTrend','investVsValue','holdingWeight','costVsPrice','roiTrend','priceK','volume'])assert.ok(model.includes("'"+token+"'"),'chart style missing '+token);
assert.match(modal,/統一能力模型/);
assert.match(modal,/＋ 新增圖表/);
assert.match(modal,/自由拖移/);
assert.match(modal,/ColorPalettePicker/);
assert.match(floating,/PanResponder\.create/);
assert.match(floating,/onMove/);
assert.match(floating,/position:'absolute'/);
console.log('V1.0.17 editor/AI/news/floating-chart regression: PASS');