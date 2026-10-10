import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {equalGridPixelWidths,equalGridVisualOverride,normalizeEqualGrid} from '../src/domain/equalGridLayout';
import {mergeEditorState,normalizeEditorConfig} from '../src/editor/editorModel';
const read=(path:string)=>readFileSync(path,'utf8');

const preset=normalizeEqualGrid({enabled:true,columns:'auto',gap:8});
for(const columns of [2,3,4] as const){
  const widths=equalGridPixelWidths(columns,{...preset,columns},328);
  assert.equal(widths.length,columns);
  assert.ok(widths.every(w=>w>0),'all live columns need a real, positive width');
  assert.equal(widths.reduce((a,b)=>a+b,0)+8*(columns-1),328,
    columns+' cards and gaps must fill the real 328-pixel frame exactly');
  assert.ok(Math.max(...widths)-Math.min(...widths)<=1,
    columns+' equal cards must differ by at most one pixel');
}
assert.deepEqual(equalGridPixelWidths(3,{...preset,columns:2},328),[160,160,328],
  'a final incomplete row expands automatically rather than leaving blank space');
assert.deepEqual(equalGridPixelWidths(5,{...preset,columns:4},328),[76,76,76,76,328]);
assert.deepEqual(equalGridPixelWidths(3,{...preset,columns:3},0),[]);

const oldManual={
  width:136,height:128,offsetX:-93,offsetY:42,
  anchorX:'right',anchorY:'bottom',anchorBaseWidth:330,anchorBaseHeight:420,
  marginHorizontal:12,marginVertical:7,
  backgroundColor:'#E3F5E8',fontSize:20,
};
const original=JSON.stringify(oldManual);
const gridMode=equalGridVisualOverride(oldManual,true);
for(const key of ['width','offsetX','offsetY','anchorX','anchorY',
  'anchorBaseWidth','anchorBaseHeight','marginHorizontal','marginVertical']){
  assert.equal((gridMode as Record<string,unknown>)[key],undefined,
    key+' must not displace/overlap a card inside its assigned grid cell');
}
assert.equal(gridMode.height,128,'individual card height remains editable in grid mode');
assert.equal(gridMode.backgroundColor,'#E3F5E8','styling must be preserved');
assert.equal(gridMode.fontSize,20,'typography must be preserved');
assert.equal(JSON.stringify(oldManual),original,'grid must not delete saved manual XY/width');
assert.equal(equalGridVisualOverride(oldManual,false),oldManual,
  'switch OFF returns the original saved width/height/XY/anchor/margins');

const configs=normalizeEditorConfig('dividend',{});
const previous={...configs['dividend-summary']!,equalGrid:{enabled:true,columns:3 as const,gap:8}};
const enabled=mergeEditorState({dividend:{...configs,'dividend-summary':previous}});
assert.equal(enabled.dividend['dividend-summary']?.equalGrid?.enabled,true);
const disabled=mergeEditorState({dividend:{...enabled.dividend,'dividend-summary':{
  ...enabled.dividend['dividend-summary']!,equalGrid:{enabled:false,columns:3,gap:8},
}}});
assert.equal(disabled.dividend['dividend-summary']?.equalGrid?.enabled,false);

const widget=read('src/components/EqualGrid.tsx');
const metric=read('src/components/MetricTile.tsx');
const wrapper=read('src/maintenance/InspectableTarget.tsx');
const stack=read('src/components/PageEditorStack.tsx');
const preview=read('src/components/DividendPreviewSelector.tsx');
const screen=read('src/screens/DividendScreen.tsx');
const settings=read('src/screens/SettingsScreen.tsx');
assert.match(widget,/const effective=previewConfig\?\?session\?\.draft\?\?config\[frameKey\]/);
assert.match(widget,/equalGridPixelWidths\(cells\.length,effectiveRule,available\)/);
assert.match(widget,/columnGap:rule\.enabled\?safeGap:8/);
assert.match(widget,/Math\.floor\(event\.nativeEvent\.layout\.width\)/,
  'fractional Android width must be rounded down to avoid a trailing column wrap');
assert.match(wrapper,/const placementOverride=equalGridVisualOverride\(override,equalGrid&&flex\)/);
assert.match(wrapper,/const displacement=effectiveOffset\(placementOverride,measured\)/);
assert.match(wrapper,/const rect=geometry\?positionedRect\(geometry,placementOverride\):null/);
assert.match(wrapper,/live\.current\.selected&&!live\.current\.equalGrid/);
assert.match(wrapper,/const visual=flex&&visualBounds\?visualBounds:/,
  'engineer dashed border follows the physical painted tile bounds');
assert.match(metric,/const visualStyle=editorStyle\?equalGridVisualOverride\(editorStyle,equalGrid\):undefined/);
assert.match(metric,/marginHorizontal:equalGrid\?0:surface\.marginHorizontal/);
assert.match(metric,/equalGrid&&\{flex:0,width:'100%',minWidth:0,flexGrow:0,flexShrink:0\}/,
  'native tile flex:1 must be neutralized so it cannot paint multiple cells in one region');
assert.match(metric,/visualStyle\?\.offsetX/);
assert.match(stack,/delete paintedStyle\.offsetX;delete paintedStyle\.offsetY/);
assert.match(preview,/if\(child\.type===EqualGrid\)/);
assert.match(screen,/<EqualGrid pageKey="dividend" frameKey="dividend-summary">/);
assert.doesNotMatch(settings,/equalGridPixelWidths|equalGridVisualOverride|InspectableTarget/,
  'protected SettingsScreen does not acquire the layout engine');
console.log('V4.0.25: real/preview shared equal width, manual XY isolation, auto refill and engineer painted-card outlines PASS');
