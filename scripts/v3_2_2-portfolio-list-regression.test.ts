import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createInitialDisplayState,mergeDisplayState} from '../src/editor/editorModel';
import {individualNativeDisplayPatch} from '../src/maintenance/individualResetModel';
import {DEFAULT_PORTFOLIO_LIST} from '../src/domain/portfolioList';

assert.equal(createInitialDisplayState().portfolio.portfolioListStyle,'table');
assert.equal(mergeDisplayState({portfolio:{portfolioViewMode:'list'}}).portfolio.portfolioListStyle,'table');
assert.equal(mergeDisplayState({portfolio:{portfolioListStyle:'simple'}}).portfolio.portfolioListStyle,'table');
assert.equal(mergeDisplayState({portfolio:{portfolioListStyle:'unknown'}}).portfolio.portfolioListStyle,'table');
assert.deepEqual(individualNativeDisplayPatch({
  page:'portfolio',frameKey:'holding-view',kind:'portfolio-list',properties:[],
}),{portfolioList:DEFAULT_PORTFOLIO_LIST,portfolioListStyle:'table'});

const screen=readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const settings=readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
const editor=readFileSync('src/components/PortfolioListEditor.tsx','utf8');
const safe=readFileSync('src/components/PortfolioSafeList.tsx','utf8');
const boundary=readFileSync('src/components/PortfolioViewBoundary.tsx','utf8');
const quick=readFileSync('src/components/PortfolioQuickBar.tsx','utf8');

assert.match(screen,/<PortfolioQuickBar firstMode=\{firstMode\}/);
assert.doesNotMatch(screen,/<PortfolioModeSwitcher/,'no redundant fifth rescue button');
assert.match(screen,/const simpleList=listFallback/);
assert.match(screen,/<PortfolioSafeList rows=\{sorted\}/);
assert.match(screen,/:<HoldingTable rows=\{sorted\}/);
assert.match(screen,/setListFallback\(true\)/);
assert.match(screen,/<PortfolioViewBoundary/);
assert.match(screen,/maintenance\.registerTarget\('portfolio','holding-view'/);
assert.match(screen,/listInspectorActive/,'target editor only wraps intentionally edited A');
assert.doesNotMatch(safe,/PortfolioHoldingTable|HoldingQuoteCollection|InspectableTarget|Animated/);
assert.match(settings,/<PageLayoutToolWorkbench/,'portfolio page settings now use the unified real-layout workbench');
assert.doesNotMatch(settings,/key:'simple',label:'簡易清單'/);
assert.match(editor,/<PortfolioHoldingTable rows=\{\[previewQuote\]\}/);
assert.match(boundary,/暫用救援清單/);
assert.match(quick,/onPress=\{onCycleFirst\}/);

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const app=JSON.parse(readFileSync('app.json','utf8'));
assert.equal(pkg.version,'3.2.3');
assert.equal(app.expo.android.versionCode,30203);
assert.equal(app.expo.ios.buildNumber,'30203');
console.log('V3.2.3 portfolio regression: direct table, safe fallback and unified real-layout settings entry: PASS');
