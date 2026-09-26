import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMPLETE_ENGINEER_SKILLS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import {AB_PROPERTY_TOOL_IDS,AB_PROPERTY_GROUPS} from '../src/maintenance/abPropertyModel';
import {resolveSkillAdapter} from '../src/maintenance/skillAdapters';
import {TARGET_APPEARANCE} from '../src/maintenance/inspectionModel';
import {DEFAULT_FRAME_EFFECTS} from '../src/maintenance/frameEffects';
import {makePageConfig} from '../src/editor/editorModel';
import {ENGINEER_ASSETS_STORAGE_KEY,EMPTY_ENGINEER_ASSETS,DESIGN_TOKEN_FIELDS,
  makeDesignToken,replaceToken,removeToken,normalizeEngineerAssets,toggleFavorite,trackRecent,
  tokenTargetPatch,frameTokenPatch,frameTokenSource} from '../src/maintenance/engineerDesignAssets';
const read=(path:string)=>readFileSync(path,'utf8');
const all=COMPLETE_ENGINEER_SKILLS.flatMap(group=>group.tools),ids=all.map(t=>t.id);
const audit=completeCatalogAudit();
assert.equal(COMPLETE_ENGINEER_SKILLS.length,30);
assert.equal(all.length,184);assert.equal(AB_PROPERTY_TOOL_IDS.length,184);
assert.equal(new Set(ids).size,184);
assert.equal(audit.existing,169);assert.equal(audit.advanced,12);assert.equal(audit.unregistered,3);
assert.equal(audit.readyDeclared,150,'visual history is the only newly wired V3.0.24 skill');
assert.equal(audit.pending,34);
for(const id of ['advanced-tokens','advanced-favorites']){
 const tool=all.find(t=>t.id===id)!;
 assert.equal(tool.status,'ready');
 assert.equal(tool.field,'maintenance:'+id.slice('advanced-'.length));
 assert.equal(resolveSkillAdapter(tool,{scope:'frame',page:'home',frameKey:'asset-dashboard'}).status,'active');
 assert.equal(resolveSkillAdapter(tool,{scope:'target',kind:'metric',page:'home',frameKey:'asset-dashboard'}).status,'active');
}
assert.equal(resolveSkillAdapter(all.find(t=>t.id==='advanced-tokens')!,
 {scope:'instance',instanceOwned:false,kind:'frame',page:'home',frameKey:'asset-dashboard'}).status,'pending-adapter');
assert.ok(ENGINEER_ASSETS_STORAGE_KEY.startsWith('@tf-asset/'));
const dirty={...TARGET_APPEARANCE,fontSize:25,backgroundColor:'#faac19',glowPeriodMs:1400,
 actual_fee:123,tax:50,shares:999,amount:80000,labelText:'tampered',
 captionText:'tampered',prefixText:'tampered',offsetX:900,width:777,visible:false,
 imageUri:'content://secret/private'};
const first=makeDesignToken(1,'  常用漸層  ',dirty)!;
assert.equal(first.name,'常用漸層');assert.equal(first.glowPeriodMs,1400);
assert.equal(first.style.backgroundColor,'#FAAC19');
assert.equal(first.style.fontSize,25);
for(const unsafe of ['actual_fee','tax','shares','amount','labelText','captionText','prefixText',
 'offsetX','width','visible','imageUri','glowPeriodMs'])
 assert.ok(!(unsafe in first.style),'unsafe field must never enter reusable style '+unsafe);
assert.deepEqual(Object.keys(first.style).filter(field=>!DESIGN_TOKEN_FIELDS.includes(field as typeof DESIGN_TOKEN_FIELDS[number])),[]);
assert.equal(makeDesignToken(0,'invalid',{backgroundColor:'#FFFFFF'}),null);
assert.equal(makeDesignToken(6,'invalid',{backgroundColor:'#FFFFFF'}),null);
assert.equal(makeDesignToken(1,'  ',{backgroundColor:'#FFFFFF'}),null);
assert.equal(makeDesignToken(1,'invalid',{actual_fee:400,tax:20}),null);
const clamped=makeDesignToken(5,'x'.repeat(90),{fontSize:900,glowPeriodMs:90000})!;
assert.equal(clamped.name.length,24);assert.equal(clamped.style.fontSize,48);assert.equal(clamped.glowPeriodMs,4000);
let assets=replaceToken(EMPTY_ENGINEER_ASSETS,first);
assets=replaceToken(assets,makeDesignToken(3,'預設二',{borderRadius:21})!);
assets=replaceToken(assets,makeDesignToken(1,'重存',{padding:13})!);
assert.equal(assets.tokens.length,2,'a slot overwrite cannot create duplicates');
assert.equal(assets.tokens[0]?.name,'重存');
assets=removeToken(assets,3);
assert.equal(assets.tokens.length,1);
assert.equal(EMPTY_ENGINEER_ASSETS.tokens.length,0,'do not mutate the default object');
const corrupt=normalizeEngineerAssets({tokens:[...Array.from({length:6},(_,i)=>({slot:i+1,name:'a',style:{backgroundColor:'#aabbcc',shares:1,opacity:0.1}}))],
 favorites:['unknown',ids[0],ids[0]],recent:[...ids.slice(0,12),ids[0]]},ids);
