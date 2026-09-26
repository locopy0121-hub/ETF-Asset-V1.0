import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_FRAME_EFFECTS,normalizeFrameEffects,frameBorderGradientBands} from '../src/maintenance/frameEffects';
import {COMPLETE_ENGINEER_SKILLS,completeCatalogAudit} from '../src/maintenance/fullSkillCatalog';
import {AB_PROPERTY_TOOL_IDS} from '../src/maintenance/abPropertyModel';
import {resolveSkillAdapter} from '../src/maintenance/skillAdapters';
const read=(p:string)=>readFileSync(p,'utf8');
assert.equal(DEFAULT_FRAME_EFFECTS.borderGradientEnabled,false);
const fx=normalizeFrameEffects({borderGradientEnabled:true,borderGradientMode:'gradient',
 borderGradientStartColor:'#AaBbCc',borderGradientEndColor:'#12ab34',
 borderGradientStartProfitColor:true,borderGradientEndProfitColor:true,
 borderGradientWidth:9,borderGradientOpacity:.6});
assert.equal(fx.borderGradientEnabled,true);assert.equal(fx.borderGradientMode,'gradient');
assert.equal(fx.borderGradientStartColor,'#AABBCC');assert.equal(fx.borderGradientEndColor,'#12AB34');
assert.equal(fx.borderGradientStartProfitColor,true);assert.equal(fx.borderGradientEndProfitColor,true);
assert.equal(fx.borderGradientWidth,9);assert.equal(fx.borderGradientOpacity,.6);
const bad=normalizeFrameEffects({borderGradientEnabled:'on',borderGradientMode:'angle',
 borderGradientStartColor:'not-color',borderGradientEndColor:'url(file)',
 borderGradientWidth:999,borderGradientOpacity:5});
assert.equal(bad.borderGradientEnabled,false);assert.equal(bad.borderGradientMode,'dual');
assert.equal(bad.borderGradientStartColor,DEFAULT_FRAME_EFFECTS.borderGradientStartColor);
assert.equal(bad.borderGradientWidth,12);assert.equal(bad.borderGradientOpacity,.8);
const dual=frameBorderGradientBands('#000000','#FFFFFF',4,.7,'dual');
assert.equal(dual.length,2);assert.equal(dual[0]?.color,'#000000');assert.equal(dual[1]?.color,'#FFFFFF');
assert.equal(dual[0]?.inset,0);assert.equal(dual[1]?.inset,2);
const grad=frameBorderGradientBands('#000000','#FFFFFF',4,.7,'gradient');
assert.equal(grad.length,8);assert.equal(grad[0]?.color,'#000000');assert.equal(grad[7]?.color,'#FFFFFF');
assert.equal(grad[1]?.stroke,.5);assert.equal(grad[7]?.inset,3.5);
assert.deepEqual(frameBorderGradientBands('#FFFFFF','#000000',4,0,'gradient'),[]);
const all=COMPLETE_ENGINEER_SKILLS.flatMap(x=>x.tools),audit=completeCatalogAudit();
assert.equal(all.length,184);assert.equal(new Set(all.map(x=>x.id)).size,184);
assert.equal(AB_PROPERTY_TOOL_IDS.length,184);assert.equal(audit.readyDeclared,154);assert.equal(audit.pending,30);
const tool=all.find(x=>x.id==='fx-border-grad')!;
assert.equal(tool.status,'ready');assert.equal(tool.field,'framefx:borderGradientEnabled');
assert.equal(resolveSkillAdapter(tool,{scope:'frame',page:'home',frameKey:'asset-dashboard'}).status,'active');
assert.equal(resolveSkillAdapter(tool,{scope:'target',kind:'metric',page:'home',frameKey:'asset-dashboard'}).status,'pending-adapter');
const card=read('src/components/FrameCard.tsx'),ui=read('src/maintenance/FrameEffectsToolDetails.tsx');
assert.ok(card.includes('borderGradientOn?frameBorderGradientBands(borderGradientStart,borderGradientEnd,'));
assert.ok(card.includes("outerGlowOn||shadowSpreadOn||borderGradientOn?{overflow:'visible' as const}"));
assert.ok(card.includes('pointerEvents="none"')&&card.includes('colorWithAlpha(band.color,band.alpha)'));
assert.ok(ui.includes("if(key==='borderGradientEnabled')")&&ui.includes('borderGradientMode'));
assert.ok(ui.includes('borderGradientStartProfitColor')&&ui.includes('borderGradientEndProfitColor'));
assert.ok(ui.includes('ColorPalettePicker')&&ui.includes('maintenance.patchFrame'));
assert.ok(read('src/settings/BackupService.ts').includes('key.startsWith(PREFIX)'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.28');assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30028);assert.equal(app.expo.ios.buildNumber,'30028');
const wf=read('.github/workflows/ci.yml');
assert.ok(wf.includes('TF-Asset-V3.0.28-QA.apk')&&wf.includes('npm run test:v3_0_28'));
assert.ok(wf.includes("startsWith(github.head_ref, 'go-v3.0.')"));
assert.ok(read('src/screens/SettingsScreen.tsx').includes("const BUILD='30028'"));
for(const p of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])assert.ok(read(p).length>0);
console.log('V3.0.28 native dual/gradient frame-border regression PASS: 154 wired / 30 pending; device separate');
