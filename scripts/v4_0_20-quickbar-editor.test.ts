import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_QUICK_BAR_LAYOUT,QUICK_BAR_KEYS,normalizeQuickBarLayout,resolveQuickBarButton,moveQuickBarButton} from '../src/domain/portfolioQuickBarLayout';
import {mergeDisplayState} from '../src/editor/editorModel';
const read=(path:string)=>readFileSync(path,'utf8');

assert.deepEqual(DEFAULT_QUICK_BAR_LAYOUT.order,['first','chart','advanced','sort']);
assert.equal(normalizeQuickBarLayout({}).button.width,null);
assert.equal(normalizeQuickBarLayout({button:{labelSize:18}}).button.width,null);
assert.equal(normalizeQuickBarLayout({button:{glyphSize:30}}).button.height,null);
const raw={
  order:['sort','chart','sort','invalid','first'],
  columnGap:12,rowGap:18,paddingHorizontal:7,marginVertical:5,
  button:{width:null,minHeight:96,borderWidth:2,borderColor:'#ABCDEF',
    paddingHorizontal:11,labelSize:20,labelLineHeight:9,contentGap:12},
  overrides:{sort:{width:108,labelSize:25,labelLineHeight:12,backgroundColor:'#123ABC'},
    first:{height:110},injected:{borderWidth:9}},
};
const layout=normalizeQuickBarLayout(raw);
assert.deepEqual(layout.order,['sort','chart','first','advanced']);
assert.deepEqual([...new Set(layout.order)].sort(),[...QUICK_BAR_KEYS].sort());
assert.equal(layout.columnGap,12);assert.equal(layout.rowGap,18);
assert.equal(layout.button.width,null);assert.equal(layout.button.minHeight,96);
assert.equal(layout.button.labelLineHeight,20,'line height must never clip enlarged labels');
assert.equal(resolveQuickBarButton(layout,'sort').width,108);
assert.equal(resolveQuickBarButton(layout,'sort').labelSize,25);
assert.equal(resolveQuickBarButton(layout,'sort').labelLineHeight,25);
assert.equal(resolveQuickBarButton(layout,'chart').width,null);
assert.equal(resolveQuickBarButton(layout,'first').height,110);
assert.equal((layout.overrides as any).injected,undefined,'unknown keys must be dropped');
assert.deepEqual(moveQuickBarButton(layout,'first',-1).order,['sort','first','chart','advanced']);
assert.deepEqual(moveQuickBarButton(layout,'sort',-1).order,layout.order);
const old=mergeDisplayState({});
assert.equal(old.home.quickBar?.button.width,null,'legacy saved data retains responsive layout');
assert.equal(old.portfolio.quickBar?.button.minHeight,76);
const restored=mergeDisplayState({home:{quickBar:raw},portfolio:{quickBar:{
  order:['advanced','first','chart','sort'],button:{glyphSize:31},
}}});
assert.deepEqual(restored.home.quickBar?.order,layout.order);
assert.deepEqual(restored.portfolio.quickBar?.order,['advanced','first','chart','sort']);
assert.equal(restored.portfolio.quickBar?.button.width,null);
assert.equal(restored.portfolio.quickBar?.button.glyphSize,31);
assert.notDeepEqual(restored.home.quickBar,restored.portfolio.quickBar,
  'home and holdings layout must not be synchronized/overwritten');

const bar=read('src/components/PortfolioQuickBar.tsx');
const home=read('src/screens/HomeScreen.tsx');
const holdings=read('src/screens/PortfolioScreen.tsx');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const settings=read('src/screens/SettingsScreen.tsx');
assert.match(home,/<PortfolioQuickBar firstMode={homeFirstMode} activeMode={quoteStyle} layout={effectiveDisplay.quickBar}/);
assert.match(holdings,/<PortfolioQuickBar firstMode={firstMode} activeMode={activeQuickMode} layout={effectiveDisplay.quickBar}/);
assert.match(bar,/layout.order.map\(button\)/);
assert.match(bar,/onPress={onCycleFirst}/);
assert.match(bar,/onPress={onCycleSort}/);
assert.match(bar,/onPress={previewSelect\?\?onPress}/);
assert.match(bar,/onEditSelect\?:\(key:QuickBarKey\)=>void/);
assert.match(workbench,/onEditSelect={onQuickBarSelect}/);
assert.match(workbench,/quickBar:normalizeQuickBarLayout\(next\)/);
assert.match(workbench,/<QuickBarLayoutTools layout={quickBar}/);
assert.match(workbench,/按鈕行距/);
assert.match(workbench,/按鈕排列順序/);
assert.match(workbench,/按鈕尺寸／內外距/);
assert.match(workbench,/邊框／背景/);
assert.match(workbench,/圖示／文字／行高/);
assert.doesNotMatch(settings,/PortfolioQuickBar|QuickBarLayoutTools|PageEditorStack/,
  'protected settings must remain separate');
console.log('V4.0.20 quickbar per-page persistence, reorder, dimensions, preview tap and immutable actions: PASS');
