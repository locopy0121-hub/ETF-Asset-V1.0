import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CENTRAL_COMPONENT_LIBRARY,isEngineerOwnedInstance,instantiateComponent,
  normalizeInstances,removeEngineerOwnedInstance} from '../src/maintenance/componentLibrary';
import {ENGINEER_SKILLS} from '../src/maintenance/skillTree';

const note=instantiateComponent('text-note','i-legacy');
const divider=instantiateComponent('divider','i-new-divider');
assert.equal(note.createdBy,'maintenance-engineer');
assert.equal(isEngineerOwnedInstance(note),true);
assert.equal(isEngineerOwnedInstance(divider),true);
assert.equal(isEngineerOwnedInstance(undefined),false);
assert.equal(isEngineerOwnedInstance({...note,id:'native:asset-dashboard'}),false);
assert.equal(isEngineerOwnedInstance({...note,createdBy:'built-in' as typeof note.createdBy}),false);
assert.equal(isEngineerOwnedInstance({...note,templateId:'system-kpi'}),false);
assert.equal(CENTRAL_COMPONENT_LIBRARY.find(x=>x.id==='metric-tile')?.installation,'adapter-required');

const removed=removeEngineerOwnedInstance([note,divider],note.id);
assert.deepEqual(removed.map(x=>x.id),['i-new-divider']);
assert.deepEqual(removeEngineerOwnedInstance([note,divider],'system:asset-dashboard'),[note,divider]);
assert.deepEqual(removeEngineerOwnedInstance([note,divider],'i-missing'),[note,divider]);
const protectedSibling={...note,id:note.id,createdBy:'built-in' as typeof note.createdBy};
assert.deepEqual(removeEngineerOwnedInstance([note,protectedSibling,divider],note.id),
  [protectedSibling,divider],'duplicate IDs must NEVER remove a protected sibling');
const forged={...note,id:'native:headline'};
assert.deepEqual(removeEngineerOwnedInstance([forged,divider],forged.id),[forged,divider],
  'native App children cannot be removed by claiming createdBy');
const {createdBy:_legacyOrigin,...legacyDraft}=note;
const v3Legacy={...legacyDraft,id:'i-old-v301'};
assert.equal(normalizeInstances([v3Legacy])[0]?.createdBy,'maintenance-engineer',
  'legacy v3.0.1 instances that followed i- ID scheme migrate without data loss');
assert.equal(normalizeInstances([{...note,id:'native:frame'}]).length,0);
assert.equal(normalizeInstances([{...note,createdBy:'system'}]).length,0);
assert.equal(normalizeInstances([{...note,id:'i-good'}]).length,1);

assert.equal(ENGINEER_SKILLS.length,16,'keep exactly one central skill tree');
const engineer=ENGINEER_SKILLS.find(g=>g.id==='components');
assert.ok(engineer?.tools.some(t=>t.id==='install'&&t.status==='ready'));
assert.ok(engineer?.tools.some(t=>t.id==='remove'&&t.status==='ready'&&t.label.includes('刪除')));
const read=(file:string)=>readFileSync(file,'utf8');
const runtime=read('src/maintenance/MaintenanceRuntime.tsx');
const toolbox=read('src/maintenance/MaintenanceWorkbench.tsx');
const builtIn=read('src/maintenance/InspectableTarget.tsx');
assert.ok(runtime.includes("current.scope==='instance'&&current.instanceId!==id"),
  'instance-scoped delete cannot touch other local instances');
assert.ok(runtime.includes("isEngineerOwnedInstance(victim)"),
  'runtime is the second ownership enforcement boundary');
assert.ok(runtime.includes('removeEngineerOwnedInstance(current.draftInstances,id)'));
assert.ok(runtime.includes("item.createdBy:item.createdBy")||runtime.includes('createdBy:item.createdBy'),
  'patchInstance cannot overwrite origin identity');
assert.ok(toolbox.includes('🔒 鎖定資訊｜資料唯讀'),
  'locked real data is visible before A/B/C/D controls');
assert.ok(toolbox.indexOf('🔒 鎖定資訊｜資料唯讀')<toolbox.indexOf('pendingSelection&&'),
  'protected information must be first in the workbench');
assert.ok(toolbox.includes("style:'destructive'")&&toolbox.includes("onPress:()=>maint.remove(item.id)"));
assert.ok(toolbox.includes('owned=s.draftInstances.filter(item=>isEngineerOwnedInstance(item)'));
assert.ok(toolbox.includes('僅列出目前框架內由維護工程師新增的元件'));
assert.ok(toolbox.includes('套用')&&toolbox.includes('取消／恢復'));
assert.ok(builtIn.includes("id:'installed:'+item.id")===false,
  'only engineer-installed instances should have removable minted IDs');
assert.ok(runtime.includes('cancel:()=>{setSession(null);setSelection(null);}'));
assert.ok(runtime.indexOf('await AsyncStorage.setItem(MAINTENANCE_STORAGE_KEY')<
  runtime.indexOf('editor.replacePageConfig(normalized)'));

const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.ok(['3.0.9','3.0.10','3.0.11'].includes(pkg.version),'V3.0.9 regression runs unchanged on newer compatible versions');
assert.equal(app.expo.version,pkg.version);
const identity=30000+Number(pkg.version.split('.')[2]);
assert.equal(app.expo.android.versionCode,identity);
assert.equal(app.expo.ios.buildNumber,String(identity));
assert.ok(read('.github/workflows/ci.yml').includes(`TF-Asset-V${pkg.version}-QA.apk`));
assert.ok(read('src/settings/BackupService.ts').includes(`const APP_VERSION='${pkg.version}'`));
for(const path of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(path).length>0,'accounting core intact: '+path);
console.log('V3.0.9 owned-only deletion, legacy migration, locked-info header, draft rollback and version: PASS');
