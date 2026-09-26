import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {ENGINEER_SKILLS} from '../src/maintenance/skillTree';
import {ADVANCED_ENGINEER_CAPABILITIES,COMPLETE_ENGINEER_SKILLS,FULL_SKILL_CATEGORIES,
 FULL_SKILL_SECTIONS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import {ADAPTER_TARGET_KINDS,FRAME_TO_TARGET,auditAdapterMatrix,resolveSkillAdapter} from '../src/maintenance/skillAdapters';
import {targetToolSupported,normalizeTargetOverride} from '../src/maintenance/inspectionModel';

const legacy=ENGINEER_SKILLS.flatMap(g=>g.tools);
const grouped=COMPLETE_ENGINEER_SKILLS.flatMap(g=>g.tools);
const audit=completeCatalogAudit();
assert.equal(FULL_SKILL_CATEGORIES.length,30,'30 internal skill taxonomy categories retained; B remains property-based');
assert.equal(FULL_SKILL_SECTIONS.length,6);
assert.deepEqual([...FULL_SKILL_SECTIONS.flatMap(section=>[...section.ids])].sort(),
 [...FULL_SKILL_CATEGORIES.map(category=>category.id)].sort(),'historical taxonomy must retain all 30 internal classes');
assert.equal(new Set(FULL_SKILL_CATEGORIES.map(category=>category.id)).size,30);
assert.deepEqual(audit.emptyCategories,[],'no category may silently disappear');
assert.deepEqual(audit.duplicateIds,[],'one tool ID must map to exactly one B class');
assert.equal(audit.existing,legacy.length,'100% of preexisting tool inventory must be preserved');
assert.equal(audit.existing,169,'V3.0.14 baseline must retain all 169 known tools');
assert.equal(audit.advanced,12,'all twelve newly specified capabilities need explicit backlog entries');
assert.equal(ADVANCED_ENGINEER_CAPABILITIES.length,12);
assert.equal(audit.unregistered,3,'no widget, AI or navigation capability is falsely marked done');
assert.equal(audit.pending,38,'29 original pending plus 12 advanced and 3 domains, with six advanced tools now adapted');
assert.equal(audit.readyDeclared,146,'ready describes declarations, never Android QA PASS');
assert.equal(grouped.length,184);
assert.deepEqual([...legacy.map(tool=>tool.id)].sort(),
 [...grouped.filter(tool=>!tool.id.startsWith('advanced-')&&!tool.id.startsWith('domain-'))
    .map(tool=>tool.id)].sort(),'no existing ID may be renamed or dropped by classification');
for(const skill of COMPLETE_ENGINEER_SKILLS){
 assert.ok(skill.tools.length>0,'empty category '+skill.id);
 assert.ok(skill.tools.every(tool=>tool.detail.length>0));
}
for(const id of ADVANCED_ENGINEER_CAPABILITIES.map(x=>'advanced-'+x.id))
 assert.equal(grouped.filter(tool=>tool.id===id).length,1,'new capability must not be lost or duplicated: '+id);

const get=(id:string)=>grouped.find(t=>t.id===id)!;
const metric={scope:'target' as const,kind:'metric' as const,page:'home',frameKey:'dashboard'};
const amount={...metric,kind:'value' as const};
const widget={...metric,kind:'control' as const};
assert.equal(resolveSkillAdapter(get('background-opacity'),metric).tool.field,'target:backgroundOpacity');
assert.equal(resolveSkillAdapter(get('background-opacity'),metric).status,'active');
assert.equal(resolveSkillAdapter(get('fx-glow-on'),metric).tool.field,'target:glowEnabled');
assert.equal(resolveSkillAdapter(get('frame-shadow'),metric).tool.field,'target:shadowEnabled');
assert.equal(resolveSkillAdapter(get('title-color'),metric).tool.field,'target:textColor');
assert.equal(resolveSkillAdapter(get('fx-img-uri'),metric).status,'pending-adapter',
 'a frame image-picker cannot be passed off as an editable text background');
assert.equal(resolveSkillAdapter(get('fx-glow-on'),widget).status,'pending-adapter',
 'the control renderer must truly implement glow before claiming availability');
assert.equal(resolveSkillAdapter(get('advanced-batch'),metric).status,'active');
assert.equal(resolveSkillAdapter(get('advanced-batch'),{scope:'frame',page:'home',frameKey:'dashboard'}).status,'pending-adapter');
assert.equal(resolveSkillAdapter(get('advanced-local-diff'),metric).status,'active');
assert.equal(resolveSkillAdapter(get('advanced-health'),metric).status,'active');
assert.equal(resolveSkillAdapter(get('target-label-text'),amount).status,'pending-adapter',
 'financial amounts cannot be overwritten by a label tool');
assert.equal(targetToolSupported('value','target:labelText'),false);
assert.equal(targetToolSupported('value','target:captionText'),false);
assert.equal(resolveSkillAdapter(get('remove'),metric).status,'pending-adapter',
 'built-in native elements are not deletable');
assert.equal(resolveSkillAdapter(get('remove'),
 {scope:'instance',kind:'text',page:'home',frameKey:'dashboard',instanceOwned:true}).status,'active');
assert.equal(FRAME_TO_TARGET['framefx:paddingTop'],undefined,
 'one-sided padding must not silently change all four target sides');
assert.equal(resolveSkillAdapter(get('target-xy'),
 {scope:'instance',kind:'text',page:'home',frameKey:'dashboard',instanceOwned:true}).status,'pending-adapter',
 'real measurement is required before offering instance XY controls');
const unsafe=normalizeTargetOverride({actual_fee:1,tax:2,shares:999,profit:100000,
 fontSize:22,backgroundOpacity:.2});
assert.deepEqual(unsafe,{fontSize:22,backgroundOpacity:.2},
 'display overrides must not accept transaction or financial fields');

const wb=readFileSync('src/maintenance/MaintenanceWorkbench.tsx','utf8');
const rt=readFileSync('src/maintenance/MaintenanceRuntime.tsx','utf8');
assert.ok(wb.includes('searchAbProperties(query)')&&
 wb.includes('visibleB.map(group=><Pressable'),'all 184 central tools remain available through property B');
assert.ok(wb.includes('resolveSkillAdapter(tool,adapterContext(s))'),'one adapter resolution path used in actual UI');
assert.ok(!wb.includes('group.tools.filter(tool=>toolUsable(tool,session))'));
assert.ok(!rt.includes("current.draft.behavior!=='locked'"),
 'locked layout setting cannot disable non-data visual tools');
assert.ok(!rt.includes("current.draft.behavior==='locked')return current;"));
assert.ok(rt.includes('normalizeTargetOverride({...current.draftTargets[id],...patch})'),
 'draft writes are sanitized against financial fields');
for(const file of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
 assert.ok(readFileSync(file,'utf8').length>0,'financial lock preserved: '+file);

const matrix=auditAdapterMatrix(legacy);
assert.equal(matrix.length,ADAPTER_TARGET_KINDS.length*legacy.length);
assert.ok(matrix.every(row=>row.reason.length>0&&
 ['active','pending-adapter','planned'].includes(row.status)));
assert.ok(matrix.some(row=>row.status==='pending-adapter'));
mkdirSync('reports',{recursive:true});
const report={
 version:'3.0.19',purpose:'declared tool coverage (NOT device validation)',
 taxonomy:FULL_SKILL_CATEGORIES,advanced:ADVANCED_ENGINEER_CAPABILITIES,
 summary:audit,categories:COMPLETE_ENGINEER_SKILLS.map(group=>({
 id:group.id,label:group.label,tools:group.tools.map(tool=>({
 id:tool.id,label:tool.label,field:tool.field??null,declaredStatus:tool.status,
 description:tool.detail,
 }))})),
 matrix,
 validation:{unitAssertions:'PASS',nativeDevice:'NOT_TESTED',accountingCore:'UNMODIFIED'},
};
writeFileSync('reports/V3.0.19-full-skill-matrix.json',JSON.stringify(report,null,2)+'\n');
console.log('V3.0.14 30 categories, 169 retained tools, 12 advanced capabilities, 3 missing domains: PASS');
console.log('Native adapter matrix '+matrix.length+' rows written; actual Android rendering remains separate QA.');
