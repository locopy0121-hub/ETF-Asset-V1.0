import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CENTRAL_COMPONENT_LIBRARY,instantiateComponent,normalizeInstances,readyComponents} from '../src/maintenance/componentLibrary';
import {ENGINEER_SKILLS,findSkill} from '../src/maintenance/skillTree';

assert.ok(ENGINEER_SKILLS.length>=16,'one extensible central engineer skills tree');
assert.equal(new Set(ENGINEER_SKILLS.map(s=>s.id)).size,ENGINEER_SKILLS.length);
assert.ok(ENGINEER_SKILLS.every(s=>s.tools.length>=2&&s.tools.every(t=>Boolean(t.detail))),'B→C→D defined for all skills');
for(const id of ['components','frames','dimensions','layout','typography','colors','effects','charts','interaction','responsive','versions'])assert.ok(findSkill(id),id);
assert.equal(new Set(CENTRAL_COMPONENT_LIBRARY.map(x=>x.id)).size,CENTRAL_COMPONENT_LIBRARY.length);
assert.equal(CENTRAL_COMPONENT_LIBRARY.length>=12,true,'one shared catalog inventories existing component types');
assert.equal(readyComponents().length,4,'parent frame is now a real installable central template');
assert.equal(CENTRAL_COMPONENT_LIBRARY.find(x=>x.id==='official-candle')?.installation,'adapter-required','cannot invent chart data');
assert.throws(()=>instantiateComponent('official-candle','bad'),'not wired components must not create fake charts');
const note=instantiateComponent('text-note','i-001');
assert.equal(note.text,'新增文字');
assert.deepEqual(normalizeInstances([note,null,{...note,id:'i-002',fontSize:100,text:'x'.repeat(210)}, {...note,id:'i-003',templateId:'unknown'}]).map(x=>[x.id,x.fontSize,x.text.length]),[['i-001',13,4],['i-002',36,200]]);
assert.deepEqual(normalizeInstances({bad:'data'}),[]);

const read=(p:string)=>readFileSync(p,'utf8');
const screen=read('src/screens/SettingsScreen.tsx'),runtime=read('src/maintenance/MaintenanceRuntime.tsx');
const stack=read('src/components/PageEditorStack.tsx'),dock=read('src/maintenance/MaintenanceWorkbench.tsx');
const app=read('App.tsx'),frame=read('src/components/FrameCard.tsx');
assert.ok(screen.includes('駐點維護工程師｜全局總開關'));
assert.ok(runtime.includes('prefs.engineerEnabled===true'));
assert.ok(stack.includes("accessibilityLabel={'呼叫'+item.element.props.title+'維護工程師'}"));
assert.ok(stack.includes('frameConfig=active&&session?session.draft'));
assert.ok(frame.includes("borderStyle:'dashed'"));
assert.ok(dock.includes('nestedScrollEnabled')&&app.includes('<MaintenanceWorkbench/>'));
assert.ok(runtime.indexOf('await AsyncStorage.setItem(MAINTENANCE_STORAGE_KEY')<runtime.indexOf('editor.replacePageConfig(normalized)'));
assert.ok(runtime.includes('cancel:()=>{setSession(null);setSelection(null);}'),'cancel must never persist drafts');
assert.ok(dock.includes('取消／恢復')&&dock.includes('儲存／套用'));
assert.ok(!app.includes('V5')&&!runtime.includes('360'));
const pkg=JSON.parse(read('package.json')),a=JSON.parse(read('app.json'));
assert.ok(['3.0.9','3.0.10','3.0.11','3.0.12','3.0.13','3.0.14','3.0.15','3.0.16','3.0.17','3.0.18','3.0.19','3.0.20','3.0.21','3.0.31'].includes(pkg.version));
assert.equal(a.expo.version,pkg.version);
assert.equal(a.expo.android.versionCode,30000+Number(pkg.version.split('.')[2]));
assert.ok(read('.github/workflows/ci.yml').includes(`TF-Asset-V${pkg.version}-QA.apk`));
for(const path of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md']){
  const bytes=readFileSync(path);
  const sha=createHash('sha1').update('blob '+bytes.length+String.fromCharCode(0)).update(bytes).digest('hex');
  const expected:Record<string,string>={'src/finance/canonicalLedger.ts':'84324138ec2e56a655e0ceacaed3ee541ba7f5c6','src/utils/etfCalculators.ts':'6f31ce33eaa140340c274adaa936c97641d418f2','docs/finance/CORE_LOCK.md':'7865dab714d9dbe266d98f99f116778acef9c3f4'};
  assert.equal(sha,expected[path],'V2.3.6 protected finance blob changed: '+path);
}
console.log('V3.0.1 central catalog, extensible B/C/D skill domains, page wrench + live draft dock and version guards: PASS');
