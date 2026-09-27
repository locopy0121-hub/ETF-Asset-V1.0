import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CENTRAL_COMPONENT_LIBRARY,instantiateComponent,normalizeInstances} from '../src/maintenance/componentLibrary';
import {TARGET_APPEARANCE,VISUAL_TARGET_KEYS,mergeTargetAppearance,
  normalizeTargetOverride,targetToolSupported} from '../src/maintenance/inspectionModel';
import {ENGINEER_SKILLS} from '../src/maintenance/skillTree';
const read=(path:string)=>readFileSync(path,'utf8');

const parent=instantiateComponent('parent-frame','i-parent-313');
const note=instantiateComponent('text-note','i-note-313');
const second={...note,id:'i-note-314',text:'完全不同的文字'};
assert.equal(CENTRAL_COMPONENT_LIBRARY.filter(item=>item.installation==='ready').length,4);
assert.deepEqual(normalizeInstances([parent,note,second]).map(item=>item.text),
  ['新父框架','新增文字','完全不同的文字']);
assert.equal(targetToolSupported('frame','target:backgroundMode'),true);
assert.equal(targetToolSupported('frame','target:shadowEnabled'),true);
assert.equal(targetToolSupported('frame','target:fontWeight'),true);
assert.equal(targetToolSupported('frame','target:fontFamily'),true);
const preset=normalizeTargetOverride({fontSize:21,textColor:'#00ff00',
  labelText:'不應被複製',offsetX:45});
const visual=Object.fromEntries(Object.entries(preset).filter(([field])=>
  VISUAL_TARGET_KEYS.includes(field as typeof VISUAL_TARGET_KEYS[number])));
assert.deepEqual(visual,{fontSize:21,textColor:'#00FF00'});
assert.equal(mergeTargetAppearance(TARGET_APPEARANCE,visual).fontSize,21);
assert.equal(VISUAL_TARGET_KEYS.includes('labelText'),false);
assert.equal(VISUAL_TARGET_KEYS.includes('offsetX' as never),false);

const skills=ENGINEER_SKILLS.flatMap(group=>group.tools);
assert.equal(skills.find(tool=>tool.field==='instance:sync')?.status,'ready');
const runtime=read('src/maintenance/MaintenanceRuntime.tsx');
assert.ok(runtime.includes("'installed:'+id"),'direct instance tools route to native target');
assert.ok(runtime.includes('patch.fontSize!==undefined')&&runtime.includes('patch.color!==undefined'));
assert.ok(runtime.includes('syncInstance?instanceKind(syncInstance.templateId)'));
assert.ok(runtime.includes("syncScope:'frame'")&&runtime.includes("session.syncScope==='app'"));
assert.ok(runtime.includes('VISUAL_TARGET_KEYS.includes'),'nonvisual properties must not propagate');
assert.ok(runtime.includes('localOnlyKeys:nextLocalOnly'),'isolated local choices must persist');
const bench=read('src/maintenance/MaintenanceWorkbench.tsx');
assert.ok(bench.includes("if(tool.field==='instance:sync')")&&bench.includes("const parent=s?.scope==='instance'&&instance?.templateId==='parent-frame'"));
assert.ok(bench.includes("instance.templateId==='parent-frame'?'frame'"));
assert.ok(bench.includes('kind:\'frame\''),'parent has its own material-capable inspector');
assert.ok(bench.includes('target:InspectedTarget')&&bench.includes('InspectableTarget frame={frame} target={target}'));
assert.ok(bench.includes('searchAbProperties(query)'),'no target-based group hiding');
const renderer=read('src/maintenance/InspectableTarget.tsx');
assert.ok(renderer.includes("'generic','frame'"),'parent surface receives material adapters');
const card=read('src/components/FrameCard.tsx');
assert.ok(!card.includes('<ScrollView nestedScrollEnabled'),'parent resize never forces child scrolling');
const pkg=JSON.parse(read('package.json'));const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.31');assert.equal(app.expo.version,'3.0.31');
assert.equal(app.expo.android.versionCode,30031);
for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0);
console.log('V3.0.17 shared instance typography/color and parent material coverage: PASS');
