import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {childDragSteps,reorderOwnedSiblings} from '../src/maintenance/nativeChildSort';
import {completeCatalogAudit,COMPLETE_ENGINEER_SKILLS} from '../src/maintenance/fullSkillCatalog';
import {resolveSkillAdapter} from '../src/maintenance/skillAdapters';
import {AB_PROPERTY_TOOL_IDS} from '../src/maintenance/abPropertyModel';
import type {MaintenanceInstance} from '../src/maintenance/componentLibrary';
const parent:MaintenanceInstance={id:'i-parent',templateId:'parent-frame',createdBy:'maintenance-engineer',
 text:'父層',visible:true,fontSize:14,color:'#123456',marginTop:0,frameWidth:320,frameHeight:240};
const child=(id:string,parentId='i-parent'):MaintenanceInstance=>({
 id,templateId:'text-note',createdBy:'maintenance-engineer',text:id,visible:true,
 fontSize:13,color:'#123456',marginTop:4,parentId
});
const rows=[parent,child('i-a'),child('i-b'),child('i-c'),child('i-foreign','i-other'),child('i-d')];
const moved=reorderOwnedSiblings(rows,'i-parent','i-b',2);
assert.deepEqual(moved.map(x=>x.id),['i-parent','i-a','i-c','i-d','i-foreign','i-b']);
assert.deepEqual(reorderOwnedSiblings(rows,'i-parent','i-d',-3).map(x=>x.id),
 ['i-parent','i-d','i-a','i-b','i-foreign','i-c']);
assert.equal(reorderOwnedSiblings(rows,'i-parent','i-foreign',3),rows);
assert.equal(reorderOwnedSiblings(rows,'i-parent','metric:portfolio',3),rows);
assert.equal(reorderOwnedSiblings(rows,'i-parent','i-a',Number.NaN),rows);
assert.equal(reorderOwnedSiblings(rows,'i-b','i-a',1),rows);
assert.equal(rows[2]?.id,'i-b','original source remains immutable');
assert.equal(moved[5]?.text,'i-b','content unaffected');
assert.equal(childDragSteps(0),0);assert.equal(childDragSteps(20),0);
assert.equal(childDragSteps(65),1);assert.equal(childDragSteps(-112),-2);
assert.equal(childDragSteps(Number.NaN),0);
const audit=completeCatalogAudit(),tools=COMPLETE_ENGINEER_SKILLS.flatMap(x=>x.tools);
assert.equal(tools.length,184);assert.equal(AB_PROPERTY_TOOL_IDS.length,184);
assert.equal(audit.readyDeclared,164);assert.equal(audit.pending,20);
const drag=tools.find(x=>x.id==='fx-drag-sort')!;
assert.equal(drag.status,'ready');assert.equal(drag.field,'instance:drag-sort');
assert.equal(resolveSkillAdapter(drag,{scope:'instance',page:'home',frameKey:'asset-dashboard',
 kind:'frame',instanceOwned:true,instanceParent:true}).status,'active');
assert.equal(resolveSkillAdapter(drag,{scope:'target',page:'home',frameKey:'asset-dashboard',kind:'metric'}).status,'pending-adapter');
const read=(path:string)=>readFileSync(path,'utf8');
const runtime=read('src/maintenance/MaintenanceRuntime.tsx');
assert.ok(runtime.includes('reorderOwnedSibling:(id,steps)=>setSession')&&runtime.includes("current.scope!=='instance'"));
const installed=read('src/maintenance/MaintenanceWorkbench.tsx');
assert.ok(installed.includes('instances.filter(child=>child.parentId===item.id)'));
assert.ok(installed.includes("tool.field==='instance:drag-sort'"));
const native=read('src/maintenance/NativeChildSortToolDetails.tsx');
assert.ok(native.includes('PanResponder.create')&&native.includes('onPanResponderRelease'));
assert.ok(native.includes('maint.reorderOwnedSibling'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.ok(['3.0.39','3.0.40'].includes(pkg.version));assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30000+Number(pkg.version.split('.')[2]));assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode));
assert.ok(read('.github/workflows/ci.yml').includes('TF-Asset-V'+pkg.version+'-QA.apk'));
for(const file of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
 assert.ok(read(file).length>0);
console.log('V3.0.39 real installed child native drag-sort: ordering, strict scope, AB draft/native handle PASS; device pending');
