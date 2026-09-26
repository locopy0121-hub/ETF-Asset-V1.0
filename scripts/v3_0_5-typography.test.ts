import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeTargetOverride,targetToolSupported,TARGET_APPEARANCE,mergeTargetAppearance} from '../src/maintenance/inspectionModel';
import {ENGINEER_SKILLS} from '../src/maintenance/skillTree';

const format=normalizeTargetOverride({fontWeight:'900',fontStyle:'italic',
  textDecorationLine:'underline line-through',letterSpacing:2.5,lineHeight:41,
  prefixText:'USD',prefixGap:12,evil:'unsafe'});
assert.equal(format.fontWeight,'900');
assert.equal(format.fontStyle,'italic');
assert.equal(format.textDecorationLine,'underline line-through');
assert.equal(format.letterSpacing,2.5);
assert.equal(format.lineHeight,41);
assert.equal(format.prefixText,'USD');
assert.equal(format.prefixGap,12);
assert.equal('evil' in format,false);
assert.equal(normalizeTargetOverride({prefixGap:999,letterSpacing:-999}).prefixGap,48);
assert.equal(normalizeTargetOverride({prefixGap:999,letterSpacing:-999}).letterSpacing,-4);
assert.equal(normalizeTargetOverride({fontWeight:'invalid',prefixText:'X'.repeat(200)}).prefixText?.length,120);
assert.equal(normalizeTargetOverride({fontWeight:'invalid'}).fontWeight,undefined);
assert.equal(mergeTargetAppearance(TARGET_APPEARANCE,format).prefixText,'USD');
assert.equal(targetToolSupported('prefix','target:prefixText'),true);
assert.equal(targetToolSupported('prefix','target:prefixGap'),true);
assert.equal(targetToolSupported('value','target:prefixText'),false,'financial source values are NOT editable prefix strings');
assert.equal(targetToolSupported('value','target:labelText'),false,'financial source values remain read-only');
assert.equal(targetToolSupported('value','target:fontWeight'),true);
assert.equal(targetToolSupported('text','target:fontStyle'),true);
assert.equal(targetToolSupported('metric','target:textDecorationLine'),true);
assert.equal(targetToolSupported('control','target:fontStyle'),false);
assert.ok(ENGINEER_SKILLS.length>=16,'preserve one shared 16-domain engineer skill tree');
for(const field of ['target:fontWeight','target:fontStyle','target:textDecorationLine',
  'target:letterSpacing','target:lineHeight','target:prefixText','target:prefixGap']){
  assert.ok(ENGINEER_SKILLS.some(group=>group.tools.some(tool=>tool.field===field&&tool.status==='ready')),field);
}

const read=(path:string)=>readFileSync(path,'utf8');
const home=read('src/screens/HomeScreen.tsx');
const stack=read('src/components/PageEditorStack.tsx');
const dock=read('src/maintenance/MaintenanceWorkbench.tsx');
const metric=read('src/components/MetricTile.tsx');
const inspector=read('src/maintenance/InspectableTarget.tsx');
const runtime=read('src/maintenance/MaintenanceRuntime.tsx');
assert.ok(home.includes('<Text style={styles.heroPrefix}>NT$</Text>'));
assert.ok(home.includes('<Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.52}>{money(portfolio.totalMarketValue)}</Text>'));
assert.ok(!home.includes("valuationComplete?'NT$ '+money(portfolio.totalMarketValue)"));
assert.ok(stack.includes("isPrefix=content.trim()==='NT$'"));
assert.ok(stack.includes("kind:'prefix'")&&stack.includes("id:'prefix:'"));
assert.ok(stack.includes('override.prefixText!==undefined?appearance.prefixText:content'));
for(const key of ['override.fontWeight','override.fontStyle','override.textDecorationLine',
  'override.letterSpacing','override.lineHeight','override.prefixGap'])assert.ok(stack.includes(key),key);
for(const key of ['options[optionName]','key===\'prefixText\'','prefixGap:[0,48,1]'])
  assert.ok(dock.includes(key),key);
assert.ok(metric.includes('editorStyle?.fontWeight')&&metric.includes('editorStyle?.fontStyle'));
assert.ok(inspector.includes('if(!engineer.enabled&&!appearance.visible)return null'));
assert.ok(runtime.includes('normalizeTargetOverride({...current.draftTargets[id],...patch})'));
assert.ok(runtime.includes('cancel:()=>{setSession(null);setSelection(null);}'));
assert.ok(runtime.includes('schema:3,instances:nextSaved,targets:nextTargets,workspaces:nextWorkspace'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.ok(['3.0.9','3.0.10','3.0.11','3.0.12','3.0.13','3.0.14','3.0.15','3.0.16','3.0.17','3.0.18','3.0.19','3.0.20','3.0.21','3.0.28'].includes(pkg.version));
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30000+Number(pkg.version.split('.')[2]));
assert.ok(read('.github/workflows/ci.yml').includes(`TF-Asset-V${pkg.version}-QA.apk`));
for(const path of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(path).length>0,'locked finance source exists: '+path);
console.log('V3.0.9 typography/prefix normalization, scoped native adapters, safety and version gates: AUTOMATED PASS');
