import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_WORKSPACE,displayPoint,effectiveOffset,enteredOffset,intersects,
  linkedColor,normalizeWorkspace,positionWarnings,positionedRect,snapDraggedRect} from '../src/maintenance/workspaceModel';
import {TARGET_APPEARANCE,mergeTargetAppearance,normalizeTargetOverride,targetToolSupported} from '../src/maintenance/inspectionModel';
import {ENGINEER_SKILLS} from '../src/maintenance/skillTree';
const read=(path:string)=>readFileSync(path,'utf8');

// Real-coordinate math, explicitly separate from the underlying Finance Core.
const g={naturalX:150,naturalY:120,width:400,height:100,spaceWidth:820,spaceHeight:820};
const at0=positionedRect(g,{}),one=positionedRect(g,{offsetX:1,offsetY:-1});
assert.deepEqual([at0.x,at0.y],[150,120]);
assert.equal(one.x-at0.x,1);assert.equal(one.y-at0.y,-1);
assert.equal(enteredOffset(510,'x',g,{},'top-left'),360);
assert.equal(positionedRect(g,{offsetX:enteredOffset(510,'x',g,{},'top-left')!}).x,510);
assert.equal(displayPoint(410,'x',g,'center'),0);
assert.equal(enteredOffset(0,'x',g,{},'center'),260);
assert.equal(enteredOffset(0,'y',g,{},'center'),290);
assert.equal(enteredOffset(9000,'x',g,{},'center'),null);
const resized={...g,spaceWidth:1020};
assert.equal(positionedRect(resized,{offsetX:80,anchorX:'right',anchorBaseWidth:820}).x,430);
assert.equal(positionedRect(resized,{offsetX:80,anchorX:'center',anchorBaseWidth:820}).x,330);
assert.equal(positionedRect(resized,{offsetX:80,anchorX:'left',anchorBaseWidth:820}).x,230);
assert.deepEqual(effectiveOffset({offsetY:3,anchorY:'bottom',anchorBaseHeight:820},
  {...g,spaceHeight:920}),{x:0,y:103});
assert.equal(normalizeWorkspace({width:820,height:820}).snapEnabled,false,'Mobile defaults OFF');
assert.equal(normalizeWorkspace({width:1020,height:820,origin:'center'}).origin,'center');
assert.equal(normalizeWorkspace({width:100000,snapThreshold:500}).width,2400);
assert.equal(DEFAULT_WORKSPACE.showAxes,true);
const proposed={x:507,y:203,width:100,height:50};
assert.deepEqual(snapDraggedRect(proposed,DEFAULT_WORKSPACE,{width:1020,height:820}),proposed);
const enabled={...DEFAULT_WORKSPACE,snapEnabled:true,snapModes:['center','grid','edges','siblings'] as const,snapThreshold:7};
const snapped=snapDraggedRect(proposed,enabled,{width:1020,height:820},[{x:507,y:220,width:90,height:40}]);
assert.equal(snapped.x,507,'nearest sibling x is preferred to grid');
const edge=snapDraggedRect({x:3,y:4,width:100,height:50},enabled,{width:1020,height:820});
assert.deepEqual([edge.x,edge.y],[0,0]);
assert.equal(intersects({x:0,y:0,width:20,height:20},{x:19,y:3,width:4,height:4}),true);
assert.equal(intersects({x:0,y:0,width:20,height:20},{x:20,y:3,width:4,height:4}),false);
const diag=positionWarnings({x:700,y:700,width:200,height:200},g,[{x:750,y:750,width:40,height:40}]);
assert.equal(diag.overflow,true);assert.equal(diag.overlaps,1);

// Independent text/background/border flags all resolve via existing global system palette.
const global={gainColor:'#AA1122',lossColor:'#22AA11',neutralColor:'#445566'};
assert.equal(linkedColor('#FFFFFF',true,'gain',global),'#AA1122');
assert.equal(linkedColor('#FFFFFF',false,'gain',global),'#FFFFFF');
assert.equal(linkedColor('#FFFFFF',true,'loss',global),'#22AA11');
assert.equal(linkedColor('#FFFFFF',true,'neutral',global),'#445566');
const custom=normalizeTargetOverride({offsetX:120,offsetY:-4,width:800,height:100,
  textProfitColor:true,labelProfitColor:false,backgroundProfitColor:true,borderProfitColor:true,
  profitToneOverride:'gain',evil:true});
assert.deepEqual(custom,{offsetX:120,offsetY:-4,width:800,height:100,textProfitColor:true,
  labelProfitColor:false,backgroundProfitColor:true,borderProfitColor:true,profitToneOverride:'gain'});
