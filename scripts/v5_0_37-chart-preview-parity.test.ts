import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {frameVisualProps} from '../src/editor/frameVisualParity';
import {taiexChartHeight,taiexAxisWidth,taiexPlotLeftInset,taiexTimeAxisLeft} from '../src/editor/taiexIndexChartLayout';
import {createInitialEditorState,mergeEditorState,mergeDisplayState} from '../src/editor/editorModel';
const read=(p:string)=>readFileSync(p,'utf8');
const initial=createInitialEditorState().market['market-index']!;
for(const [layout,appearance] of [['standard','theme'],['compact','soft'],['dense','outline']] as const){
 const edited={...initial,layout,appearance,padding:22,backgroundColor:'#304050',borderWidth:3,borderRadius:9};
 const saved=mergeEditorState({market:{'market-index':edited}}).market['market-index']!;
 const live=frameVisualProps(saved),preview=frameVisualProps(edited);
 assert.equal(live.layout,preview.layout);
 assert.equal(live.appearance,preview.appearance);
 assert.deepEqual(live.editorStyle,preview.editorStyle,'real and preview props must survive persistence');
}
assert.equal(frameVisualProps(undefined).layout,'standard');
assert.equal(frameVisualProps(undefined).appearance,'theme');
assert.match(read('src/components/PageEditorStack.tsx'),/\.\.\.frameVisualProps\(frameConfig\)/);
assert.match(read('src/components/PageLayoutToolWorkbench.tsx'),/\.\.\.frameVisualProps\(itemConfig\)/);
const chart=read('src/components/TaiexIndexCard.tsx');
assert.doesNotMatch(chart,/if\(!sorted\.length&&!levels\)return/,'no-cache preview cannot remove graph');
assert.match(chart,/<IndexEditableChart>/);
assert.match(chart,/!pricePool\.length\?<Text/,'missing quote must show honest empty caption');
assert.match(chart,/height=\{chartHeight\}/);
assert.match(chart,/height:chartHeight/);
for(const height of [undefined,80,160,280,300,600,1200]){
 const expected=height===undefined?300:Math.max(80,Math.min(900,height));
 assert.equal(taiexChartHeight(height),expected);
}
assert.equal(taiexAxisWidth(68),68);
assert.equal(taiexPlotLeftInset(14),14);
assert.equal(taiexTimeAxisLeft(68,14),84);
const saved=mergeDisplayState({market:{layoutTargets:{
 'market:index:axis:left':{width:68},'market:index:plot:left-inset':{width:14},
 'market:index:chart':{height:240,width:185,backgroundColor:'#111111',borderWidth:2},
}}}).market.layoutTargets!;
assert.equal(taiexAxisWidth(saved['market:index:axis:left']?.width),68);
assert.equal(taiexChartHeight(saved['market:index:chart']?.height),240);
assert.equal(saved['market:index:chart']?.backgroundColor,'#111111');
const app=JSON.parse(read('app.json')).expo,pkg=JSON.parse(read('package.json'));
assert.equal(app.version,pkg.version);
assert.equal(app.android.versionCode,50037);
assert.equal(app.ios.buildNumber,'50037');
console.log('V5.0.37 chart preview real-frame parity, persisted index geometry and empty graph tests PASS');
