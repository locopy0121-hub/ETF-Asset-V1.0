import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_FRAME_EFFECTS,normalizeFrameEffects,frameImageCoverCrop} from '../src/maintenance/frameEffects';
import {COMPLETE_ENGINEER_SKILLS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import {AB_PROPERTY_TOOL_IDS} from '../src/maintenance/abPropertyModel';
import {resolveSkillAdapter} from '../src/maintenance/skillAdapters';
const read=(p:string)=>readFileSync(p,'utf8');
assert.equal(DEFAULT_FRAME_EFFECTS.imageFocusX,.5);
assert.equal(DEFAULT_FRAME_EFFECTS.imageFocusY,.5);
const fx=normalizeFrameEffects({imageFit:'cover',imageFocusX:.25,imageFocusY:.75});
assert.equal(fx.imageFocusX,.25);assert.equal(fx.imageFocusY,.75);
const limits=normalizeFrameEffects({imageFocusX:99,imageFocusY:-8});
assert.equal(limits.imageFocusX,1);assert.equal(limits.imageFocusY,0);
assert.equal(normalizeFrameEffects({imageFocusX:'50',imageFocusY:NaN}).imageFocusX,.5);
assert.equal(normalizeFrameEffects({imageFocusY:Infinity}).imageFocusY,.5);
assert.deepEqual(frameImageCoverCrop(100,100,200,100,.5,.5),
  {width:200,height:100,left:-50,top:0});
assert.deepEqual(frameImageCoverCrop(100,100,200,100,0,1),
  {width:200,height:100,left:0,top:0});
assert.deepEqual(frameImageCoverCrop(100,100,200,100,1,0),
  {width:200,height:100,left:-100,top:0});
assert.deepEqual(frameImageCoverCrop(100,100,100,300,.5,.25),
  {width:100,height:300,left:0,top:-50});
assert.deepEqual(frameImageCoverCrop(120,80,240,160,.2,.9),
  {width:120,height:80,left:0,top:0});
assert.equal(frameImageCoverCrop(0,100,100,100,.5,.5),null);
assert.equal(frameImageCoverCrop(100,100,NaN,100,.5,.5),null);
const all=COMPLETE_ENGINEER_SKILLS.flatMap(s=>s.tools),audit=completeCatalogAudit();
assert.equal(all.length,184);assert.equal(AB_PROPERTY_TOOL_IDS.length,184);
assert.equal(new Set(all.map(t=>t.id)).size,184);
assert.equal(audit.readyDeclared,156);assert.equal(audit.pending,28);
const fit=all.find(t=>t.id==='fx-img-fit')!;
assert.equal(fit.field,'framefx:imageFit');assert.equal(fit.status,'ready');
assert.equal(resolveSkillAdapter(fit,{scope:'frame',page:'home',frameKey:'asset-dashboard'}).status,'active');
assert.equal(all.find(t=>t.id==='fx-background-image')?.status,'adapter-required','cross-device image transfer remains pending');
const card=read('src/components/FrameCard.tsx'),ui=read('src/maintenance/FrameEffectsToolDetails.tsx');
assert.ok(card.includes('Image.getSize(backgroundImageUri'));
assert.ok(card.includes('intrinsicImage?.uri===backgroundImageUri'));
assert.ok(card.includes('frameImageCoverCrop(imageBounds.width,imageBounds.height'));
assert.ok(card.includes('imageCrop?')&&card.includes('resizeMode="stretch"'));
assert.ok(card.includes('<Image source={{uri:backgroundImageUri!}} resizeMode={fx.imageFit}'));
assert.ok(ui.includes("if(key==='imageFit')")&&ui.includes('imageFocusX')&&ui.includes('imageFocusY'));
assert.ok(ui.includes('maintenance.patchFrame')&&ui.includes('imageFocusX:.5,imageFocusY:.5'));
assert.ok(read('src/settings/BackupService.ts').includes('key.startsWith(PREFIX)'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.31');assert.equal(app.expo.version,'3.0.31');
assert.equal(app.expo.android.versionCode,30031);assert.equal(app.expo.ios.buildNumber,'30031');
const wf=read('.github/workflows/ci.yml');
assert.ok(wf.includes('TF-Asset-V3.0.31-QA.apk')&&wf.includes('npm run test:v3_0_31'));
assert.ok(read('src/screens/SettingsScreen.tsx').includes("const BUILD='30031'"));
for(const path of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(path).length>0);
console.log('V3.0.31 image cover crop PASS; 184 / 156 wired / 28 pending; device validation separate');