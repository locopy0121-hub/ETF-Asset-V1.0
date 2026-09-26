import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {appendVisualHistory,frameVisualSnapshot,targetVisualSnapshot,normalizeVisualHistory,
 visualHistoryKey,restoreFrameVisual,restoreTargetVisual,hasVisualDifference} from '../src/maintenance/visualHistory';
import {TARGET_APPEARANCE,normalizeTargetOverride} from '../src/maintenance/inspectionModel';
import {COMPLETE_ENGINEER_SKILLS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import {AB_PROPERTY_TOOL_IDS} from '../src/maintenance/abPropertyModel';
import {resolveSkillAdapter} from '../src/maintenance/skillAdapters';
import type {FrameEditorConfig} from '../src/editor/editorModel';

const read=(file:string)=>readFileSync(file,'utf8');
const all=COMPLETE_ENGINEER_SKILLS.flatMap(group=>group.tools);
const audit=completeCatalogAudit();
assert.equal(all.length,184);
assert.equal(AB_PROPERTY_TOOL_IDS.length,184);
assert.equal(new Set(all.map(tool=>tool.id)).size,184);
assert.equal(audit.existing,169);assert.equal(audit.advanced,12);assert.equal(audit.unregistered,3);
assert.equal(audit.readyDeclared,150);assert.equal(audit.pending,34,
  'V3.0.24 wires exactly one existing legacy history tool, not an invented new category');

const historyTool=all.find(tool=>tool.id==='history')!;
assert.equal(historyTool.status,'ready');
assert.equal(historyTool.field,'maintenance:visual-history');
const context={page:'home',frameKey:'asset-dashboard'} as const;
assert.equal(resolveSkillAdapter(historyTool,{...context,scope:'frame'}).status,'active');
assert.equal(resolveSkillAdapter(historyTool,{...context,scope:'target',kind:'metric'}).status,'active');
assert.equal(resolveSkillAdapter(historyTool,{...context,scope:'instance',kind:'text',instanceOwned:true}).status,
 'active','V3.0.24 adds owned installed instance visual history without a new catalog tool');

const frameKey=visualHistoryKey('frame','home','asset-dashboard')!;
const targetKey=visualHistoryKey('target','home','asset-dashboard','metric:profit')!;
assert.equal(frameKey,'frame:home:asset-dashboard');
assert.equal(targetKey,'target:home:asset-dashboard:metric:profit');
assert.equal(visualHistoryKey('target','home','asset-dashboard'),null);
assert.equal(visualHistoryKey('frame','fake','asset-dashboard'),null);
assert.equal(visualHistoryKey('frame','home','../../../ledger'),null);
assert.equal(visualHistoryKey('target','home','asset-dashboard','\n'),null);

const unsafeFrame={
 visible:true,order:3,layout:'compact',appearance:'soft',behavior:'manual',
 titleFontSize:22,titleColor:'#AABBCC',titleAlign:'center',
 backgroundColor:'#abc123',backgroundOpacity:0.4,borderColor:'#123456',
 borderWidth:3,borderRadius:9,shadowEnabled:false,shadowOpacity:.2,
 width:400,height:290,effects:{backgroundMode:'gradient',gradientEndColor:'#bad123'},
 actual_fee:100,shares:999,price:300,secretToken:'secret',onPress:'UNSAFE',
} as unknown as FrameEditorConfig;
const frame=frameVisualSnapshot(unsafeFrame);
for(const forbidden of ['actual_fee','shares','price','secretToken','onPress','order','behavior','visible','layout','appearance'])
 assert.equal(forbidden in frame,false,forbidden+' must never enter a visual revision');
assert.equal(frame.backgroundColor,'#ABC123');
assert.equal(frame.width,400);
assert.equal(frame.height,290);
assert.equal((frame.effects as {backgroundMode:string}).backgroundMode,'gradient');
const restoredFrame=restoreFrameVisual({...unsafeFrame,backgroundColor:'#FFFFFF',width:600,visible:false,order:8},frame);
assert.equal(restoredFrame.backgroundColor,'#ABC123');
assert.equal(restoredFrame.width,400);
assert.equal(restoredFrame.visible,false,'history must not touch visibility');
assert.equal(restoredFrame.order,8,'history must not reorder frames');
assert.equal((restoredFrame as unknown as Record<string,unknown>).actual_fee,100,'history cannot edit hidden financial source');
const withOptionalRemoved=restoreFrameVisual({...unsafeFrame,height:1234}, {titleFontSize:17});
assert.equal(withOptionalRemoved.height,undefined,'earlier auto-size snapshot removes only optional dimensions');
assert.equal(withOptionalRemoved.backgroundColor,unsafeFrame.backgroundColor,
 'malformed or partial snapshot cannot erase required native colors');

const original=normalizeTargetOverride({
 fontSize:19,textColor:'#112233',backgroundOpacity:.25,conditionalStyles:{
  gain:{enabled:true,textColor:'#AABBCC'}},
 actual_fee:27,shares:55,visible:false,labelText:'Original',
});
const target=targetVisualSnapshot(original);
assert.equal(target.fontSize,19);
assert.deepEqual(target.conditionalStyles,{gain:{enabled:true,textColor:'#AABBCC'}});
assert.equal('actual_fee' in target,false);
assert.equal('visible' in target,false,'visibility is not in visual history');
assert.equal('labelText' in target,false,'labels remain immutable through history');
const present=normalizeTargetOverride({
 fontSize:41,textColor:'#FFFFFF',visible:false,labelText:'Original',prefixText:'NT$',
 offsetX:41,profitToneOverride:'loss',actual_fee:1,
});
const restored=restoreTargetVisual(present,target);
assert.equal(restored.fontSize,19);
assert.equal(restored.textColor,'#112233');
assert.equal(restored.conditionalStyles?.gain?.textColor,'#AABBCC');
assert.equal(restored.visible,false);
assert.equal(restored.labelText,'Original');
assert.equal(restored.prefixText,'NT$');
assert.equal(restored.offsetX,41);
assert.equal(restored.profitToneOverride,'loss');
assert.equal('actual_fee' in restored,false,'untrusted finance field cannot survive a revision');
const empty=restoreTargetVisual(present,{});
assert.equal(empty.fontSize,undefined);
assert.equal(empty.visible,false);
assert.equal(empty.labelText,'Original');
assert.equal(empty.offsetX,41);

let history=appendVisualHistory({},frameKey,'frame',frame,100,'version-1');
assert.equal(history[frameKey]?.length,1);
history=appendVisualHistory(history,frameKey,'frame',frame,101,'duplicate');
assert.equal(history[frameKey]?.length,1,'equal consecutive visuals must not duplicate');
for(let i=0;i<16;i++)history=appendVisualHistory(history,frameKey,'frame',
 {...frame,width:400+i},102+i,'version-'+(i+2));
assert.equal(history[frameKey]?.length,10,'each actual A retains at most ten saved visuals');
history=appendVisualHistory(history,targetKey,'target',target,999,'target-version');
assert.equal(history[targetKey]?.length,1,'target history is isolated from parent frame');
assert.equal(history[frameKey]?.length,10);
assert.equal(hasVisualDifference(frame,{...frame,width:780}),true);
assert.equal(hasVisualDifference(frame,{...frame}),false);
const hydrated=normalizeVisualHistory(JSON.parse(JSON.stringify({
 ...history,'unsafe:path':[{id:'INJECTED',at:33,visual:{actual_fee:10}}],
 [targetKey]:[{id:'valid',at:4,visual:{fontSize:22,visible:false,actual_fee:3}},
  {id:'bad',at:'yesterday',visual:target}],
})));
assert.equal('unsafe:path' in hydrated,false);
assert.deepEqual(hydrated[targetKey]?.[0]?.visual,{fontSize:22});
assert.equal(hydrated[targetKey]?.length,1);
assert.equal(normalizeVisualHistory(null)[frameKey],undefined);
const runtime=read('src/maintenance/MaintenanceRuntime.tsx');
const ui=read('src/maintenance/VisualHistoryToolDetails.tsx');
const workbench=read('src/maintenance/MaintenanceWorkbench.tsx');
const backup=read('src/settings/BackupService.ts');
assert.ok(runtime.includes('if(parsed.schema===3)setVisualHistory(normalizeVisualHistory(parsed.visualHistory))'));
assert.ok(runtime.includes('sharedStyles:nextShared,localOnlyKeys:nextLocalOnly,visualHistory:nextHistory'));
assert.ok(runtime.includes('appendVisualHistory(visualHistory,historyId,historyScope,beforeVisual)'));
assert.ok(runtime.includes('if(!entry)return false')&&runtime.includes('syncSameKind:false'));
assert.ok(runtime.includes('setVisualHistory(nextHistory)'),'never call history saved until async storage succeeds');
assert.ok(ui.includes('maintenance.restoreVisualHistory(entry.id)'));
assert.ok(ui.includes('套用')&&ui.includes('還原此版本（僅暫存）'));
assert.ok(workbench.includes("if(tool.field==='maintenance:visual-history')return <VisualHistoryToolDetails/>"));
assert.ok(!workbench.includes('FULL_SKILL_SECTIONS.map'),'strict A real object -> B property -> C action');
assert.ok(backup.includes("key.startsWith(PREFIX)"),'existing SAF backup must include the existing maintenance key');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.24');assert.equal(app.expo.version,'3.0.24');
assert.equal(app.expo.android.versionCode,30024);
assert.equal(app.expo.ios.buildNumber,'30024');
assert.ok(read('.github/workflows/ci.yml').includes('TF-Asset-V3.0.24-QA.apk'));
for(const locked of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
 assert.ok(read(locked).length>0,'immutable core remains present: '+locked);
console.log('V3.0.24 A-only local visual history: sanitization/restore/capping/real adapter/backup PASS');
console.log('184 catalog / 150 wired declarations / 34 pending / locked finance and AB regression PASS');
