import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(f:string)=>readFileSync(f,'utf8');
const c=read('src/components/OfficialCandleChart.tsx');
const stock=read('src/screens/StockChartScreen.tsx');
const taiex=read('src/components/TaiexIndexCard.tsx');
const editor=read('src/components/PageLayoutToolWorkbench.tsx');

assert.ok(c.includes("const showThreeGates=chartStyle==='three-gates';"),
  'gate lines render only in a dedicated chart format');
assert.ok(!c.includes("dataKeys.includes('threeGates');"),
  'selecting data keys must not overlay gates on K-line');
assert.ok(c.includes('const showVolume=!showThreeGates'),
  'standalone gate chart excludes volume histogram');
assert.ok(c.includes('const showCost=!showThreeGates'),
  'standalone gate chart excludes unrelated holding-cost overlay');
assert.ok(c.includes('const secondaryKey=showThreeGates?undefined:'),
  'standalone gate chart excludes candlestick secondary plots');
assert.ok(c.includes('{showThreeGates?null:\n                columnMode?'),
  'no K-body/wick rendering while gate mode is active');
assert.ok(c.includes("showThreeGates?<Polyline points={gateTrendLine}"),
  'gate chart shows a dedicated closing-price line rather than K-bars');
assert.ok(c.includes("Polyline points={lineGeometry.line}"),
  'ordinary line and area charts retain their original price-line renderer');
assert.ok(c.includes("gateLevels.map(g=><View key={'legend:'+g.id}"),
  'five gate labels should be under plot rather than stacked on y-axis');
assert.ok(!c.includes("position:'absolute',left:0,top:clamp(y(g.value)-11"),
  'no crowded price labels in narrow vertical axis range');
assert.ok(stock.includes("if(key==='threeGates'){setStyle(current=>"),
  'the source-option chip switches graph format rather than data overlay');
assert.ok(stock.includes("item.key==='threeGates'?style==='three-gates'"),
  'chip state reflects selected exclusive format');
assert.ok(taiex.includes("left:0,right:0,top:position-height/2,alignItems:'flex-end'"),
  'numeric gate labels should sit at dashed-line origin on actual and preview');
assert.ok(taiex.includes("alignSelf:id.endsWith(':left')?'flex-end':'flex-start'"),
  'editable preview label wrapper must align to same right-hand line origin');
assert.ok(editor.includes('TAIEX_INDEX_EDITOR_ITEMS')&&editor.includes('taiexAxisWidth'));
assert.ok(c.includes('onTouchMove=')&&c.includes('onScroll={event=>{scrollX.current='),
  'chart pan, zoom and crosshair must stay intact');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json')).expo;
assert.match(pkg.version,/^5\.0\.\d+$/);assert.equal(app.version,pkg.version);
const [major,minor,patch]=pkg.version.split('.').map(Number);
const expectedCode=major*10000+minor*100+patch;
assert.equal(app.android.versionCode,expectedCode);assert.equal(app.ios.buildNumber,String(expectedCode));
console.log('V5.0.30 dedicated three-gate chart, independent K-line and index label alignment PASS');
