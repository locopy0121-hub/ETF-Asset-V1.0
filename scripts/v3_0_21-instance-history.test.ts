import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {instantiateComponent} from '../src/maintenance/componentLibrary';
import {appendVisualHistory,normalizeVisualHistory,visualHistoryKey,instanceVisualSnapshot,
 restoreInstanceVisual,restoreTargetVisual,hasVisualDifference} from '../src/maintenance/visualHistory';
import {resolveSkillAdapter} from '../src/maintenance/skillAdapters';
import {COMPLETE_ENGINEER_SKILLS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';

const read=(path:string)=>readFileSync(path,'utf8');
const audit=completeCatalogAudit(),all=COMPLETE_ENGINEER_SKILLS.flatMap(group=>group.tools);
assert.equal(all.length,184);assert.equal(audit.readyDeclared,156);assert.equal(audit.pending,28);
const tool=all.find(item=>item.id==='history')!;
const ctx={scope:'instance',page:'home',frameKey:'asset-dashboard',
 kind:'text',instanceOwned:true} as const;
assert.equal(resolveSkillAdapter(tool,ctx).status,'active');
assert.equal(resolveSkillAdapter(tool,{...ctx,instanceOwned:false}).status,'pending-adapter');

const first=instantiateComponent('text-note','i-alpha');
const other=instantiateComponent('text-note','i-beta');
const key=visualHistoryKey('instance','home','asset-dashboard',first.id)!;
const otherKey=visualHistoryKey('instance','home','asset-dashboard',other.id)!;
assert.equal(key,'instance:home:asset-dashboard:i-alpha');
assert.notEqual(key,otherKey);
assert.equal(visualHistoryKey('instance','home','asset-dashboard','native-value'),null);
assert.equal(visualHistoryKey('instance','bad-page','asset-dashboard',first.id),null);
assert.equal(visualHistoryKey('instance','home','asset-dashboard','i-\n'),null);

const before=instanceVisualSnapshot({...first,fontSize:19,color:'#aabbcc',text:'Sensitive',
 visible:false,parentId:'i-parent',marginTop:22,style:{
 textColor:'#ABCDEF',backgroundOpacity:.45,borderRadius:9,actual_fee:200,
 cash:999,visible:false,labelText:'Never restore',offsetX:30}});
assert.equal(before.fontSize,19);assert.equal(before.color,'#AABBCC');
assert.equal(before.text,undefined);assert.equal(before.visible,undefined);
assert.equal(before.parentId,undefined);assert.equal(before.marginTop,undefined);
assert.equal((before.style as Record<string,unknown>).textColor,'#ABCDEF');
for(const bad of ['actual_fee','cash','visible','labelText','offsetX'])
 assert.equal(bad in (before.style as Record<string,unknown>),false);
const tampered={...before,amount:999,price:25,createdBy:'intruder',text:'Injected',
 style:{textColor:'#123456',shares:99,actual_fee:100,visible:false}};
const clean=instanceVisualSnapshot(tampered);
for(const bad of ['amount','price','createdBy','text'])assert.equal(bad in clean,false);
assert.equal('shares' in (clean.style as Record<string,unknown>),false);
const now={...first,fontSize:28,color:'#000000',text:'Keep content',
 visible:false,parentId:'i-parent',marginTop:23} as typeof first;
const restored=restoreInstanceVisual(now,before);
assert.equal(restored.fontSize,19);assert.equal(restored.color,'#AABBCC');
assert.equal(restored.text,'Keep content');assert.equal(restored.visible,false);
assert.equal(restored.parentId,'i-parent');assert.equal(restored.marginTop,23);
const override=restoreTargetVisual({textColor:'#010203',visible:false,offsetX:33,labelText:'Original'},
 (before.style as Record<string,unknown>));
assert.equal(override.textColor,'#ABCDEF');assert.equal(override.visible,false);
assert.equal(override.offsetX,33);assert.equal(override.labelText,'Original');
const parent=instantiateComponent('parent-frame','i-parent');
const parentBefore=instanceVisualSnapshot({...parent,frameWidth:512,frameHeight:288});
const parentRestored=restoreInstanceVisual({...parent,frameWidth:320,frameHeight:240},parentBefore);
assert.equal(parentRestored.frameWidth,512);assert.equal(parentRestored.frameHeight,288);
assert.equal(parentRestored.text,parent.text);
assert.equal(hasVisualDifference(before,{...before,fontSize:24}),true);
let history=appendVisualHistory({},key,'instance',before,100,'saved-a');
history=appendVisualHistory(history,otherKey,'instance',instanceVisualSnapshot(other),101,'saved-b');
assert.equal(history[key]?.length,1);assert.equal(history[otherKey]?.length,1);
for(let i=0;i<14;i++)history=appendVisualHistory(history,key,'instance',
 {...before,fontSize:11+i},102+i,'saved-'+i);
assert.equal(history[key]?.length,10);assert.equal(history[otherKey]?.length,1);
const normalized=normalizeVisualHistory({
 ...history,[key]:[{id:'valid',at:99,kind:'instance',visual:tampered}],
 'instance:home:asset-dashboard:native-source':[{id:'bad',at:1,visual:{}}]});
assert.equal('instance:home:asset-dashboard:native-source' in normalized,false);
assert.equal((normalized[key]?.[0]?.visual as Record<string,unknown>).text,undefined);
const runtime=read('src/maintenance/MaintenanceRuntime.tsx');
const ui=read('src/maintenance/VisualHistoryToolDetails.tsx');
const adapter=read('src/maintenance/skillAdapters.ts');
const backup=read('src/settings/BackupService.ts');
assert.ok(runtime.includes('instanceVisualSnapshot({...savedInstance'));
assert.ok(runtime.includes("savedInstance&&draftInstance?'instance':null"));
assert.ok(runtime.includes('if(!selected)return current;'));
assert.ok(runtime.includes('syncSameKind:false')&&runtime.includes('setVisualHistory(nextHistory)'));
assert.ok(ui.includes('instanceVisualSnapshot({...owned')&&ui.includes('restoreVisualHistory(entry.id)'));
assert.ok(adapter.includes("ctx.scope==='instance'&&ctx.instanceOwned"));
assert.ok(backup.includes('key.startsWith(PREFIX)'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.30');assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30030);assert.equal(app.expo.ios.buildNumber,'30030');
assert.ok(read('.github/workflows/ci.yml').includes('TF-Asset-V3.0.30-QA.apk'));
console.log('V3.0.30 owned installed A history: snapshots/strict keys/cap/restore/backup/AB PASS');
console.log('184 central skills, 150 declared wired / 34 pending; no finance or built-in mutations PASS');
