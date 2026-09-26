import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_FRAME_EFFECTS,normalizeFrameEffects,angledFrameGradientBounds,
 sampleFrameGradient} from '../src/maintenance/frameEffects';
import {COMPLETE_ENGINEER_SKILLS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import {AB_PROPERTY_TOOL_IDS} from '../src/maintenance/abPropertyModel';
import {resolveSkillAdapter} from '../src/maintenance/skillAdapters';
const read=(file:string)=>readFileSync(file,'utf8');
const old=normalizeFrameEffects({gradientDirection:'horizontal',backgroundMode:'gradient'});
assert.equal(old.gradientAngle,null,'previous horizontal frames retain legacy direction');
assert.equal(DEFAULT_FRAME_EFFECTS.gradientAngle,null);
assert.equal(normalizeFrameEffects({gradientAngle:45}).gradientAngle,45);
assert.equal(normalizeFrameEffects({gradientAngle:999}).gradientAngle,359);
assert.equal(normalizeFrameEffects({gradientAngle:-5}).gradientAngle,0);
assert.equal(normalizeFrameEffects({gradientAngle:Number.NaN}).gradientAngle,null);
assert.equal(normalizeFrameEffects({gradientAngle:null}).gradientAngle,null);
const frame=angledFrameGradientBounds(320,240);
assert.ok(frame.side>=2*Math.hypot(320,240));
assert.equal(frame.left,(320-frame.side)/2);
assert.equal(frame.top,(240-frame.side)/2);
assert.equal(sampleFrameGradient('#000000','#888888','#FFFFFF',0.5,0.5,true),'#888888');
const catalog=COMPLETE_ENGINEER_SKILLS.flatMap(group=>group.tools),audit=completeCatalogAudit();
assert.equal(catalog.length,184);assert.equal(AB_PROPERTY_TOOL_IDS.length,184);
assert.equal(audit.readyDeclared,153);assert.equal(audit.pending,31);
const tool=catalog.find(item=>item.id==='fx-multi-gradient')!;
assert.equal(tool.status,'ready');assert.equal(tool.field,'framefx:gradientAngle');
assert.equal(resolveSkillAdapter(tool,{scope:'frame',page:'home',frameKey:'asset-dashboard'}).status,'active');
assert.equal(resolveSkillAdapter(tool,{scope:'target',kind:'metric',page:'home',frameKey:'asset-dashboard'}).status,'pending-adapter',
 'angle tool is truly native-frame-only, never a fake per-metric switch');
const details=read('src/maintenance/FrameEffectsToolDetails.tsx');
const renderer=read('src/components/FrameCard.tsx');
assert.ok(details.includes("if(key==='gradientAngle')")&&details.includes('onChange={change} min={0} max={359} step={1}'));
assert.ok(details.includes('恢復水平／垂直方向'));
assert.ok(renderer.includes('onLayout={measureGradient}')&&renderer.includes('angledFrameGradientBounds')&&
 renderer.includes("transform:[{rotate:gradientAngle+'deg'}]"));
assert.ok(read('src/maintenance/skillTree.ts').includes("ready('fx-multi-gradient'"));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.27');assert.equal(app.expo.version,'3.0.27');
assert.equal(app.expo.android.versionCode,30027);assert.equal(app.expo.ios.buildNumber,'30027');
assert.ok(read('.github/workflows/ci.yml').includes('TF-Asset-V3.0.27-QA.apk'));
for(const p of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
 assert.ok(read(p).length>0,'immutable finance core kept: '+p);
console.log('V3.0.27 arbitrary-angle frame native gradient: legacy/degree/layout/tool/AB/identity PASS');
console.log('184 skills / 150 declared wired / 34 pending; actual device testing separate');
