import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const app=JSON.parse(read('app.json'));
const pkg=JSON.parse(read('package.json'));

assert.equal(pkg.version,'3.1.17');
assert.equal(app.expo.version,'3.1.17');
assert.equal(app.expo.android.versionCode,30117);
assert.equal(app.expo.ios.buildNumber,'30117');

const home=read('src/screens/HomeScreen.tsx');
assert.match(home,/heroAmountShell:\{width:'100%',minWidth:0,overflow:'hidden'\}/);
assert.match(home,/heroAmountRow:\{flexDirection:'row',alignItems:'flex-end'/);
assert.match(home,/heroPrefix:\{[^\n]*fontSize:18,lineHeight:42/);
assert.match(home,/heroValue:\{[^\n]*fontSize:42,lineHeight:46/);
assert.match(home,/minimumFontScale=\{0\.42\}/);
assert.match(home,/dashboardTop:\{minHeight:128/);
assert.doesNotMatch(home,/alignItems:'baseline',width:'100%'/,
  'hero money row must not rely on Android baseline alignment');

const stack=read('src/components/PageEditorStack.tsx');
assert.match(stack,/marginLeft:Math\.max\(-24,Math\.min\(24,appearance\.prefixOffsetX\)\)/);
assert.match(stack,/translateY:Math\.max\(-8,Math\.min\(8,appearance\.prefixOffsetY\)\)/);
assert.doesNotMatch(stack,/translateX:appearance\.prefixOffsetX/,
  'currency prefix horizontal movement must reserve layout space instead of overlapping the value');

const model=read('src/maintenance/inspectionModel.ts');
assert.match(model,/\['prefixOffsetX',-24,24\],\['prefixOffsetY',-8,8\]/);
assert.match(model,/target:anchorY'\]\.includes\(field\)\)return kind!=='prefix'/);
assert.match(model,/\['target:prefixText','target:prefixGap','target:prefixOffsetX','target:prefixOffsetY'\]\.includes\(field\)\)return kind==='prefix'/);

const target=read('src/maintenance/InspectableTarget.tsx');
assert.match(target,/withoutAbsolutePrefixGeometry/);
for(const field of ['offsetX','offsetY','width','height','anchorX','anchorY','anchorBaseWidth','anchorBaseHeight'])
  assert.ok(target.includes('delete next.'+field),'missing prefix geometry guard '+field);
assert.match(target,/target\.kind==='prefix'\?withoutAbsolutePrefixGeometry\(storedOverride\):storedOverride/);

const workbench=read('src/maintenance/MaintenanceWorkbench.tsx');
assert.match(workbench,/prefixOffsetX:\[-24,24,1\],prefixOffsetY:\[-8,8,1\]/);

console.log('V3.1.17 dashboard responsive money composite PASS — currency/value stay together, long values shrink, unsafe absolute prefix geometry is blocked');
