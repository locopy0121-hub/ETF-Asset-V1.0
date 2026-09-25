import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGE_FRAMES} from '../src/domain/frameRegistry';
import {makePageConfig,normalizeEditorConfig} from '../src/editor/editorModel';
import {TARGET_APPEARANCE,mergeTargetAppearance,normalizeTargetOverride} from '../src/maintenance/inspectionModel';
import {ENGINEER_SKILLS} from '../src/maintenance/skillTree';
import {colorWithAlpha} from '../src/maintenance/frameEffects';

const read=(path:string)=>readFileSync(path,'utf8');
const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.0.10');
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30010);
assert.equal(app.expo.ios.buildNumber,'30010');
assert.equal(app.expo.android.package,'com.tfasset.app');
assert.ok(read('src/screens/SettingsScreen.tsx').includes("const VERSION='3.0.10'"));
assert.ok(read('src/screens/SettingsScreen.tsx').includes("const BUILD='30010'"));
assert.ok(read('src/settings/BackupService.ts').includes("const APP_VERSION='3.0.10'"));
assert.ok(read('.github/workflows/ci.yml').includes('TF-Asset-V3.0.10-QA.apk'));

// The editable top header is a real, per-page frame and cannot alter sibling pages.
for(const page of Object.keys(PAGE_FRAMES) as (keyof typeof PAGE_FRAMES)[]){
  assert.equal(PAGE_FRAMES[page][0]?.key,'page-header',page+' must register actual header');
  assert.ok(makePageConfig(page)['page-header'],page+' header editor config is missing');
}
const before=makePageConfig('home');
const edited=normalizeEditorConfig('home',{...before,'page-header':{
  ...before['page-header']!,width:620,height:240,minHeight:100,backgroundOpacity:.25,
}});
assert.equal(edited['page-header']?.width,620);
assert.equal(edited['page-header']?.height,240);
assert.equal(edited['page-header']?.backgroundOpacity,.25);
assert.equal(edited['asset-dashboard']?.width,undefined);
assert.equal(makePageConfig('portfolio')['page-header']?.width,undefined);
const restored=normalizeEditorConfig('home',{...edited,'page-header':{
  ...edited['page-header']!,width:undefined,height:undefined,
}});
assert.equal(restored['page-header']?.width,undefined,'restoring automatic width must remove override');
assert.equal(restored['page-header']?.height,undefined,'restoring automatic height must remove override');

// Parent dimensions and canvas dimensions must have distinct tool contracts.
const frameSize=ENGINEER_SKILLS.find(skill=>skill.id==='dimensions')?.tools
  .find(tool=>tool.field==='frame:size');
assert.equal(frameSize?.status,'ready');
const dimensions=read('src/maintenance/FrameDimensionsToolDetails.tsx');
const runtime=read('src/maintenance/MaintenanceRuntime.tsx');
const workbench=read('src/maintenance/MaintenanceWorkbench.tsx');
const frameCard=read('src/components/FrameCard.tsx');
assert.ok(dimensions.includes("maint.clearFrameDimension(axis)")&&dimensions.includes("maint.patchFrame(axis==='height'"));
assert.ok(runtime.includes("clearFrameDimension:axis=>")&&runtime.includes('delete draft[axis]'));
assert.ok(workbench.includes("<FrameDimensionsToolDetails/>"));
assert.ok(frameCard.includes('editorStyle.width!==undefined')&&frameCard.includes('editorStyle.height!==undefined'));
assert.ok(frameCard.includes('<ScrollView nestedScrollEnabled'),'explicit parent height must not clip child content');

// Native page header, including individually editable text and local background image.
const shell=read('src/components/PageShell.tsx');
assert.ok(shell.includes('const saved=pageKey?editor.config[\'page-header\']'));
assert.ok(shell.includes("engineer.begin(pageKey,'page-header'"));
assert.ok(shell.includes('accessibilityLabel="編輯頁面最上方表頭"'));
assert.ok(shell.includes("id:'header:'+id")&&shell.includes('HeaderText id="title"'));
assert.ok(shell.includes('colorWithAlpha(background,headerConfig?.backgroundOpacity??1)'));
assert.ok(shell.includes('<View pointerEvents="none" style={StyleSheet.absoluteFill}'));
assert.ok(!shell.includes('<Image pointerEvents='),'image must not use unsupported pointerEvents prop');

// Background opacity never changes the opacity of financial text or icon content.
assert.equal(colorWithAlpha('#112233',.25),'rgba(17,34,51,0.250)');
const opaque=normalizeTargetOverride({backgroundOpacity:.3,opacity:.9});
const merged=mergeTargetAppearance(TARGET_APPEARANCE,opaque);
assert.equal(merged.backgroundOpacity,.3);
assert.equal(merged.opacity,.9);
const metric=read('src/components/MetricTile.tsx');
const inspector=read('src/maintenance/InspectableTarget.tsx');
assert.ok(metric.includes('backgroundColor:colorWithAlpha(effectiveBackground,editorStyle?.backgroundOpacity??1)'));
assert.ok(inspector.includes('backgroundColor:colorWithAlpha(resolvedAppearance.backgroundColor,appearance.backgroundOpacity)'));
assert.ok(inspector.includes('opacity:appearance.opacity'),'whole-component opacity stays independent');
assert.ok(!frameCard.includes('opacity:editorStyle.backgroundOpacity'),'frame children retain opacity');

for(const path of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(path).length>0,'immutable accounting file missing: '+path);
console.log('V3.0.10 real header, parent size, adaptive restore, independent background alpha, scoped edits and QA identity: PASS');
