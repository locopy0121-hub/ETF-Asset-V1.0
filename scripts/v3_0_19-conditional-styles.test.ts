import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeConditionalStyles,activeConditionalRule,applyConditionalAppearance} from '../src/maintenance/conditionalVisual';
import {TARGET_APPEARANCE,normalizeTargetOverride,normalizeTargetMap,resetTargetVisualOverride,targetToolSupported} from '../src/maintenance/inspectionModel';
import {COMPLETE_ENGINEER_SKILLS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import {AB_PROPERTY_TOOL_IDS,AB_PROPERTY_GROUPS} from '../src/maintenance/abPropertyModel';
import {resolveSkillAdapter} from '../src/maintenance/skillAdapters';
const read=(path:string)=>readFileSync(path,'utf8');
const all=COMPLETE_ENGINEER_SKILLS.flatMap(group=>group.tools),audit=completeCatalogAudit();
assert.equal(all.length,184);assert.equal(AB_PROPERTY_TOOL_IDS.length,184);
assert.equal(new Set(AB_PROPERTY_TOOL_IDS).size,184);
assert.equal(audit.readyDeclared,149);assert.equal(audit.pending,35);
assert.equal(audit.existing,169);assert.equal(audit.advanced,12);assert.equal(audit.unregistered,3);
assert.equal(AB_PROPERTY_GROUPS.find(x=>x.id==='effects')?.tools.some(t=>t.id==='advanced-conditional-style'),true);
const tool=all.find(item=>item.id==='advanced-conditional-style')!;
assert.equal(tool.field,'maintenance:conditional-style');assert.equal(tool.status,'ready');
const at=(scope:'frame'|'instance'|'target',kind:'metric'|'text'|'control'|'frame',owned=false)=>
 resolveSkillAdapter(tool,{scope,kind,page:'home',frameKey:'asset-dashboard',instanceOwned:owned}).status;
assert.equal(at('target','metric'),'active');
assert.equal(at('target','text'),'active');
assert.equal(at('instance','text',true),'active');
assert.equal(at('frame','frame'),'pending-adapter');
assert.equal(at('target','control'),'pending-adapter');
assert.equal(at('instance','text',false),'pending-adapter');
const dirty={
 gain:{enabled:true,textColor:'#aa1133',backgroundColor:'#abc123',borderColor:'#abcdef',
  backgroundOpacity:8,actual_fee:88,tax:99,shares:999,amount:123,visible:false,width:400,
  labelText:'overwrite',offsetX:240},
 loss:{enabled:true,textColor:'javascript:attack',backgroundColor:'#ff0000',
  backgroundOpacity:-12,profitToneOverride:'gain'},
 neutral:{enabled:false,textColor:'#FFFFFF',evil:'data'},
 extra:{enabled:true,textColor:'#000000'},
};
const rules=normalizeConditionalStyles(dirty);
assert.deepEqual(Object.keys(rules),['gain','loss','neutral']);
assert.deepEqual(rules.gain,{enabled:true,textColor:'#AA1133',backgroundColor:'#ABC123',
 borderColor:'#ABCDEF',backgroundOpacity:1});
assert.deepEqual(rules.loss,{enabled:true,backgroundColor:'#FF0000',backgroundOpacity:0});
assert.deepEqual(rules.neutral,{enabled:false,textColor:'#FFFFFF'});
assert.equal(normalizeConditionalStyles({gain:{enabled:'true',textColor:'red'}}).gain?.enabled,false);
assert.deepEqual(normalizeConditionalStyles(['bad']),{});
assert.equal(activeConditionalRule(rules,'neutral'),null);
const original={...TARGET_APPEARANCE,backgroundColor:'#112233',backgroundProfitColor:true,
 borderProfitColor:true,textProfitColor:true,useProfitColor:true,conditionalStyles:rules};
const gain=applyConditionalAppearance(original,'gain');
assert.equal(gain.backgroundColor,'#ABC123');assert.equal(gain.textColor,'#AA1133');
assert.equal(gain.borderColor,'#ABCDEF');assert.equal(gain.backgroundOpacity,1);
assert.equal(gain.backgroundProfitColor,false);assert.equal(gain.borderProfitColor,false);
assert.equal(gain.textProfitColor,false);assert.equal(gain.useProfitColor,false);
assert.equal(original.backgroundColor,'#112233','rule rendering must never mutate source appearance');
const loss=applyConditionalAppearance(original,'loss');
assert.equal(loss.backgroundColor,'#FF0000');assert.equal(loss.backgroundOpacity,0);
assert.equal(loss.textColor,original.textColor,'unconfigured fields inherit original appearance');
assert.strictEqual(applyConditionalAppearance(original,'neutral'),original,'disabled condition does not wrap or alter normal display');
const sanitized=normalizeTargetOverride({conditionalStyles:dirty,actual_fee:11,tax:12,shares:12,labelText:'safe?'}); 
assert.deepEqual(sanitized.conditionalStyles,rules);
assert.equal('actual_fee' in sanitized,false);assert.equal('tax' in sanitized,false);
const saved=normalizeTargetMap({'home:asset-dashboard':{'metric:profit':sanitized}})['home:asset-dashboard']!['metric:profit']!;
assert.deepEqual(saved.conditionalStyles,rules,'full backup and saved target map must hydrate conditional rules');
assert.equal(resetTargetVisualOverride(saved).conditionalStyles,undefined,'visual reset removes conditional rules but preserves independent content');
assert.equal(targetToolSupported('metric','target:conditionalStyles'),true);
assert.equal(targetToolSupported('value','target:conditionalStyles'),true);
assert.equal(targetToolSupported('control','target:conditionalStyles'),false);
const inspector=read('src/maintenance/InspectableTarget.tsx');
const stack=read('src/components/PageEditorStack.tsx');
const editor=read('src/maintenance/ConditionalStyleToolDetails.tsx');
const wb=read('src/maintenance/MaintenanceWorkbench.tsx');
const runtime=read('src/maintenance/MaintenanceRuntime.tsx');
assert.ok(inspector.includes('applyConditionalAppearance(mergeTargetAppearance(target.base,override),actualTone)'));
assert.ok(inspector.includes('activeConditionalRule(override.conditionalStyles,actualTone)'));
assert.ok(stack.includes('editorStyle:applyConditionalAppearance(override,'));
assert.ok(stack.includes('<MetricTile {...props}'),'existing metric numeric value must be passed through verbatim');
assert.ok(editor.includes('maintenance.patchTarget(id,{conditionalStyles:updated})'));
assert.ok(editor.includes('maintenance.patchTarget(id,{conditionalStyles:normalizeConditionalStyles(next)})'));
assert.ok(editor.includes('actualTone=target?.profitTone??\'neutral\''));
assert.ok(editor.includes('目前真實資料不是此狀態')&&editor.includes('不製造假行情'));
assert.ok(wb.includes("if(tool.field==='maintenance:conditional-style')return <ConditionalStyleToolDetails/>"));
assert.ok(!wb.includes('FULL_SKILL_SECTIONS.map'),'do not add an AB navigation layer');
assert.ok(runtime.includes('normalizeTargetOverride({...current.draftTargets[id],...patch})'));
assert.ok(runtime.includes('cancel:()=>{setSession(null);setSelection(null);}'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.23');assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30023);assert.equal(app.expo.ios.buildNumber,'30023');
assert.ok(read('.github/workflows/ci.yml').includes('TF-Asset-V3.0.23-QA.apk'));
for(const file of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
 assert.ok(read(file).length>0);
console.log('V3.0.23 true-tone conditional style / 184 catalog / financial isolation / native metric & text: PASS');
