import {MountedRegistry} from '../src/maintenance/mountedRegistry';
import assert from 'node:assert/strict';
import {acceptsEditorSession} from '../src/domain/editorSessionScope';
for(const active of ['home','ledger','portfolio','dividend','ai','settings'] as const){
  for(const frameKey of ['app-navigation','floating-ai'])assert.equal(acceptsEditorSession({page:'home',frameKey},active,false,false),true);
  assert.equal(acceptsEditorSession({page:active,frameKey:'page-header'},active,false,false),true);
  assert.equal(acceptsEditorSession({page:active,frameKey:'page-header'},active,false,true),false);
}
assert.equal(acceptsEditorSession({page:'portfolio',frameKey:'chart-canvas'},'home',false,true),true);
assert.equal(acceptsEditorSession({page:'portfolio',frameKey:'chart-canvas'},'portfolio',false,false),false);
assert.equal(acceptsEditorSession({page:'home',frameKey:'app-navigation'},'home',true,false),false);
assert.equal(acceptsEditorSession({page:'portfolio',frameKey:'holding-detail-pnl'},'home',true,false),true);
assert.equal(acceptsEditorSession({page:'ledger',frameKey:'ledger-list'},'home',false,false),false);
console.log('V4.0.15 chart/global/detail session scope PASS');

const mounted=new MountedRegistry<{id:string}>();
assert.deepEqual(mounted.update('frame|label','row-a',{id:'a'}),{id:'a'});
assert.deepEqual(mounted.update('frame|label','row-b',{id:'b'}),{id:'b'});
assert.deepEqual(mounted.update('frame|label','row-a',null),{id:'b'},'removing a sibling must keep a mounted target');
mounted.update('frame|label','row-a',{id:'a'});
assert.deepEqual(mounted.update('frame|label','row-a',null),{id:'b'},'latest rectangle removal restores surviving geometry');
assert.equal(mounted.update('frame|label','row-b',null),undefined);
assert.equal(mounted.update('frame|label','row-b',null),undefined,'cleanup is idempotent');
console.log('Repeated native rows / mounted target and geometry survival PASS');
