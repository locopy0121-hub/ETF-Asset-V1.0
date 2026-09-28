import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PORTFOLIO_PRIMARY_MODES,PORTFOLIO_QUICK_SWITCH_ID,
  nextPortfolioPrimaryMode,quickModeFromDisplay,quickModePatch,isIsolatedPortfolioSwitch
} from '../src/domain/portfolioModeSwitch';
import {HOLDING_SORT_PRESETS,nextSortPreset,sortPreset,sortHoldingQuotes} from '../src/domain/holdingSort';
import {mergeDisplayState} from '../src/editor/editorModel';
import type {HoldingQuote} from '../src/domain/uiModels';

assert.deepEqual(PORTFOLIO_PRIMARY_MODES,['list','wall','quote','compact']);
let current:typeof PORTFOLIO_PRIMARY_MODES[number]='compact';
assert.deepEqual(Array.from({length:4},()=>current=nextPortfolioPrimaryMode(current)),
  ['list','wall','quote','compact']);
assert.equal(quickModeFromDisplay('list','advanced','grid3'),'list');
assert.equal(quickModeFromDisplay('wall','quote','grid2'),'wall');
assert.equal(quickModeFromDisplay('wall','quote','list'),'quote');
assert.equal(quickModeFromDisplay('wall','compact','list'),'compact');
assert.equal(quickModeFromDisplay('wall','chart','list'),'chart');
assert.equal(quickModeFromDisplay('wall','advanced','list'),'advanced');
assert.deepEqual(quickModePatch('list','paged2'),{portfolioViewMode:'list'});
assert.deepEqual(quickModePatch('wall','list'),
  {portfolioViewMode:'wall',quoteStyle:'quote',holdingLayoutMode:'grid2'});
assert.deepEqual(quickModePatch('quote','grid3'),
  {portfolioViewMode:'wall',quoteStyle:'quote',holdingLayoutMode:'list'});
assert.deepEqual(quickModePatch('chart','grid3'),
  {portfolioViewMode:'wall',quoteStyle:'chart',holdingLayoutMode:'list'});
assert.ok(isIsolatedPortfolioSwitch('portfolio','holding-view',PORTFOLIO_QUICK_SWITCH_ID));
assert.ok(!isIsolatedPortfolioSwitch('home','holding-quotes',PORTFOLIO_QUICK_SWITCH_ID));
const repaired=mergeDisplayState({portfolio:{sortKey:'broken'}});
assert.equal(repaired.portfolio.sortKey,'manual');

const keys=HOLDING_SORT_PRESETS.map(x=>x.key);
assert.deepEqual(keys,['manual','changePct','change','pnl','roi','marketValue',
  'weight','symbol','name','price','dividend']);
let sort='manual';
for(let i=1;i<keys.length;i++){
  const next=nextSortPreset(sort);sort=next.key;
  assert.equal(sort,keys[i]);
}
assert.equal(nextSortPreset(sort).key,'manual');
assert.equal(nextSortPreset('invalid').key,'manual');
assert.equal(sortPreset('symbol').descending,false);
const rows=[
  {symbol:'00878',name:'C',price:19,previousClose:18,marketValue:100,pnl:-20,roi:-1,weight:10,pinned:false},
  {symbol:'0050',name:'A',price:151,previousClose:149,marketValue:200,pnl:80,roi:4,weight:20,pinned:false},
  {symbol:'0056',name:'B',price:35,previousClose:36,marketValue:150,pnl:12,roi:2,weight:15,pinned:false},
] as HoldingQuote[];
assert.deepEqual(sortHoldingQuotes(rows,'changePct',true).map(x=>x.symbol),['00878','0050','0056']);
assert.deepEqual(sortHoldingQuotes(rows,'change',true).map(x=>x.symbol),['0050','00878','0056']);
assert.deepEqual(sortHoldingQuotes(rows,'symbol',false).map(x=>x.symbol),['0050','0056','00878']);
assert.deepEqual(sortHoldingQuotes(rows,'name',false).map(x=>x.symbol),['0050','0056','00878']);
assert.deepEqual(sortHoldingQuotes(rows,'manual').map(x=>x.symbol),rows.map(x=>x.symbol));

const screen=readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const bar=readFileSync('src/components/PortfolioQuickBar.tsx','utf8');
const stack=readFileSync('src/components/PageEditorStack.tsx','utf8');
assert.match(screen,/<PortfolioQuickBar firstMode=\{firstMode\}/);
assert.match(screen,/sortLabel=\{currentSort.label\}/);
assert.match(screen,/onCycleSort=\{cycleSort\}/);
assert.match(screen,/nextPortfolioPrimaryMode\(firstMode\)/);
assert.match(screen,/patchPortfolioDisplay\(quickModePatch\(mode,holdingLayoutMode\)\)/);
assert.match(screen,/maintenance.patchDisplay\(patch\)/);
assert.doesNotMatch(screen,/<PortfolioModeSwitcher items=\{\[/);
assert.doesNotMatch(screen,/\{key:'list',label:'清單模式'/);
assert.match(bar,/glyph=\{first.glyph\}/);
assert.match(bar,/onPress=\{onCycleFirst\}/);
assert.match(bar,/onPress=\{onCycleSort\}/);
assert.doesNotMatch(bar,/Animated|PanResponder|三模式/);
assert.match(stack,/id:PORTFOLIO_QUICK_SWITCH_ID/);
const app=JSON.parse(readFileSync('app.json','utf8'));
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(pkg.version,'3.1.12');
assert.equal(app.expo.android.versionCode,30112);
console.log('V3.1.12 four-key icon/title cycle, immediate sorting, emergency safe-list: PASS; device test pending');
