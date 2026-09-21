const fs=require('fs');const assert=require('assert');
const model=fs.readFileSync('src/editor/editorModel.ts','utf8');
const modal=fs.readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
const chart=fs.readFileSync('src/components/FloatingDashboardChart.tsx','utf8');
const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');

for(const token of ['borderColor','borderWidth','borderStyle','borderRadius','backgroundOpacity','contentOpacity','gainColor','lossColor','flatColor','pinchZoomEnabled','panEnabled','doubleTapReset','rememberZoom','touchThrough','zoomMin','zoomMax'])assert.ok(model.includes(token),'chart config missing '+token);
for(const label of ['邊框顏色','邊框粗細','邊框樣式','圓角','內容透明度','兩指放大縮小','單指平移資料','雙擊重設縮放','最下層','最上層'])assert.ok(modal.includes(label),'chart editor missing '+label);
assert.match(chart,/numberActiveTouches/);assert.match(chart,/distance\(event\.nativeEvent\.touches/);
assert.match(chart,/resizeResponder/);assert.match(chart,/aspectLocked/);assert.match(chart,/Math\.round\(.*\/8\)\*8/);
assert.match(chart,/fullScreen/);assert.match(chart,/重設縮放/);assert.match(chart,/pointerEvents=\{config\.touchThrough/);
assert.match(home,/onResize=\{\(width,height\)=>resizeDashboardChart/);
for(const source of ['avgCost','price','shares','realizedPnl','comprehensivePnl','transactions'])assert.ok(home.includes("case '"+source+"'"),'chart source not consumed '+source);
assert.match(modal,/ColorPalettePicker label="邊框顏色"/);
console.log('V1.1.1 chart editor / gestures gate: PASS');