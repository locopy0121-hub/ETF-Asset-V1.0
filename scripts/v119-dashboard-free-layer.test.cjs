const fs=require('fs');const assert=require('assert');
const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
const floating=fs.readFileSync('src/components/FloatingDashboardChart.tsx','utf8');
const model=fs.readFileSync('src/editor/editorModel.ts','utf8');
const modal=fs.readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');

assert.match(home,/style=\{styles\.pageLayer\}/,'home must expose one page-level chart layer');
assert.match(home,/bounds=\{chartBounds\}/,'floating charts must use full page bounds');
assert.ok(!home.includes('chartCanvas'),'legacy in-frame chart canvas must be removed');
assert.match(home,/dashboardTop:\{minHeight:150/,'dashboard must reserve upper-right chart area without old blank canvas');
assert.match(floating,/const effectiveX=config\.x<0\?maxX/,'negative X sentinel must right-anchor chart');
assert.match(floating,/left:effectiveX,top:effectiveY/,'chart must render from page-level effective coordinates');
assert.match(model,/x:-1,y:48,width:160,height:140/,'default allocation chart must start upper-right');
assert.match(model,/legacyMain/,'legacy V1.0.18 in-frame chart geometry must migrate');
assert.match(modal,/可跨框架自由放置/,'editor must state cross-frame placement');
assert.match(modal,/靠右對齊/,'editor must expose right-anchor action');
for(const label of ['最下層','↓ 下置','↑ 上置','最上層'])assert.ok(modal.includes(label),'layer action missing '+label);
console.log('V1.0.19 dashboard free-layer gate: PASS');