assert.equal(corrupt.tokens.length,5);assert.equal(corrupt.tokens[0]!.style.backgroundColor,'#AABBCC');
assert.equal('opacity' in corrupt.tokens[0]!.style,false);
assert.deepEqual(corrupt.favorites,[ids[0]]);
assert.equal(corrupt.recent.length,10);
const safe=normalizeEngineerAssets({schema:1,tokens:[first],favorites:[],recent:[]},ids);
assert.equal(safe.tokens[0]?.name,first.name);
const fav=toggleFavorite(assets,ids[1]!,ids);
assert.deepEqual(fav.favorites,[ids[1]]);
assert.deepEqual(toggleFavorite(fav,ids[1]!,ids).favorites,[]);
assert.equal(toggleFavorite(fav,'unknown',ids),fav);
const recent=trackRecent(trackRecent(fav,ids[1]!,ids),ids[2]!,ids);
assert.deepEqual(recent.recent,[ids[2],ids[1]]);
const metric=tokenTargetPatch(first,'metric');
assert.equal(metric.backgroundColor,'#FAAC19');assert.equal(metric.fontSize,25);
const control=tokenTargetPatch(makeDesignToken(2,'效果',{glowEnabled:true,backgroundColor:'#FFFFFF'})!,'control');
assert.equal(control.glowEnabled,undefined,'unsupported native renderer must not silently apply');
const frame=makePageConfig('home')['asset-dashboard']!;
const preset={...frame,effects:{...DEFAULT_FRAME_EFFECTS,glowPeriodMs:1700}};
const from=frameTokenSource(preset);
assert.ok(from.backgroundColor===preset.backgroundColor&&from.glowPeriodMs===1700);
const patched=frameTokenPatch(first,preset);
assert.equal(patched.titleFontSize,25);assert.equal(patched.backgroundColor,'#FAAC19');
assert.equal(patched.effects?.glowPeriodMs,1400);
assert.equal(preset.effects.glowPeriodMs,1700,'source frame may not mutate');
assert.ok(!('actual_fee' in patched));
const rt=read('src/maintenance/MaintenanceRuntime.tsx');
const ui=read('src/maintenance/MaintenanceWorkbench.tsx');
const controls=read('src/maintenance/AdvancedEngineerTools.tsx');
assert.ok(rt.includes('const assetWrites=useRef<Promise<void>>')&&rt.includes('await AsyncStorage.setItem(ENGINEER_ASSETS_STORAGE_KEY'),
 'shared library commits must be serialized and durable');
assert.ok(rt.includes('setAssetsLoaded(true)')&&rt.includes('normalizeEngineerAssets(JSON.parse(raw),KNOWN_ENGINEER_TOOLS)'));
assert.ok(rt.includes('const patch=tokenTargetPatch(token,kind)')&&rt.includes('batchLocalOverrides:{...current.batchLocalOverrides'),
 'token apply is local draft only; existing shared style must not mask it');
assert.ok(rt.includes('sharedTouched:current.sharedTouched.filter(field=>!Object.keys(patch).includes(field))'),
 'token application must NOT mutate global same-kind style');
assert.ok(controls.includes('C｜預覽套用')&&controls.includes('maint.saveDesignToken(')&&controls.includes('maint.applyDesignToken('));
assert.ok(ui.includes('visibleB.map(group=><Pressable')&&!ui.includes('FULL_SKILL_SECTIONS.map'),
 'A real item -> B property -> C tool; no added navigation group');
assert.ok(ui.includes('favoritesOnly')&&ui.includes('maintenance.toggleFavoriteTool(tool.id)'));
assert.ok(ui.includes('maintenance.noteToolUsed(tool.id)')&&ui.includes('navigateToFavorite'));
assert.ok(AB_PROPERTY_GROUPS.find(group=>group.id==='theme')?.tools.some(tool=>tool.id==='advanced-tokens'));
assert.ok(AB_PROPERTY_GROUPS.find(group=>group.id==='components')?.tools.some(tool=>tool.id==='advanced-favorites'));
const backup=read('src/settings/BackupService.ts');
assert.ok(backup.includes("key.startsWith(PREFIX)")&&ENGINEER_ASSETS_STORAGE_KEY.startsWith('@tf-asset/'),
 'verified external SAF backup must automatically include the new asset key');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.24');assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30024);assert.equal(app.expo.ios.buildNumber,'30024');
assert.ok(backup.includes("APP_VERSION='3.0.24'"));
assert.ok(read('.github/workflows/ci.yml').includes('TF-Asset-V3.0.24-QA.apk'));
for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
 assert.ok(read(core).length>0,'locked finance source intact: '+core);
console.log('V3.0.24: 5-slot design assets, visual-only sanitization, native target/frame preview, safe local sync PASS');
console.log('V3.0.24: persisted favorites/recent shortcuts, no extra AB level, backup inclusion PASS');
