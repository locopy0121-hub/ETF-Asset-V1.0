import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectLiveTargetSource} from '../src/maintenance/sourceInspection';
import {TARGET_APPEARANCE,targetToolSupported,type InspectedTarget} from '../src/maintenance/inspectionModel';
import {COMPLETE_ENGINEER_SKILLS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import {resolveSkillAdapter} from '../src/maintenance/skillAdapters';
import {AB_PROPERTY_TOOL_IDS} from '../src/maintenance/abPropertyModel';
const read=(path:string)=>readFileSync(path,'utf8');
const target:InspectedTarget={id:'metric:總市值',page:'home',frameKey:'asset-dashboard',frameTitle:'資產儀表板',kind:'metric',label:'總市值',properties:[
 {name:'欄位名稱',value:'總市值',readOnly:true},
 {name:'即時數值（帳務唯讀）',value:'NT$ 50,000',readOnly:true},
 {name:'標題字號',value:'11 px'},
],base:TARGET_APPEARANCE};
const snapshot=inspectLiveTargetSource(target);
assert.equal(snapshot.page,'home');assert.equal(snapshot.targetId,target.id);
assert.equal(snapshot.upstreamStatus,'unverified','do not infer an unprovided API/ledger identity');
assert.equal(snapshot.fields[1]?.value,'NT$ 50,000');assert.equal(snapshot.fields[1]?.originReadOnly,true);
assert.equal(snapshot.fields[2]?.originReadOnly,false);
assert.equal((target.properties as readonly unknown[]).length,3,'source inspector does not mutate mounted properties');
const tools=COMPLETE_ENGINEER_SKILLS.flatMap(g=>g.tools),audit=completeCatalogAudit();
assert.equal(tools.length,184);assert.equal(AB_PROPERTY_TOOL_IDS.length,184);
assert.equal(audit.readyDeclared,164);assert.equal(audit.pending,20);
const source=tools.find(t=>t.id==='source')!;
assert.equal(source.status,'ready');assert.equal(source.field,'target:source');
assert.equal(targetToolSupported('metric','target:source'),true);
assert.equal(resolveSkillAdapter(source,{scope:'target',kind:'metric',page:'home',frameKey:'asset-dashboard'}).status,'active');
assert.equal(resolveSkillAdapter(source,{scope:'target',kind:'text',page:'home',frameKey:'asset-dashboard'}).status,'active');
assert.equal(resolveSkillAdapter(source,{scope:'instance',kind:'text',page:'home',frameKey:'asset-dashboard',instanceOwned:true}).status,'pending-adapter');
assert.equal(resolveSkillAdapter(source,{scope:'frame',page:'home',frameKey:'asset-dashboard'}).status,'pending-adapter');
const panel=read('src/maintenance/MaintenanceWorkbench.tsx');
assert.ok(panel.includes("fieldName==='source'")&&panel.includes('inspectLiveTargetSource(target)'));
assert.ok(panel.includes('snapshot.fields.map')&&panel.includes('上游官方 API／帳務欄位來源：未提供'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.ok(['3.0.38','3.0.40'].includes(pkg.version));assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30000+Number(pkg.version.split('.')[2]));assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode));
const wf=read('.github/workflows/ci.yml');
assert.ok(wf.includes('TF-Asset-V'+pkg.version+'-QA.apk')&&wf.includes('npm run test:v3_0_'+pkg.version.split('.')[2]));
for(const file of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])assert.ok(read(file).length>0);
console.log('V3.0.38 mounted native A source-inspection read-only contract PASS; Android device pending');
