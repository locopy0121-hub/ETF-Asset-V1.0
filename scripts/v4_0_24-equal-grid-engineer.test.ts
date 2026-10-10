import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_EQUAL_GRID,equalGridWidths,normalizeEqualGrid} from '../src/domain/equalGridLayout';
import {mergeEditorState,normalizeEditorConfig} from '../src/editor/editorModel';
const read=(p:string)=>readFileSync(p,'utf8');
assert.deepEqual(normalizeEqualGrid(undefined),DEFAULT_EQUAL_GRID);
assert.equal(normalizeEqualGrid({enabled:true,columns:5,gap:-100}).columns,'auto');
assert.equal(normalizeEqualGrid({enabled:true,columns:3,gap:999}).gap,40);
assert.deepEqual(equalGridWidths(2,{enabled:true,columns:'auto',gap:8},328),[160,160]);
const thirds=equalGridWidths(3,{enabled:true,columns:'auto',gap:8},328);
assert.equal(thirds.length,3);assert.ok(thirds.every(v=>Math.abs(v-104)<0.01));
const quarters=equalGridWidths(4,{enabled:true,columns:4,gap:8},328);
assert.deepEqual(quarters,[76,76,76,76]);
assert.deepEqual(equalGridWidths(3,{enabled:true,columns:2,gap:8},328),[160,160,328],
  'third item must fill the trailing row, not leave an empty cell');
assert.deepEqual(equalGridWidths(5,{enabled:true,columns:4,gap:8},328),[76,76,76,76,328]);
assert.deepEqual(equalGridWidths(0,{enabled:true,columns:3,gap:8},328),[]);
assert.deepEqual(equalGridWidths(3,{enabled:true,columns:3,gap:8},0),[]);
const old=normalizeEditorConfig('dividend',{});
assert.equal(old['dividend-summary']?.equalGrid?.enabled,false,'older saved layouts stay manual');
const customized=mergeEditorState({dividend:{...old,'dividend-summary':{
  ...old['dividend-summary']!,height:290,width:225,
  equalGrid:{enabled:true,columns:3,gap:10},
}}});
assert.equal(customized.dividend['dividend-summary']?.equalGrid?.columns,3);
assert.equal(customized.dividend['dividend-summary']?.height,290,
  'enabling equal widths must never rewrite the parent height');
assert.equal(customized.dividend['dividend-summary']?.width,225);
const reread=mergeEditorState(customized);
assert.equal(reread.dividend['dividend-summary']?.equalGrid?.enabled,true);
const disabled=mergeEditorState({dividend:{...reread.dividend,'dividend-summary':{
  ...reread.dividend['dividend-summary']!,equalGrid:{enabled:false,columns:3,gap:10},
}}});
assert.equal(disabled.dividend['dividend-summary']?.equalGrid?.enabled,false);
assert.equal(disabled.dividend['dividend-summary']?.width,225);

const widget=read('src/components/EqualGrid.tsx');
const dividend=read('src/screens/DividendScreen.tsx');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const preview=read('src/components/DividendPreviewSelector.tsx');
const metric=read('src/components/MetricTile.tsx');
const inspector=read('src/maintenance/InspectableTarget.tsx');
const stack=read('src/components/PageEditorStack.tsx');
const settings=read('src/screens/SettingsScreen.tsx');
assert.match(dividend,/<EqualGrid pageKey="dividend" frameKey="dividend-summary">/);
assert.match(widget,/const effective=previewConfig\?\?session\?\.draft\?\?config\[frameKey\]/);
assert.match(widget,/rule\.enabled\?equalGridWidths\(cells\.length,rule,available\):\[\]/);
assert.match(widget,/style:rule\.enabled&&width!==undefined/);
assert.match(widget,/minWidth:0,maxWidth:width,alignSelf:'flex-start'/);
assert.match(preview,/previewConfig,\s*children:selectDividendPreview\(p\.children/);
assert.match(workbench,/label="啟用平均欄寬及自動補位"/);
assert.match(workbench,/label="每列顯示數量"/);
assert.match(workbench,/patch\(\{equalGrid:/);
assert.match(metric,/onLayout=\{onVisualLayout\}/);
assert.match(stack,/render\.onVisualLayout\?\{onVisualLayout:render\.onVisualLayout\}/);
assert.match(inspector,/const visual=flex&&visualBounds\?visualBounds:/);
assert.match(inspector,/style=\{\[visualFrame\?\?StyleSheet\.absoluteFill,styles\.selectionOutline/);
assert.match(inspector,/style=\{visualFrame\?\?StyleSheet\.absoluteFill\}/);
assert.match(inspector,/const parentOwnsGrid=frame\.page==='dividend'/);
assert.match(stack,/offsetX:undefined,offsetY:undefined/,
  'metric transform must not be applied twice in engineer mode');
assert.doesNotMatch(settings,/EqualGrid|equalGridWidths|PageLayoutToolWorkbench|InspectableTarget/,
  'protected system settings UI must not be altered by equal grid feature');
console.log('V4.0.24: 2/3/4 columns, auto last row, optional/manual persistence, real painted engineer bounds: PASS');