assert.equal(mergeTargetAppearance(TARGET_APPEARANCE,custom).backgroundProfitColor,true);
for(const field of ['target:xy','target:dimensions','target:anchors','target:backgroundProfitColor','target:borderProfitColor'])
  assert.equal(targetToolSupported('metric',field),true,'missing metric tool: '+field);
assert.equal(targetToolSupported('value','target:labelText'),false,'financial value cannot be replaced');
assert.ok(ENGINEER_SKILLS.length>=16,'all existing B skill domains must remain');
for(const field of ['workspace:size','workspace:guides','workspace:snapping','workspace:diagnostics','target:xy','target:dimensions','target:anchors'])
  assert.ok(ENGINEER_SKILLS.some(group=>group.tools.some(tool=>tool.field===field&&tool.status==='ready')),field);

// Source coverage is a CODE/algorithm gate; real-device UI acceptance is a separate gate.
const stack=read('src/components/PageEditorStack.tsx'),inspect=read('src/maintenance/InspectableTarget.tsx');
const dock=read('src/maintenance/MaintenanceWorkbench.tsx'),picker=read('src/components/ColorPalettePicker.tsx');
const spatial=read('src/maintenance/SpatialEditor.tsx'),surface=read('src/maintenance/WorkspaceSurface.tsx');
const metric=read('src/components/MetricTile.tsx'),frame=read('src/components/FrameCard.tsx');
const runtime=read('src/maintenance/MaintenanceRuntime.tsx'),model=read('src/maintenance/inspectionModel.ts');
assert.ok(stack.includes('<WorkspaceSurface')&&stack.includes('onBounds={bounds=>engineer.reportWorkspaceBounds'));
assert.ok(stack.includes('<InstalledFrameComponents instances={instances} frame={frame}'));
assert.ok(surface.includes('stage.current.measureInWindow')&&surface.includes('target.measureInWindow'));
assert.ok(surface.includes('config.showAxes')&&surface.includes('bounds.width/2')&&surface.includes('bounds.height/2'));
assert.ok(inspect.includes('PanResponder.create')&&inspect.includes('snapDraggedRect(rect,w.config'));
assert.ok(inspect.includes('geometry')&&inspect.includes('engineer.syncTarget'));
assert.ok(inspect.includes('if(!engineer.enabled&&!appearance.visible)return null'),'hidden targets must render nothing in normal mode');
assert.ok(inspect.includes('!engineer.enabled&&!flex&&!hasSpatialOverride&&!needsContainerStyle'),
  'saved color/typography changes must not insert a wrapper into approved normal-mode layout');
assert.ok(inspect.includes('override.anchorX||override.anchorY')&&inspect.includes('measureCurrent();'),
  'all responsive anchors must be remeasured when the workspace changes');
assert.ok(spatial.includes("move('x',-1)")&&spatial.includes("move('x',1)")&&spatial.includes("move('y',-1)")&&spatial.includes("move('y',1)"));
assert.ok(spatial.includes('enteredOffset')&&spatial.includes('套用工作區尺寸')&&spatial.includes('套用長寬'));
assert.ok(dock.includes('setShowAllSkills]=useState(true)')&&dock.includes('<SpatialToolDetails'));
assert.ok(picker.includes('onProfitColorChange')&&!picker.includes('HEX 輸入'));
for(const source of [metric,frame])assert.ok(source.includes('linkedColor'),'system profit color disconnected');
for(const flag of ['textProfitColor','labelProfitColor','captionProfitColor','backgroundProfitColor','borderProfitColor'])
  assert.ok(model.includes(flag));
assert.ok(runtime.includes('schema:3,instances:nextSaved,targets:nextTargets,workspaces:nextWorkspace'));
assert.ok(runtime.includes('parsed.schema===2||parsed.schema===3'),'old saved target styles must migrate');
assert.ok(!model.includes('etfCalculators'));
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.ok(['3.0.9','3.0.10','3.0.11','3.0.12'].includes(pkg.version));assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,30000+Number(pkg.version.split('.')[2]));assert.equal(app.expo.ios.buildNumber,String(30000+Number(pkg.version.split('.')[2])));
assert.ok(read('.github/workflows/ci.yml').includes(`TF-Asset-V${pkg.version}-QA.apk`));
console.log('V3.0.9 measured spatial math, strict ±1, optional drag-only snap, global color flags and cross-page contracts: AUTOMATED PASS');
