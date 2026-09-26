import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SIMULATION_STATES,SIMULATION_LABELS,simulatedVisualTone,normalizeSimulationState,resolveNativeMetricTones} from '../src/maintenance/dataSimulation';
import {linkedColor} from '../src/maintenance/workspaceModel';
import {applyConditionalAppearance} from '../src/maintenance/conditionalVisual';
import {COMPLETE_ENGINEER_SKILLS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import {AB_PROPERTY_TOOL_IDS} from '../src/maintenance/abPropertyModel';
import {resolveSkillAdapter} from '../src/maintenance/skillAdapters';
const read=(p:string)=>readFileSync(p,'utf8');
assert.deepEqual(SIMULATION_STATES,['actual','gain','loss','neutral','loading','stale','error']);
assert.equal(new Set(SIMULATION_STATES).size,7);
for(const state of SIMULATION_STATES)assert.ok(SIMULATION_LABELS[state].length>0);
assert.equal(simulatedVisualTone('gain','loss'),'gain');
assert.equal(simulatedVisualTone('loss','gain'),'loss');
assert.equal(simulatedVisualTone('neutral','gain'),'neutral');
for(const state of ['actual','loading','stale','error'] as const)
 assert.equal(simulatedVisualTone(state,'gain'),'gain','non-tone scenarios cannot create synthetic gains');
assert.equal(normalizeSimulationState({actual_fee:100}),'actual');
assert.equal(normalizeSimulationState('profit'),'actual');
// Behavioral regression: a real loss previewed as gain must reach native metric
// fallback AND profit-linked palette. Non-simulated/manual override stays intact.
const palette={gainColor:'#F23030',lossColor:'#168F35',neutralColor:'#687089'};
const simulated=resolveNativeMetricTones('loss','loss','gain');
assert.deepEqual(simulated,{linked:'gain',fallback:'gain'});
assert.equal(linkedColor('#000000',true,simulated.linked,palette),palette.gainColor);
assert.deepEqual(resolveNativeMetricTones('loss','gain',undefined),{linked:'gain',fallback:'loss'});
assert.deepEqual(resolveNativeMetricTones('gain','auto','neutral'),{linked:'neutral',fallback:'neutral'});
const sample=applyConditionalAppearance({textColor:'#000000',textProfitColor:true,
  conditionalStyles:{gain:{enabled:true,textColor:'#ABCDEF'}}},simulated.linked);
assert.equal(sample.textColor,'#ABCDEF');assert.equal(sample.textProfitColor,false);
const all=COMPLETE_ENGINEER_SKILLS.flatMap(s=>s.tools),audit=completeCatalogAudit();
assert.equal(all.length,184);assert.equal(AB_PROPERTY_TOOL_IDS.length,184);
assert.equal(audit.readyDeclared,156);assert.equal(audit.pending,28);
const tool=all.find(t=>t.id==='advanced-data-simulation')!;
assert.equal(tool.status,'ready');assert.equal(tool.field,'maintenance:data-simulation');
for(const kind of ['metric','text','value','prefix','generic'] as const)
 assert.equal(resolveSkillAdapter(tool,{scope:'target',kind,page:'home',frameKey:'asset-dashboard'}).status,'active');
assert.equal(resolveSkillAdapter(tool,{scope:'frame',page:'home',frameKey:'asset-dashboard'}).status,'pending-adapter');
assert.equal(resolveSkillAdapter(tool,{scope:'target',kind:'control',page:'home',frameKey:'asset-dashboard'}).status,'pending-adapter');
const rt=read('src/maintenance/MaintenanceRuntime.tsx'),native=read('src/maintenance/InspectableTarget.tsx');
const ui=read('src/maintenance/DataSimulationToolDetails.tsx'),wb=read('src/maintenance/MaintenanceWorkbench.tsx');
const stack=read('src/components/PageEditorStack.tsx'),metric=read('src/components/MetricTile.tsx');
assert.equal((rt.match(/previewState:'actual'/g)??[]).length,4,
 'both new-session constructors and both A-switch paths must reset sandbox');
assert.ok(rt.includes('setPreviewState:state=>setSession('));
assert.ok(rt.includes('current.target.kind')&&rt.includes('setSession(null)'));
const serialized=rt.slice(rt.indexOf('await AsyncStorage.setItem(MAINTENANCE_STORAGE_KEY,JSON.stringify({'));
assert.ok(serialized.length>0&&serialized.includes('visualHistory:nextHistory')&&
 !serialized.split('}));',1)[0]!.includes('previewState'),'scenario can never enter persisted storage');
assert.ok(native.includes('editing&&engineer.enabled')&&native.includes('simulatedVisualTone(previewState,actualTone)'));
assert.ok(native.includes('模擬預覽｜')&&native.includes('真實資料及已儲存設定未變更'));
assert.ok(native.includes('children(resolvedAppearance,customized,override,renderContext)'));
assert.ok(stack.includes('simulationTone:render.displayTone')&&
  stack.includes('applyConditionalAppearance(override,render.displayTone)'));
assert.ok(stack.includes('activeConditionalRule(override.conditionalStyles,render.displayTone)'));
assert.ok(metric.includes('resolveNativeMetricTones(tone,editorStyle?.profitToneOverride,simulationTone)'));
assert.ok(metric.includes("tone!=='default'||simulationTone?toneColor"));
assert.ok(ui.includes('m.setPreviewState(state)')&&ui.includes('SIMULATION_STATES.map'));
assert.ok(wb.includes("if(tool.field==='maintenance:data-simulation')return <DataSimulationToolDetails/>"));
const backup=read('src/settings/BackupService.ts');assert.ok(backup.includes('key.startsWith(PREFIX)'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.30');assert.equal(app.expo.version,'3.0.30');
assert.equal(app.expo.android.versionCode,30030);assert.equal(app.expo.ios.buildNumber,'30030');
const wf=read('.github/workflows/ci.yml');
assert.ok(wf.includes('TF-Asset-V3.0.30-QA.apk')&&wf.includes("github.head_ref == 'go-v3.0.30-20260927-adaptive-frame-density'"));
for(const p of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])assert.ok(read(p).length>0);
console.log('V3.0.30 native A simulation: seven sandbox states, readonly source, no persistence, AB and finance PASS');
console.log('184 central skills / 150 declared wired / 34 pending / actual device separate');
