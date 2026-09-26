import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_FRAME_EFFECTS,normalizeFrameEffects,sampleFrameGradient} from '../src/maintenance/frameEffects';
import {makePageConfig,normalizeEditorConfig} from '../src/editor/editorModel';
import {ENGINEER_SKILLS} from '../src/maintenance/skillTree';

const read=(p:string)=>readFileSync(p,'utf8');
const old=normalizeFrameEffects({});
assert.equal(old.backgroundMode,'solid');
assert.equal(old.gradientMidEnabled,false);
assert.equal(old.imageUri,null);
assert.equal(old.maskOpacity,0);
assert.equal(old.imageOpacity,1);
assert.equal(old.imageIndex,0);
assert.equal(old.imageSource,'builtIn');
assert.equal(normalizeFrameEffects(null).glowEnabled,false);
const newer=normalizeFrameEffects({
  backgroundMode:'image',imageSource:'custom',imageUri:'content://com.android.providers.media.documents/document/image%3A123',
  imageIndex:7.6,imageFit:'contain',imageOpacity:.7,maskColor:'#abc123',maskProfitColor:true,maskOpacity:.3,
  gradientMidEnabled:true,gradientMidColor:'#f0f0f0',gradientMidProfitColor:true,gradientMidStop:.3,
  shadowColor:'#000000',customInject:'discard',
});
assert.equal(newer.backgroundMode,'image');
assert.equal(newer.imageSource,'custom');
assert.ok(newer.imageUri?.startsWith('content://'));
assert.equal(newer.imageIndex,8);
assert.equal(newer.imageFit,'contain');
assert.equal(newer.imageOpacity,.7);
assert.equal(newer.maskColor,'#ABC123');
assert.equal(newer.maskProfitColor,true);
assert.equal(newer.gradientMidEnabled,true);
assert.equal(newer.gradientMidColor,'#F0F0F0');
assert.equal(newer.gradientMidProfitColor,true);
assert.equal(newer.gradientMidStop,.3);
assert.equal('customInject' in newer,false);
for(const uri of ['https://example.com/a.jpg','file:///etc/passwd','javascript:alert(1)','content://a/b?secret=1','content://a/b#fragment'])
  assert.equal(normalizeFrameEffects({imageUri:uri}).imageUri,null,'unsafe image uri: '+uri);
assert.equal(normalizeFrameEffects({imageIndex:888}).imageIndex,9);
assert.equal(normalizeFrameEffects({imageIndex:-5}).imageIndex,0);
assert.equal(normalizeFrameEffects({imageOpacity:-7}).imageOpacity,0);
assert.equal(normalizeFrameEffects({maskOpacity:7}).maskOpacity,1);
assert.equal(normalizeFrameEffects({gradientMidStop:0}).gradientMidStop,.1);
assert.equal(normalizeFrameEffects({gradientMidStop:9}).gradientMidStop,.9);
assert.equal(normalizeFrameEffects({imageUri:'content://a/b',backgroundMode:'image',imageSource:'oops'}).imageSource,'builtIn');
assert.equal(sampleFrameGradient('#000000','#808080','#FFFFFF',0,.5,true),'#000000');
assert.equal(sampleFrameGradient('#000000','#808080','#FFFFFF',.5,.5,true),'#808080');
assert.equal(sampleFrameGradient('#000000','#808080','#FFFFFF',1,.5,true),'#FFFFFF');
assert.equal(sampleFrameGradient('#000000','#808080','#FFFFFF',.5,.5,false),'#808080');
assert.equal(sampleFrameGradient('#000000','#FFFFFF','#000000',.75,.5,true),'#808080');

const home=makePageConfig('home');
const isolated=normalizeEditorConfig('home',{...home,'asset-dashboard':{
  ...home['asset-dashboard']!,effects:newer,
}});
assert.equal(isolated['asset-dashboard']?.effects?.imageSource,'custom');
assert.equal(isolated['asset-dashboard']?.effects?.maskOpacity,.3);
for(const [frameKey,value] of Object.entries(isolated)){
  if(frameKey!=='asset-dashboard')assert.equal(value.effects?.backgroundMode,'solid',
    'local frame image must not leak to sibling '+frameKey);
}
const frame=ENGINEER_SKILLS.find(group=>group.id==='frames');
assert.equal(ENGINEER_SKILLS.length,17,'keep one central skill tree');
assert.ok(frame);
for(const field of ['gradientMidEnabled','gradientMidColor','gradientMidStop','imageSource',
  'imageIndex','imageUri','imageFit','imageOpacity','maskColor','maskOpacity'])
  assert.ok(frame!.tools.some(tool=>tool.field==='framefx:'+field&&tool.status==='ready'),
    'missing native-adapted frame tool '+field);
assert.ok(frame!.tools.some(tool=>tool.label.includes('任意角度')&&tool.status==='ready'&&tool.field==='framefx:gradientAngle'));
assert.ok(frame!.tools.some(tool=>tool.label.includes('圖片裁切位置')&&tool.status==='adapter-required'));
assert.ok(frame!.tools.some(tool=>tool.label.includes('毛玻璃')&&tool.status==='adapter-required'));
const card=read('src/components/FrameCard.tsx');
const details=read('src/maintenance/FrameEffectsToolDetails.tsx');
const tree=read('src/maintenance/skillTree.ts');
assert.ok(card.includes('sampleFrameGradient(bg,bgMiddle,bgEnd'));
assert.ok(card.includes('THEME_BACKGROUNDS[fx.imageIndex]'));
assert.ok(card.includes('backgroundLayer&&fx.maskOpacity>0'));
assert.ok(card.includes('resizeMode={fx.imageFit}')&&card.includes('opacity:fx.imageOpacity'));
assert.ok(card.includes('backgroundColor:gradientOn?')&&!card.includes('opacity:editorStyle.backgroundOpacity'),
  'background transparency must never dim financial values');
assert.ok(details.includes('pickNativeThemeBackground()')&&details.includes('nativeRuntimeAvailable'));
assert.ok(details.includes("onPicked={uri=>")&&details.includes("imageSource:'custom'"));
assert.ok(details.includes('THEME_BACKGROUNDS.map((uri,index)'));
assert.ok(details.includes('onProfitColorChange'));
assert.ok(tree.includes("framefx:maskColor")&&tree.includes("framefx:gradientMidColor"));
assert.ok(read('src/maintenance/MaintenanceRuntime.tsx').includes('editor.replacePageConfig(normalized)'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.ok(['3.0.9','3.0.10','3.0.11','3.0.12','3.0.13','3.0.14','3.0.15','3.0.16','3.0.17','3.0.18','3.0.19','3.0.20','3.0.21','3.0.22'].includes(pkg.version));
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30000+Number(pkg.version.split('.')[2]));
assert.equal(app.expo.ios.buildNumber,String(30000+Number(pkg.version.split('.')[2])));
assert.ok(read('.github/workflows/ci.yml').includes(`TF-Asset-V${pkg.version}-QA.apk`));
assert.ok(read('src/settings/BackupService.ts').includes(`const APP_VERSION='${pkg.version}'`));
for(const file of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(file).length>0,'locked finance source exists: '+file);
console.log('V3.0.9 frame images, SAF URI guards, masks, 3-stop gradient and scope isolation: PASS');
