import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {accessibleChildMove,childDragSteps,reorderOwnedSiblings} from '../src/maintenance/nativeChildSort';
import {completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import type {MaintenanceInstance} from '../src/maintenance/componentLibrary';
const parent:MaintenanceInstance={id:'p',templateId:'parent-frame',createdBy:'maintenance-engineer',text:'父框架',visible:true,fontSize:14,color:'#000',marginTop:0};
const child=(id:string):MaintenanceInstance=>({id,templateId:'text-note',createdBy:'maintenance-engineer',text:id,visible:true,fontSize:12,color:'#000',marginTop:0,parentId:'p'});
const rows=[parent,child('a'),child('b'),child('c')];
for(const action of ['activate','escape','longpress','','Increment','unknown'])
 assert.equal(accessibleChildMove(action,1,3),0,'unknown screen-reader action must never reorder');
for(const [index,total] of [[-1,3],[3,3],[1,1],[1,0],[NaN,3],[1,NaN],[1,Infinity]] as const)
 assert.equal(accessibleChildMove('increment',index,total),0,'invalid position must not reorder');
assert.equal(accessibleChildMove('increment',0,3),1);
assert.equal(accessibleChildMove('decrement',2,3),-1);
assert.equal(accessibleChildMove('decrement',0,3),0);
assert.equal(accessibleChildMove('increment',2,3),0);
assert.deepEqual(reorderOwnedSiblings(rows,'p','b',accessibleChildMove('increment',1,3)).map(x=>x.id),['p','a','c','b']);
assert.equal(reorderOwnedSiblings(rows,'p','b',accessibleChildMove('unknown',1,3)),rows);
assert.equal(childDragSteps(Number.NaN),0);assert.equal(childDragSteps(0),0);
const native=readFileSync('src/maintenance/NativeChildSortToolDetails.tsx','utf8');
assert.ok(native.includes('accessibleChildMove(event.nativeEvent.actionName,index,total)')&&native.includes('if(step)latest.current(id,step)'));
const audit=completeCatalogAudit();
assert.equal(audit.readyDeclared+audit.pending,184);
assert.equal(audit.readyDeclared,164);assert.equal(audit.pending,20);
const pkg=JSON.parse(readFileSync('package.json','utf8')),app=JSON.parse(readFileSync('app.json','utf8'));
assert.equal(pkg.version,'3.0.40');assert.equal(app.expo.version,'3.0.40');
assert.equal(app.expo.android.versionCode,30040);assert.equal(app.expo.ios.buildNumber,'30040');
assert.ok(readFileSync('.github/workflows/ci.yml','utf8').includes('TF-Asset-V3.0.40-QA.apk'));
console.log('V3.0.40 native child sort safe accessibility actions, boundaries and identity: automated PASS; device pending');
