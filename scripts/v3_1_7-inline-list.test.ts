import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeDisplayState,createInitialDisplayState} from '../src/editor/editorModel';
import {individualNativeDisplayPatch} from '../src/maintenance/individualResetModel';
import {DEFAULT_PORTFOLIO_LIST} from '../src/domain/portfolioList';

const portfolio=createInitialDisplayState().portfolio;
assert.equal(portfolio.portfolioViewMode,'list');
assert.equal(portfolio.portfolioListStyle,'simple','first-key list uses the existing simple-list renderer');
assert.equal(mergeDisplayState({portfolio:{portfolioViewMode:'list'}}).portfolio.portfolioListStyle,'simple',
  'legacy stored list migrates to the simple view without adding a separate button');
assert.equal(mergeDisplayState({portfolio:{portfolioListStyle:'table'}}).portfolio.portfolioListStyle,'table',
  'explicitly selected detailed table must survive reload');
assert.equal(mergeDisplayState({portfolio:{portfolioListStyle:'unknown'}}).portfolio.portfolioListStyle,'simple');
assert.deepEqual(individualNativeDisplayPatch({
  page:'portfolio',frameKey:'holding-view',kind:'portfolio-list',properties:[],
}),{portfolioList:DEFAULT_PORTFOLIO_LIST,portfolioListStyle:'simple'});

const screen=readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const settings=readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
const editor=readFileSync('src/components/PortfolioListEditor.tsx','utf8');
const simple=readFileSync('src/components/PortfolioSafeList.tsx','utf8');
const boundary=readFileSync('src/components/PortfolioViewBoundary.tsx','utf8');
const quick=readFileSync('src/components/PortfolioQuickBar.tsx','utf8');

assert.match(screen,/<PortfolioQuickBar firstMode=\{firstMode\}/);
assert.doesNotMatch(screen,/<PortfolioModeSwitcher/,'remove stand-alone rescue button');
assert.doesNotMatch(screen,/故障救援：安全簡易清單/);
assert.match(screen,/simpleList=\(effectiveDisplay\.portfolioListStyle\?\?'simple'\)!=='table'\|\|listFallback/);
assert.match(screen,/<PortfolioSafeList rows=\{sorted\} onOpenHolding=\{onOpenHolding\}/);
assert.match(screen,/<HoldingTable rows=\{sorted\} onOpenHolding=\{onOpenHolding\}/);
assert.match(screen,/setListFallback\(true\)/,'render failure goes to simple list inside first key');
assert.match(screen,/patchPortfolioDisplay\(quickModePatch\('list',holdingLayoutMode\)\)/);
assert.match(screen,/<PortfolioViewBoundary/,'retain JS render boundary without a permanent emergency button');
assert.doesNotMatch(simple,/安全簡易清單：/,'do not label the integrated list as rescue mode');
assert.doesNotMatch(simple,/PortfolioHoldingTable|HoldingQuoteCollection|InspectableTarget|Animated/);
assert.match(settings,/key:'simple',label:'簡易清單'/);
assert.match(settings,/key:'table',label:'詳細表格'/);
assert.match(settings,/portfolioListStyle/);
assert.match(settings,/previewStyle=\{displayDraft\.portfolioListStyle\?\?'simple'\}/);
assert.match(editor,/<PortfolioSafeList rows=\{\[previewQuote\]\}/);
assert.match(boundary,/返回清單（簡易樣式）/);
assert.match(quick,/onPress=\{onCycleFirst\}/,'first key continues to cycle modes');

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const app=JSON.parse(readFileSync('app.json','utf8'));
assert.equal(pkg.version,'3.1.7');
assert.equal(app.expo.android.versionCode,30107);
assert.equal(app.expo.ios.buildNumber,'30107');
console.log('V3.1.7 integrated simple list, no redundant rescue button, settings preview and fallback: PASS; Android device verification pending');
