import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AB_PROPERTY_GROUPS,AB_PROPERTY_TOOL_IDS,AB_PROPERTY_BASE_COUNT,
  findAbProperty,searchAbProperties,sizeControlFor} from '../src/maintenance/abPropertyModel';
import {COMPLETE_ENGINEER_SKILLS,completeCatalogAudit,FULL_SKILL_SECTIONS} from '../src/maintenance/fullSkillCatalog';
import {resolveSkillAdapter} from '../src/maintenance/skillAdapters';
const read=(path:string)=>readFileSync(path,'utf8');
const wb=read('src/maintenance/MaintenanceWorkbench.tsx');
const dims=read('src/maintenance/FrameDimensionsToolDetails.tsx');
const categories=COMPLETE_ENGINEER_SKILLS;
const audit=completeCatalogAudit();
assert.equal(categories.length,30,'internal inventory remains, not a B navigation step');
assert.equal(FULL_SKILL_SECTIONS.length,6,'historical metadata remains but not rendered');
assert.equal(AB_PROPERTY_BASE_COUNT,184);
assert.equal(audit.existing,169);assert.equal(audit.advanced,12);assert.equal(audit.unregistered,3);
assert.equal(AB_PROPERTY_TOOL_IDS.length,184,'every central tool appears once in the B-property index');
assert.equal(new Set(AB_PROPERTY_TOOL_IDS).size,184,'no tool copied or dropped');
assert.deepEqual(AB_PROPERTY_GROUPS.slice(0,3).map(group=>group.label),['長度','寬度','顏色']);
assert.equal(sizeControlFor('frame','height'),'frame:size');
assert.equal(sizeControlFor('frame','width'),'frame:size');
assert.equal(sizeControlFor('instance','width'),'instance:parent-size');
assert.equal(findAbProperty('color')?.tools.some(tool=>tool.id==='fx-bg-mode'),true);
assert.ok(searchAbProperties('漸層').some(group=>group.id==='color'));
assert.ok(searchAbProperties('損益色').some(group=>group.id==='color'));
assert.ok(searchAbProperties('文字').some(group=>group.id==='text'));
assert.ok(wb.includes('A｜{label}'),'A must be the real selected frame/component');
assert.ok(wb.includes('searchAbProperties(query)')&&wb.includes('visibleB.map(group=><Pressable'),
  'B must be attributes, not a skills or six-group catalog');
assert.ok(!wb.includes('FULL_SKILL_SECTIONS.map'),'no extra classification level');
assert.ok(!wb.includes('currentSection')&&!wb.includes('activeSection'),'no hidden sixth-level page');
assert.ok(wb.includes("selectedB.id==='length'||selectedB.id==='width'"));
assert.ok(wb.includes("axis={selectedB.id==='length'?'height':'width'}"));
assert.ok(dims.includes("axis?:'width'|'height'")&&dims.includes("(!axis||axis==='height')"));
assert.ok(wb.includes('C｜開啟損益色')&&wb.includes('C｜開啟漸層'));
assert.ok(wb.includes('backgroundProfitColor:next')&&wb.includes("backgroundMode:next?'gradient':'solid'"),
  'C toggles must change the actual native frame draft');
assert.ok(wb.includes('FrameEffectsToolDetails field="gradientEndColor"'),
  'gradient settings remain conditional inside the SAME C layer');
assert.ok(wb.includes('<AbToolControls tools={tools}')&&wb.includes('tool={tool} instance={instance}'),
  'non-example tools are reachable within B property groups through the native adapter');
assert.ok(wb.includes('setOpenC(null)')&&wb.includes('setMoreColor(false)'),
  'changing B closes the previous C controls');
assert.ok(!wb.includes('selectedTool?<View'),'simple C controls must not force a D navigation page');
assert.ok(wb.includes('maintenance.apply()')&&wb.includes('maintenance.cancel()'));
const sync=categories.flatMap(x=>x.tools).find(x=>x.id==='added-style-sync')!;
assert.equal(resolveSkillAdapter(sync,{scope:'target',kind:'metric',page:'home',frameKey:'dashboard'}).status,'active');
assert.ok(wb.includes("if(tool.field==='instance:sync')")&&wb.includes('maint.setSyncScope(scope)'));
const app=JSON.parse(read('app.json')),pkg=JSON.parse(read('package.json'));
assert.equal(pkg.version,'3.0.21');assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30021);assert.equal(app.expo.ios.buildNumber,'30021');
assert.ok(read('.github/workflows/ci.yml').includes('TF-Asset-V3.0.21-QA.apk'));
for(const path of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])assert.ok(read(path).length>0);
console.log('V3.0.17 AB actual A → B length/width/color → C direct size/profit/gradient: PASS');
console.log('All 184 central tools indexed once; no extra navigation tier; accounting core left immutable: PASS');
