import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TARGET_APPEARANCE,TARGET_VISUAL_PRESETS,normalizeTargetOverride,mergeTargetAppearance,
  resetTargetVisualOverride,targetToolSupported} from '../src/maintenance/inspectionModel';
import {ENGINEER_SKILLS} from '../src/maintenance/skillTree';
import {colorWithAlpha,sampleFrameGradient} from '../src/maintenance/frameEffects';

const read=(path:string)=>readFileSync(path,'utf8');
const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.22');
assert.equal(app.expo.version,'3.0.22');
assert.equal(app.expo.android.versionCode,30022);
assert.equal(app.expo.ios.buildNumber,'30022');
assert.ok(read('src/screens/SettingsScreen.tsx').includes("const VERSION='3.0.22'"));
assert.ok(read('src/screens/SettingsScreen.tsx').includes("const BUILD='30022'"));
assert.ok(read('src/settings/BackupService.ts').includes("const APP_VERSION='3.0.22'"));
assert.ok(read('.github/workflows/ci.yml').includes('TF-Asset-V3.0.22-QA.apk'));
const material=ENGINEER_SKILLS.find(group=>group.id==='target-materials');
assert.ok(material&&material.tools.filter(tool=>tool.status==='ready').length>=20);
for(const tool of material!.tools.filter(tool=>tool.status==='ready'))
  assert.ok(tool.field?.startsWith('target:'),'new materials must scope to local component');
assert.equal(targetToolSupported('metric','target:gradientEndColor'),true);
assert.equal(targetToolSupported('text','target:glowEnabled'),true);
assert.equal(targetToolSupported('wall','target:gradientEndColor'),false,'unsupported adapter must stay off');
assert.equal(targetToolSupported('control','target:shadowEnabled'),false,'unsupported adapter must stay off');
const normalized=normalizeTargetOverride({backgroundMode:'gradient',gradientDirection:'horizontal',
  gradientEndColor:'#fedcba',gradientMidEnabled:true,gradientMidStop:.7,
  shadowEnabled:true,shadowOpacity:.3,shadowBlur:11,glowEnabled:true,
  glowWidth:4,marginHorizontal:12,backgroundOpacity:.35,opacity:.95,visible:false,
  offsetX:35,labelText:'Preserve local label'});
assert.equal(normalized.gradientEndColor,'#FEDCBA');
assert.equal(normalized.gradientMidStop,.7);
assert.equal(normalized.shadowOpacity,.3);
assert.equal(normalized.backgroundOpacity,.35);
assert.equal(normalized.opacity,.95);
assert.equal(colorWithAlpha('#112233',.35),'rgba(17,34,51,0.350)');
assert.equal(sampleFrameGradient('#000000','#888888','#FFFFFF',.5,.5,true),'#888888');
const rendered=mergeTargetAppearance(TARGET_APPEARANCE,normalized);
assert.equal(rendered.shadowEnabled,true);
assert.equal(rendered.shadowOpacity,.3);
assert.equal(rendered.shadowBlur,11);
const restored=resetTargetVisualOverride(normalized);
assert.equal(restored.backgroundMode,undefined);
assert.equal(restored.shadowEnabled,undefined);
assert.equal(restored.glowEnabled,undefined);
assert.equal(restored.labelText,'Preserve local label');
assert.equal(restored.offsetX,35);
assert.equal(restored.visible,false);
assert.equal(TARGET_VISUAL_PRESETS.focus.textColor,'#FFFFFF');
const stack=read('src/components/PageEditorStack.tsx');
const metric=read('src/components/MetricTile.tsx');
const inspector=read('src/maintenance/InspectableTarget.tsx');
const workbench=read('src/maintenance/MaintenanceWorkbench.tsx');
const runtime=read('src/maintenance/MaintenanceRuntime.tsx');
const renderer=read('src/maintenance/TargetSurfaceEffects.tsx');
assert.ok(metric.includes('<TargetBackdrop')&&metric.includes('targetShadowStyle(surface,shadow)'));
assert.ok(inspector.includes('<TargetBackdrop')&&inspector.includes('targetShadowStyle(appearance,resolvedAppearance.shadowColor)'));
assert.ok(renderer.includes('appearance.backgroundOpacity')&&renderer.includes('pointerEvents="none"'));
assert.ok(renderer.includes('if(!appearance.shadowEnabled)return {}')&&renderer.includes('shadowColor:color'));
assert.ok(renderer.includes('shadowOpacity:appearance.shadowOpacity')&&renderer.includes('shadowRadius:appearance.shadowBlur'));
assert.ok(stack.includes("appearance.backgroundMode==='gradient'"));
assert.ok(workbench.includes("fieldName==='preset'")&&workbench.includes("fieldName==='resetVisual'"));
assert.ok(runtime.includes('resetTargetVisual:id=>'));
assert.ok(read('src/maintenance/skillTree.ts').includes('material-native-blur'));
for(const path of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(path).length>0,'protected accounting file missing: '+path);
console.log('V3.0.17 material presets, native rendering, local reset, independent alpha and protected finances: PASS');
