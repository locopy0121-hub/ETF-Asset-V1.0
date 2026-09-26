import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BATCH_VISUAL_FIELDS,safeBatchPatch,batchPlan,visualChanges,frameHealth} from '../src/maintenance/advancedSkillEngine';
import {TARGET_APPEARANCE,normalizeTargetOverride} from '../src/maintenance/inspectionModel';
import {COMPLETE_ENGINEER_SKILLS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import {AB_PROPERTY_TOOL_IDS} from '../src/maintenance/abPropertyModel';
import {resolveSkillAdapter} from '../src/maintenance/skillAdapters';
const read=(path:string)=>readFileSync(path,'utf8');
const all=COMPLETE_ENGINEER_SKILLS.flatMap(group=>group.tools);
const audit=completeCatalogAudit();
assert.equal(all.length,184);
assert.equal(AB_PROPERTY_TOOL_IDS.length,184);
assert.equal(new Set(all.map(t=>t.id)).size,184);
assert.equal(audit.existing,169);assert.equal(audit.advanced,12);assert.equal(audit.unregistered,3);
assert.equal(audit.pending,33,'legacy history now native: 37 declared pending');
assert.equal(audit.readyDeclared,151);
const ids=['advanced-batch','advanced-local-diff','advanced-health'];
for(const id of ids)assert.equal(all.find(tool=>tool.id===id)?.status,'ready');
assert.equal(all.filter(tool=>tool.id.startsWith('advanced-')&&tool.status==='ready').length,7);
const metric={scope:'target' as const,kind:'metric' as const,page:'home',frameKey:'asset-dashboard'};
assert.equal(resolveSkillAdapter(all.find(t=>t.id==='advanced-batch')!,metric).status,'active');
assert.equal(resolveSkillAdapter(all.find(t=>t.id==='advanced-batch')!,
 {scope:'frame',page:'home',frameKey:'asset-dashboard'}).status,'pending-adapter');
assert.equal(resolveSkillAdapter(all.find(t=>t.id==='advanced-local-diff')!,
 {scope:'frame',page:'home',frameKey:'asset-dashboard'}).status,'active');
assert.equal(resolveSkillAdapter(all.find(t=>t.id==='advanced-health')!,metric).status,'active');
// Only direct visual fields are writable by batch. Malicious data keys are discarded.
const source={...TARGET_APPEARANCE,fontSize:27,textColor:'#123456',backgroundColor:'#FF0000',
 backgroundOpacity:0.4,shadowEnabled:true,glowEnabled:true,width:320,height:80,
 actual_fee:1,tax:2,shares:2000};
const keys=['fontSize','textColor','backgroundColor','backgroundOpacity','shadowEnabled',
 'glowEnabled','width','height','actual_fee','tax','shares'] as typeof BATCH_VISUAL_FIELDS[number][0][];
const patch=safeBatchPatch(source,keys);
assert.deepEqual(patch,{fontSize:27,textColor:'#123456',backgroundColor:'#FF0000',
 backgroundOpacity:0.4,shadowEnabled:true,glowEnabled:true,width:320,height:80});
assert.ok(!('actual_fee' in patch)&&!('shares' in patch)&&!('tax' in patch));
const base={...TARGET_APPEARANCE};
const selected=[
 {id:'metric:1',label:'資產卡',kind:'metric' as const,base},
 {id:'control:1',label:'功能按鈕',kind:'control' as const,base},
];
const plans=batchPlan(source,['fontSize','backgroundColor','glowEnabled'],selected,()=>({}));
assert.equal(plans.length,2);
assert.deepEqual(Object.keys(plans[0]!.patch).sort(),['backgroundColor','fontSize','glowEnabled']);
assert.ok(plans[1]!.unsupported.includes('glowEnabled'),'a renderer without glow cannot be marked applied');
assert.equal(plans[1]!.patch.glowEnabled,undefined);
assert.equal(plans[0]!.changes.find(x=>x.field==='backgroundColor')?.after,'#FF0000');
assert.equal(batchPlan(source,['backgroundColor'],[selected[0]!],
  ()=>({backgroundColor:'#FF0000'}))[0]!.changes.length,0,'identical style must not create fake diff');
assert.deepEqual(visualChanges({fontSize:12,actual_fee:777},{fontSize:24,actual_fee:111}),
 [{field:'fontSize',label:'字號',before:12,after:24}],'visual diff must never expose financial changes');
assert.ok(visualChanges({width:320,effects:{backgroundMode:'solid'}},
 {width:400,effects:{backgroundMode:'gradient'}},true).some(x=>x.field==='effects'));
const issues=frameHealth({width:320,height:400},[
 {id:'a',label:'按鈕A',kind:'action',rect:{x:5,y:5,width:36,height:36}},
 {id:'b',label:'按鈕B',kind:'action',rect:{x:25,y:5,width:100,height:44}},
 {id:'m',label:'卡片',kind:'metric',rect:{x:280,y:250,width:90,height:60}},
]);
assert.ok(issues.some(x=>x.id==='a'&&x.type==='touch'));
assert.ok(issues.some(x=>x.id==='a'&&x.type==='overlap'));
assert.ok(issues.some(x=>x.id==='m'&&x.type==='overflow'));
assert.deepEqual(frameHealth({width:0,height:0},[]),[],'missing bounds must not be reported as PASS');
const runtime=read('src/maintenance/MaintenanceRuntime.tsx');
const inspector=read('src/maintenance/InspectableTarget.tsx');
const workbench=read('src/maintenance/MaintenanceWorkbench.tsx');
const controls=read('src/maintenance/AdvancedEngineerTools.tsx');
assert.ok(runtime.includes('registerTarget,unregisterTarget')&&inspector.includes('engineer.registerTarget('),
 'batch candidates must come from actual mounted native target registry');
assert.ok(runtime.includes('const kind=candidates.get(id);if(!kind)continue'),
 'unknown or other-frame target IDs must not be editable');
assert.ok(runtime.includes("targetToolSupported(kind,'target:'+field)"),
 'every destination needs a real native renderer for that visual field');
assert.ok(runtime.includes('session.batchLocalOverrides')&&runtime.includes('nextLocalOnly[keyForId]'),
 'explicit batch preview and persistence must beat stale shared style and stay local');
assert.ok(runtime.includes('const patch=safeBatchPatch(source,keys)'),
 'transactional batch must use the strict financial-safe whitelist');
assert.ok(runtime.includes('await AsyncStorage.setItem(MAINTENANCE_STORAGE_KEY')&&
 runtime.indexOf('await AsyncStorage.setItem(MAINTENANCE_STORAGE_KEY')<
 runtime.indexOf('editor.replacePageConfig(normalized)'));
assert.ok(workbench.includes("tool.field==='maintenance:batch'")&&
 workbench.includes("tool.field==='maintenance:local-diff'")&&
 workbench.includes("tool.field==='maintenance:health'"));
assert.ok(controls.includes('C｜套用前差異預覽')&&controls.includes('maint.patchBatchVisual('));
assert.ok(controls.includes('getSavedTargetOverride')&&controls.includes('getFrameRects'));
assert.ok(workbench.includes('searchAbProperties(query)')&&workbench.includes('visibleB.map(group=><Pressable'),
 'V3.0.16 accepted AB must NOT become a skill-category menu');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.25');assert.equal(app.expo.version,'3.0.25');
assert.equal(app.expo.android.versionCode,30025);assert.equal(app.expo.ios.buildNumber,'30025');
assert.ok(read('.github/workflows/ci.yml').includes('TF-Asset-V3.0.25-QA.apk'));
for(const file of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
 assert.ok(read(file).length>0,'locked accounting core missing: '+file);
console.log('V3.0.17 advanced: real multi-target visual batch, diff, measured health / AB unchanged: PASS');
