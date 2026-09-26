import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_FRAME_EFFECTS,colorWithAlpha,mixFrameColors,normalizeFrameEffects} from '../src/maintenance/frameEffects';
import {makePageConfig,normalizeEditorConfig} from '../src/editor/editorModel';
import {ENGINEER_SKILLS} from '../src/maintenance/skillTree';

const next=normalizeFrameEffects({
  backgroundMode:'gradient',gradientEndColor:'#abc123',gradientDirection:'horizontal',
  gradientEndProfitColor:true,borderStyle:'dashed',borderTop:3,borderRight:0,
  cornerTopLeft:13,cornerBottomRight:18,
  shadowColor:'#123abc',shadowProfitColor:true,shadowBlur:10,shadowOffsetX:-3,shadowOffsetY:4,
  glowEnabled:true,glowColor:'#dd8811',glowProfitColor:true,glowOpacity:.58,
  glowWidth:12,glowPulse:true,glowPeriodMs:1600,
  paddingTop:2,paddingRight:6,contentGap:18,marginVertical:14,maxWidth:460,inject:'bad',
});
assert.equal(next.backgroundMode,'gradient');
assert.equal(next.gradientEndColor,'#ABC123');
assert.equal(next.gradientEndProfitColor,true);
assert.equal(next.borderStyle,'dashed');
assert.equal(next.borderTop,3);
assert.equal(next.borderRight,0);
assert.equal(next.cornerBottomRight,18);
assert.equal(next.shadowColor,'#123ABC');
assert.equal(next.shadowBlur,10);
assert.equal(next.shadowOffsetX,-3);
assert.equal(next.glowOpacity,.58);
assert.equal(next.glowPeriodMs,1600);
assert.equal(next.paddingTop,2);
assert.equal(next.contentGap,18);
assert.equal('inject' in next,false);
assert.equal(normalizeFrameEffects({borderTop:999}).borderTop,8);
assert.equal(normalizeFrameEffects({cornerTopLeft:-8}).cornerTopLeft,-1);
assert.equal(normalizeFrameEffects({shadowBlur:99}).shadowBlur,48);
assert.equal(normalizeFrameEffects({shadowOffsetX:99}).shadowOffsetX,24);
assert.equal(normalizeFrameEffects({glowOpacity:8}).glowOpacity,.8);
assert.equal(normalizeFrameEffects({glowPeriodMs:99}).glowPeriodMs,800);
assert.equal(normalizeFrameEffects({gradientEndColor:'javascript:bad'}).gradientEndColor,DEFAULT_FRAME_EFFECTS.gradientEndColor);
assert.equal(normalizeFrameEffects({borderStyle:'double'}).borderStyle,'solid');
assert.equal(normalizeFrameEffects({maxWidth:99999}).maxWidth,1600);
assert.equal(normalizeFrameEffects({}).borderTop,-1,'old user frames inherit original border widths');
assert.equal(normalizeFrameEffects(null).glowEnabled,false,'existing saved dashboards must not start animating');
assert.equal(colorWithAlpha('#112233',.5),'rgba(17,34,51,0.500)');
assert.equal(mixFrameColors('#000000','#FFFFFF',.5),'#808080');

const home=makePageConfig('home');
assert.ok(home['asset-dashboard'],'existing asset card frame must remain');
const normalized=normalizeEditorConfig('home',{...home,'asset-dashboard':{
  ...home['asset-dashboard']!,effects:next,
}});
assert.equal(normalized['asset-dashboard']?.effects?.borderTop,3);
assert.equal(normalized['asset-dashboard']?.effects?.glowOpacity,.58);
assert.equal(normalized['market-news']?.effects?.glowEnabled,false,'other frames must not inherit draft effects');
const legacyFrame=Object.fromEntries(Object.entries(home['asset-dashboard']!)
  .filter(([key])=>key!=='effects')) as typeof home['asset-dashboard'];
const legacy=normalizeEditorConfig('home',{...home,'asset-dashboard':legacyFrame});
assert.equal(legacy['asset-dashboard']?.effects?.backgroundMode,'solid');

const skills=ENGINEER_SKILLS.find(g=>g.id==='frames');
assert.equal(ENGINEER_SKILLS.length,17,'one and only one global engineer skill tree');
assert.ok(skills);
assert.ok(skills!.tools.filter(t=>t.status==='ready').length>=38);
assert.ok(skills!.tools.filter(t=>t.status==='adapter-required').length>=10);
for(const field of ['backgroundMode','gradientEndColor','gradientDirection','borderStyle','borderTop',
  'cornerTopLeft','shadowColor','shadowBlur','shadowOffsetX','shadowOffsetY',
  'glowColor','glowOpacity','glowPulse','paddingTop','contentGap','maxWidth']){
  assert.ok(skills!.tools.some(t=>t.field==='framefx:'+field&&t.status==='ready'),field);
}
for(const name of ['毛玻璃','擴散','跨頁','雙層','手勢']){
  assert.ok(ENGINEER_SKILLS.some(g=>g.tools.some(t=>t.status==='adapter-required'&&
    (t.label+t.detail).includes(name))),name);
}

const read=(p:string)=>readFileSync(p,'utf8');
const card=read('src/components/FrameCard.tsx'),dock=read('src/maintenance/MaintenanceWorkbench.tsx'),
  details=read('src/maintenance/FrameEffectsToolDetails.tsx'),
  runtime=read('src/maintenance/MaintenanceRuntime.tsx'),model=read('src/editor/editorModel.ts');
assert.ok(card.includes("editorStyle?.backgroundOpacity??1"));
assert.ok(card.includes("gradient.map((color,i)")&&card.includes('mixFrameColors(bg,bgEnd'));
assert.ok(card.includes("fx.cornerTopLeft>=0")&&card.includes('borderTopWidth:fx.borderTop'));
assert.ok(card.includes('shadowRadius:fx.shadowBlur')&&card.includes('shadowOffsetX'));
assert.ok(card.includes('fx.glowPulse')&&card.includes('isReduceMotionEnabled'));
assert.ok(!card.includes('opacity:editorStyle.backgroundOpacity'),'background transparency must not dim text');
assert.ok(read('src/maintenance/skillAdapters.ts').includes("original.startsWith('framefx:')")&&
  dock.includes('<FrameEffectsToolDetails'),'one central resolver routes native frame effects');
assert.ok(details.includes('maintenance.patchFrame({effects:normalizeFrameEffects'));
assert.ok(details.includes('onProfitColorChange'));
assert.ok(details.includes('手動輸入精確參數'));
assert.ok(model.includes('effects:normalizeFrameEffects(candidate.effects,DEFAULT_FRAME_EFFECTS)'));
assert.ok(runtime.includes('cancel:()=>{setSession(null);setSelection(null);}'));
assert.ok(runtime.includes('editor.replacePageConfig(normalized)'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.ok(['3.0.9','3.0.10','3.0.11','3.0.12','3.0.13','3.0.14','3.0.15','3.0.16'].includes(pkg.version));assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30000+Number(pkg.version.split('.')[2]));assert.equal(app.expo.ios.buildNumber,String(30000+Number(pkg.version.split('.')[2])));
assert.ok(read('.github/workflows/ci.yml').includes(`TF-Asset-V${pkg.version}-QA.apk`));
for(const p of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(p).length>0,'untouched protected finance source: '+p);
console.log('V3.0.9 scoped frame geometry, gradient, shadow, glow, motion accessibility, migration and identity: PASS');
