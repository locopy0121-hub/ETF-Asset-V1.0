import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePortfolioViewMode,normalizePortfolioLayoutMode,nextPortfolioMode,
  PORTFOLIO_SAFE_SWITCH_ID,isIsolatedPortfolioSwitch} from '../src/domain/portfolioModeSwitch';
import {mergeDisplayState} from '../src/editor/editorModel';
import {DEFAULT_PORTFOLIO_LIST,normalizePortfolioList} from '../src/domain/portfolioList';
import {holdingPages,safeHoldingStyle} from '../src/domain/holdingLayoutPolicy';

// Same recorded order as the Android report: list -> two-card paging -> horizontal -> grid3 -> list.
// The alternate control cannot inherit the old ID or contaminated shared control styling.
assert.equal(normalizePortfolioViewMode(undefined),'list');
assert.equal(normalizePortfolioViewMode('broken'),'list');
assert.equal(normalizePortfolioViewMode('wall'),'wall');
for(const mode of ['list','grid2','grid3','horizontal','paged2'] as const)
  assert.equal(normalizePortfolioLayoutMode(mode),mode);
assert.equal(normalizePortfolioLayoutMode('corrupt'),'list');
let mode:ReturnType<typeof nextPortfolioMode>='list';
for(const next of ['wall','safe','list','wall','safe'] as const)mode=nextPortfolioMode(mode,next);
assert.equal(mode,'safe');
assert.equal(nextPortfolioMode('safe','unknown'),'safe');
assert.equal(safeHoldingStyle(normalizePortfolioLayoutMode('grid3'),'chart'),'quote');
assert.deepEqual(holdingPages(['0050','0056','00878'],2),[['0050','0056'],['00878']]);
const repaired=mergeDisplayState({portfolio:{portfolioViewMode:'unknown',holdingLayoutMode:'page9'}});
assert.equal(repaired.portfolio.portfolioViewMode,'list');
assert.equal(repaired.portfolio.holdingLayoutMode,'list');
assert.equal(normalizePortfolioList({columns:[null,{},DEFAULT_PORTFOLIO_LIST.columns[0]]}).fixedWidth,
  DEFAULT_PORTFOLIO_LIST.fixedWidth);
assert.ok(isIsolatedPortfolioSwitch('portfolio','holding-view',PORTFOLIO_SAFE_SWITCH_ID));
assert.ok(!isIsolatedPortfolioSwitch('home','holding-quotes',PORTFOLIO_SAFE_SWITCH_ID));
assert.ok(!isIsolatedPortfolioSwitch('portfolio','holding-view','control:root/0'));

const portfolio=readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const stack=readFileSync('src/components/PageEditorStack.tsx','utf8');
const runtime=readFileSync('src/maintenance/MaintenanceRuntime.tsx','utf8');
const switcher=readFileSync('src/components/PortfolioModeSwitcher.tsx','utf8');
const safe=readFileSync('src/components/PortfolioSafeList.tsx','utf8');
const boundary=readFileSync('src/components/PortfolioViewBoundary.tsx','utf8');
assert.doesNotMatch(portfolio,/<PortfolioModeSwitcher/);
assert.match(portfolio,/<PortfolioSafeList rows=\{sorted\}/);
assert.match(portfolio,/<PortfolioViewBoundary key=\{viewMode\+/);
assert.match(portfolio,/maintenance\.patchDisplay\(patch\)/);
assert.doesNotMatch(portfolio,/<SegmentedControl items=\{\[\{key:'list',label:'清單模式'/);
assert.match(stack,/child\.type===PortfolioModeSwitcher\?PORTFOLIO_SAFE_SWITCH_ID/);
assert.equal(runtime.match(/isIsolatedPortfolioSwitch\(page,frameKey,id\)/g)?.length,2);
assert.match(switcher,/accessibilityState=\{\{selected:active\}\}/);
assert.match(switcher,/if\(!active\)onChange\(item.key\)/);
assert.doesNotMatch(switcher,/Animated|PanResponder|useThemeRuntime/);
assert.doesNotMatch(safe,/PortfolioHoldingTable|HoldingQuoteCollection|InspectableTarget|Animated/);
assert.match(boundary,/PORTFOLIO_VIEW_RENDER/);
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const app=JSON.parse(readFileSync('app.json','utf8'));
assert.equal(pkg.version,'3.2.9');
assert.equal(app.expo.android.versionCode,30209);
console.log('V3.1.18 alternate mode selector, safe-list bypass, legacy isolation, normalized persistence: PASS; Android device verification pending');
