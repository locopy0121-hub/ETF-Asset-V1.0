import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ENGINEER_SKILLS} from '../src/maintenance/skillTree';
import {normalizeTargetOverride,mergeTargetAppearance,TARGET_APPEARANCE,targetToolSupported} from '../src/maintenance/inspectionModel';

// V3.0.9: one shared skill tree, isolated per-card caption/title styles and native-only font choices.
const extra=normalizeTargetOverride({
  fontFamily:'serif',labelFontWeight:'800',captionFontWeight:'300',
  labelFontStyle:'italic',captionFontStyle:'normal',labelLetterSpacing:1.5,
  captionLetterSpacing:2.5,labelLineHeight:23,captionLineHeight:18,
  prefixOffsetY:-6,unexpected:'unsafe',
});
assert.equal(extra.fontFamily,'serif');
assert.equal(extra.labelFontWeight,'800');
assert.equal(extra.captionFontWeight,'300');
assert.equal(extra.labelFontStyle,'italic');
assert.equal(extra.labelLetterSpacing,1.5);
assert.equal(extra.captionLetterSpacing,2.5);
assert.equal(extra.labelLineHeight,23);
assert.equal(extra.captionLineHeight,18);
assert.equal(extra.prefixOffsetY,-6);
assert.equal('unexpected' in extra,false);
assert.equal(normalizeTargetOverride({fontFamily:'https://evil.invalid/font.ttf'}).fontFamily,undefined);
assert.equal(normalizeTargetOverride({labelFontWeight:'5000'}).labelFontWeight,undefined);
assert.equal(normalizeTargetOverride({captionLineHeight:300}).captionLineHeight,96);
assert.equal(normalizeTargetOverride({labelLetterSpacing:-40}).labelLetterSpacing,-4);
assert.equal(normalizeTargetOverride({prefixOffsetY:-40}).prefixOffsetY,-40);
assert.equal(normalizeTargetOverride({prefixOffsetY:500}).prefixOffsetY,80);
assert.equal(mergeTargetAppearance(TARGET_APPEARANCE,extra).fontFamily,'serif');
assert.equal(targetToolSupported('metric','target:labelFontWeight'),true);
assert.equal(targetToolSupported('metric','target:captionLetterSpacing'),true);
assert.equal(targetToolSupported('prefix','target:prefixOffsetY'),true);
assert.equal(targetToolSupported('prefix','target:fontFamily'),true);
assert.equal(targetToolSupported('value','target:fontFamily'),true);
assert.equal(targetToolSupported('text','target:labelFontWeight'),false);
assert.equal(targetToolSupported('value','target:prefixOffsetY'),false);
assert.equal(targetToolSupported('control','target:fontFamily'),false);
assert.equal(ENGINEER_SKILLS.length,17,'do not fork the one full App skill tree');
for(const field of ['target:fontFamily','target:labelFontWeight','target:captionFontWeight',
  'target:labelFontStyle','target:captionFontStyle','target:labelLetterSpacing',
  'target:captionLetterSpacing','target:labelLineHeight','target:captionLineHeight',
  'target:prefixOffsetY']){
  assert.ok(ENGINEER_SKILLS.some(s=>s.tools.some(t=>t.field===field&&t.status==='ready')),field);
}
const read=(p:string)=>readFileSync(p,'utf8');
const workbench=read('src/maintenance/MaintenanceWorkbench.tsx');
const stack=read('src/components/PageEditorStack.tsx');
const metric=read('src/components/MetricTile.tsx');
const runtime=read('src/maintenance/MaintenanceRuntime.tsx');
const home=read('src/screens/HomeScreen.tsx');
assert.ok(workbench.includes("fieldName==='fontFamily'")&&workbench.includes('options[optionName]!'));
assert.ok(workbench.includes('prefixOffsetY:[-80,80,1]'));
assert.ok(workbench.includes('override.fontFamily')&&workbench.includes('override.lineHeight'));
assert.ok(stack.includes('override.prefixOffsetY!==undefined'));
assert.ok(stack.includes('translateY:appearance.prefixOffsetY'));
assert.ok(stack.includes('override.fontFamily!==undefined'));
assert.ok(metric.includes('editorStyle?.labelFontWeight'));
assert.ok(metric.includes('editorStyle?.captionFontWeight'));
assert.ok(metric.includes('editorStyle?.captionLineHeight'));
assert.ok(runtime.includes('normalizeTargetOverride({...current.draftTargets[id],...patch})'));
assert.ok(runtime.includes('cancel:()=>{setSession(null);setSelection(null);}'));
assert.ok(home.includes('{money(portfolio.totalMarketValue)}'));
assert.ok(!home.includes("valuationComplete?'NT$ '+money(portfolio.totalMarketValue)"));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.ok(['3.0.9','3.0.10','3.0.11','3.0.12','3.0.13','3.0.14','3.0.15','3.0.16','3.0.17','3.0.18','3.0.19','3.0.20','3.0.21','3.0.26'].includes(pkg.version));
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30000+Number(pkg.version.split('.')[2]));
assert.equal(app.expo.ios.buildNumber,String(30000+Number(pkg.version.split('.')[2])));
assert.ok(read('.github/workflows/ci.yml').includes(`TF-Asset-V${pkg.version}-QA.apk`));
// Historic branch names are not a current CI contract: verify the forward-compatible
// V3 GO trigger and PR-only APK gate so every subsequent patch version can build.
const workflow=read('.github/workflows/ci.yml');
assert.ok(workflow.includes("branches: [main, 'go-v3.0.*']"),'V3 GO push and PR triggers must be version-independent');
assert.ok(workflow.includes("startsWith(github.head_ref, 'go-v3.0.')"),'native QA gate must accept future V3 GO branches');
assert.ok(read('src/settings/BackupService.ts').includes(`const APP_VERSION='${pkg.version}'`));
for(const file of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(file).length>0,'immutable accounting source exists: '+file);
console.log('V3.0.9 engineer text detail: scoped model, native view wiring, locked finance and version gates PASS');
