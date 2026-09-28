import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_PORTFOLIO_LIST} from '../src/domain/portfolioList';
import {DEFAULT_HOLDING_WALL_CONFIG} from '../src/domain/uiModels';
import {
  normalizeIndividualResets,individualScope,isIndividualReset,withIndividualReset,
  clearIndividualOverride,effectiveIndividualOverride,individualNativeDisplayPatch,
} from '../src/maintenance/individualResetModel';

// The current A alone returns to its native defaults; siblings and shared tokens survive.
const original={
  'control:root/0':{offsetX:44,width:205,opacity:.2,visible:false,backgroundColor:'#123456'},
  'control:root/1':{offsetX:9,backgroundColor:'#ABCDEF'},
};
const reset=clearIndividualOverride(original,'control:root/0');
assert.deepEqual(reset['control:root/0'],{});
assert.deepEqual(reset['control:root/1'],original['control:root/1']);
assert.notEqual(reset,original);
assert.equal(original['control:root/0'].visible,false,'source must remain untouched');
const inherited={backgroundColor:'#FFFF00',opacity:.4};
assert.deepEqual(effectiveIndividualOverride({},inherited,true),{});
assert.deepEqual(effectiveIndividualOverride({},inherited,false),inherited);
assert.deepEqual(effectiveIndividualOverride({opacity:.6},inherited,true),{opacity:.6});
assert.equal(effectiveIndividualOverride({opacity:.6},inherited,false).opacity,.4);

const page='portfolio' as const,frame='holding-view';
const selected='control:root/0';
const map=withIndividualReset({},page,frame,selected);
assert.equal(isIndividualReset(map,page,frame,selected),true);
assert.equal(isIndividualReset(map,page,frame,'control:root/1'),false);
assert.equal(isIndividualReset(map,'home','holding-quotes',selected),false);
assert.deepEqual(withIndividualReset(map,page,frame,selected)[individualScope(page,frame)],[selected]);
assert.deepEqual(normalizeIndividualResets({'portfolio:holding-view':['control:root/0','../../../unsafe',null],
  'unknown:any':['bad']}),{'portfolio:holding-view':['control:root/0']});

const control=(choices:string)=>({
  page,frameKey:frame,kind:'control' as const,properties:[{name:'可選項目',value:choices}],
});
assert.deepEqual(individualNativeDisplayPatch(control('清單模式／行情牆模式')),{portfolioViewMode:'list'});
assert.deepEqual(individualNativeDisplayPatch(control('純行情／＋圖表／精簡／進階')),{quoteStyle:'chart'});
assert.deepEqual(individualNativeDisplayPatch(control('其他選擇')),{});
assert.deepEqual(individualNativeDisplayPatch({page,frameKey:frame,kind:'portfolio-list',properties:[]}),
  {portfolioList:DEFAULT_PORTFOLIO_LIST,portfolioListStyle:'table'});
assert.deepEqual(individualNativeDisplayPatch({page,frameKey:frame,kind:'quote-card',properties:[]}),{});
assert.deepEqual(individualNativeDisplayPatch({page:'home',frameKey:'holding-view',
  kind:'portfolio-list',properties:[]}),{});

// Wiring checks: the rescue list can open A without dispatching its possibly broken onPress.
const runtime=readFileSync('src/maintenance/MaintenanceRuntime.tsx','utf8');
const workbench=readFileSync('src/maintenance/MaintenanceWorkbench.tsx','utf8');
const target=readFileSync('src/maintenance/InspectableTarget.tsx','utf8');
const collection=readFileSync('src/components/HoldingQuoteCollection.tsx','utf8');
assert.match(runtime,/resetIndividual:\(\)=>setSession/);
assert.match(runtime,/individualResets:nextIndividualResets/);
assert.match(runtime,/setIndividualResets\(nextIndividualResets\)/);
assert.match(runtime,/syncSameKind:false,sharedTouched:\[\]/);
assert.match(runtime,/clearIndividualOverride\(current.draftTargets,id\)/);
assert.match(workbench,/個體元件故障救援/);
assert.match(workbench,/maintenance.enterTarget\(\{\.\.\.target/);
assert.match(workbench,/maintenance.resetIndividual\(\)/);
assert.match(workbench,/儲存／套用/);
assert.match(target,/properties:target.properties/);
assert.match(collection,/cardReset\?DEFAULT_HOLDING_WALL_CONFIG:effectiveWallConfig/);
assert.match(collection,/wallReset\?DEFAULT_HOLDING_WALL_CONFIG:wallConfig/);
assert.equal(DEFAULT_HOLDING_WALL_CONFIG.style.cornerRadius>0,true);
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const app=JSON.parse(readFileSync('app.json','utf8'));
assert.equal(pkg.version,'3.1.16');
assert.equal(app.expo.android.versionCode,30116);
assert.equal(app.expo.ios.buildNumber,'30116');
console.log('V3.1.16 individual factory reset, inherited-style isolation, emergency selector, version and data safety: PASS (Android device remains separate)');
