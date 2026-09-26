import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {PanResponder,Pressable,StyleSheet,Text,View} from 'react-native';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useMaintenance} from './MaintenanceRuntime';
import {useWorkspace} from './WorkspaceSurface';
import {effectiveOffset,linkedColor,positionedRect,snapDraggedRect,type FinancialTone,type TargetGeometry} from './workspaceModel';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {colorWithAlpha} from './frameEffects';
import {applyConditionalAppearance,activeConditionalRule} from './conditionalVisual';
import {simulatedVisualTone,SIMULATION_LABELS} from './dataSimulation';
import {TargetBackdrop,targetShadowStyle} from './TargetSurfaceEffects';
import {mergeTargetAppearance,type FrameMaintenanceContext,type InspectedTarget,type TargetAppearance,type TargetOverride} from './inspectionModel';

/** Selects the ACTUAL mounted component and measures its XY relative to the ACTUAL frame. */
export function InspectableTarget({target,frame,children,flex=false}:{
  target:InspectedTarget;frame:FrameMaintenanceContext;
  children:(appearance:TargetAppearance,customized:boolean,override:TargetOverride,render:Readonly<{displayTone:FinancialTone;simulated:boolean}>)=>ReactNode;flex?:boolean;
}){
  const engineer=useMaintenance();
  const workspace=useWorkspace();
  const theme=useThemeRuntime();
  const settings=useSettingsRuntime();
  const node=useRef<View|null>(null);
  const [geometry,setGeometry]=useState<TargetGeometry|null>(null);
  const active=engineer.enabled&&(!engineer.session||engineer.session.page===frame.page&&engineer.session.frameKey===frame.frameKey);
  const selected=engineer.selection?.page===target.page&&engineer.selection.frameKey===target.frameKey&&engineer.selection.id===target.id;
  const editing=engineer.session?.scope==='target'&&engineer.session.target?.page===target.page&&engineer.session.target.frameKey===target.frameKey&&engineer.session.target.id===target.id;
  const override=engineer.getTargetOverride(target.page,target.frameKey,target.id,target.kind);
  const actualTone=override.profitToneOverride&&override.profitToneOverride!=='auto'?
    override.profitToneOverride:target.profitTone??'neutral';
  // Simulation is session-only and only paints the selected real A in maintenance mode.
  const previewState=editing&&engineer.enabled?engineer.session?.previewState??'actual':'actual';
  const displayTone=simulatedVisualTone(previewState,actualTone);
  const renderContext={displayTone,simulated:previewState==='gain'||previewState==='loss'||previewState==='neutral'};
  const condition=activeConditionalRule(override.conditionalStyles,displayTone);
  const appearance=applyConditionalAppearance(mergeTargetAppearance(target.base,override),displayTone);
  const resolvedAppearance={...appearance,
    textColor:linkedColor(appearance.textColor,appearance.textProfitColor,displayTone,settings.prefs.display),
    labelColor:linkedColor(appearance.labelColor,appearance.labelProfitColor,displayTone,settings.prefs.display),
    captionColor:linkedColor(appearance.captionColor,appearance.captionProfitColor,displayTone,settings.prefs.display),
    backgroundColor:linkedColor(appearance.backgroundColor,appearance.backgroundProfitColor,displayTone,settings.prefs.display),
    borderColor:linkedColor(appearance.borderColor,appearance.borderProfitColor,displayTone,settings.prefs.display),
    gradientEndColor:linkedColor(appearance.gradientEndColor,appearance.gradientEndProfitColor,displayTone,settings.prefs.display),
    gradientMidColor:linkedColor(appearance.gradientMidColor,appearance.gradientMidProfitColor,displayTone,settings.prefs.display),
    shadowColor:linkedColor(appearance.shadowColor,appearance.shadowProfitColor,displayTone,settings.prefs.display),
    glowColor:linkedColor(appearance.glowColor,appearance.glowProfitColor,displayTone,settings.prefs.display),
  };
  const customized=Object.keys(override).length>0;
  const measured=geometry??{naturalX:0,naturalY:0,width:0,height:0,
    spaceWidth:workspace?.bounds.width??0,spaceHeight:workspace?.bounds.height??0};
  const displacement=effectiveOffset(override,measured);
  // Preserve V3.0.3's two-column safe grid in both modes, including when the editor is OFF.
  const placement=flex?styles.metricPlacement:undefined;
  const explicitWidth=override.width!==undefined?(flex?
    {flexBasis:override.width,minWidth:override.width,maxWidth:override.width}:{width:override.width}):null;
  const spatial={transform:[{translateX:displacement.x},{translateY:displacement.y}],
    ...(override.height!==undefined?{height:override.height}:{})};
  // Material layers for native text/value and generic surfaces are real, local instances.
  // MetricTile owns its own backdrop so financial labels and figures are not wrapped twice.
  const materialKeys=['backgroundMode','gradientDirection','gradientEndColor','gradientMidColor',
    'gradientMidEnabled','gradientMidStop','glowEnabled','glowColor','glowOpacity','glowWidth',
    'shadowEnabled','shadowColor','shadowOpacity','shadowBlur','shadowOffsetX','shadowOffsetY',
    'marginVertical','marginHorizontal','borderStyle'];
  const materialActive=customized&&['text','value','prefix','generic','frame'].includes(target.kind)&&
    (materialKeys.some(key=>Object.hasOwn(override,key))||Boolean(condition&&
      (condition.backgroundColor||condition.borderColor||condition.backgroundOpacity!==undefined)));
  const wrapperKind=['wall','portfolio-list','control','generic','frame'].includes(target.kind)||materialActive;
  const wrapperStyle=customized&&wrapperKind?{
    // Parent frame paints its own border, padding and opaque face. Never double-apply.
    ...(target.kind==='frame'?{backgroundColor:'transparent'}:
      materialActive&&appearance.backgroundMode==='gradient'?{backgroundColor:'transparent'}:
      (override.backgroundColor||override.backgroundProfitColor!==undefined||override.backgroundOpacity!==undefined||
        condition?.backgroundColor||condition?.backgroundOpacity!==undefined?
        {backgroundColor:colorWithAlpha(resolvedAppearance.backgroundColor,appearance.backgroundOpacity)}:{})),
    ...(target.kind==='frame'?{}:(override.borderColor||override.borderProfitColor!==undefined||condition?.borderColor?{borderColor:resolvedAppearance.borderColor}:{})),
    ...(target.kind==='frame'?{}:(override.borderWidth!==undefined?{borderWidth:appearance.borderWidth}:{})),
    ...(target.kind==='frame'?{}:(override.borderRadius!==undefined?{borderRadius:appearance.borderRadius}:{})),
    ...(target.kind==='frame'?{}:(override.padding!==undefined?{padding:appearance.padding}:{})),
    ...(materialActive?{
      borderStyle:appearance.borderStyle,marginVertical:appearance.marginVertical,
      marginHorizontal:appearance.marginHorizontal,
      ...targetShadowStyle(appearance,resolvedAppearance.shadowColor),
    }:{}),
  }:null;
  const targetKey=target.id; // this provider is scoped to one real frame, not a shadow preview.
  const measureCurrent=()=>{
    if(!node.current||!workspace)return;
    workspace.measure(node.current,(rect,space)=>{
      const nextShape:TargetGeometry={naturalX:0,naturalY:0,width:rect.width,height:rect.height,
        spaceWidth:space.width,spaceHeight:space.height};
      const shifted=effectiveOffset(override,nextShape);
      const next:TargetGeometry={...nextShape,naturalX:rect.x-shifted.x,naturalY:rect.y-shifted.y};
      setGeometry(previous=>previous&&Object.keys(next).every(k=>
        previous[k as keyof TargetGeometry]===next[k as keyof TargetGeometry])?previous:next);
    });
  };
  // Ref state prevents pan responders being replaced while React renders during a drag.
  const live=useRef({active,selected,geometry,override,engineer,workspace,target,drag:{x:0,y:0}});
  live.current={...live.current,active,selected,geometry,override,engineer,workspace,target};
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>false,
    onMoveShouldSetPanResponder:(_,gesture)=>live.current.active&&live.current.selected&&
      Math.abs(gesture.dx)+Math.abs(gesture.dy)>5,
    onPanResponderGrant:()=>{
      const r=live.current;r.drag={x:r.override.offsetX??0,y:r.override.offsetY??0};
    },
    onPanResponderMove:(_,gesture)=>{
      const r=live.current;if(!r.active||!r.selected)return;
      const x=Math.round(r.drag.x+gesture.dx),y=Math.round(r.drag.y+gesture.dy);
      if(r.override.offsetX!==x||r.override.offsetY!==y)r.engineer.patchTarget(r.target.id,{offsetX:x,offsetY:y});
    },
    onPanResponderRelease:(_,gesture)=>{
      const r=live.current,g=r.geometry,w=r.workspace;
      if(!g||!w||!r.active||!r.selected)return;
      const x=Math.round(r.drag.x+gesture.dx),y=Math.round(r.drag.y+gesture.dy);
      const proposed={...r.override,offsetX:x,offsetY:y};
      const rect=positionedRect(g,proposed);
      const nearby=Object.entries(w.boxes).filter(([id])=>id!==targetKey).map(([,box])=>box);
      const snapped=snapDraggedRect(rect,w.config,{width:g.spaceWidth,height:g.spaceHeight},nearby);
      // Manual XY entry and ±1 controls NEVER invoke snapDraggedRect.
      r.engineer.patchTarget(r.target.id,{offsetX:x+snapped.x-rect.x,offsetY:y+snapped.y-rect.y});
    },
  }),[]);
  const fingerprint=JSON.stringify({properties:target.properties,base:target.base,label:target.label,
    geometry,profitTone:target.profitTone});
  useEffect(()=>{
    if((selected||editing)&&geometry)engineer.syncTarget({...target,geometry});
  },[fingerprint,selected,editing,target.page,target.frameKey,target.id]);
  // A parent resize or horizontal workbench scroll can alter the relative base XY.
  // Re-measure every anchored component when the frame width/height changes,
  // not just the currently selected one; otherwise sibling anchors remain stale.
  useEffect(()=>{if(selected||editing||override.anchorX||override.anchorY)measureCurrent();},
    [workspace?.scrollEpoch,workspace?.bounds.width,workspace?.bounds.height,selected,editing,
      override.anchorX,override.anchorY]);
  const rect=geometry?positionedRect(geometry,override):null;
  useEffect(()=>{
    if(!workspace||!rect)return;
    workspace.report(targetKey,rect);
    if(engineer.enabled)engineer.reportRect(target.page,target.frameKey,targetKey,rect);
    return()=>{workspace.report(targetKey,null);engineer.reportRect(target.page,target.frameKey,targetKey,null);};
  },[workspace?.report,engineer.enabled,engineer.reportRect,targetKey,rect?.x,rect?.y,rect?.width,rect?.height]);
  // Only truly mounted native A targets are eligible for batch preview/edit.
  // This registry is ephemeral, scoped to the real page/frame and never stores data sources.
  const visualFingerprint=JSON.stringify({label:target.label,kind:target.kind,base:target.base});
  useEffect(()=>{
    if(!engineer.enabled)return;
    engineer.registerTarget(target.page,target.frameKey,{id:target.id,kind:target.kind,label:target.label,base:target.base});
    return()=>engineer.unregisterTarget(target.page,target.frameKey,target.id);
  },[engineer.enabled,engineer.registerTarget,engineer.unregisterTarget,target.page,target.frameKey,target.id,visualFingerprint]);
  const currentTarget=geometry?{...target,geometry}:target;
  const pick=()=>{measureCurrent();engineer.selectTarget(currentTarget);};
  const enter=()=>{measureCurrent();engineer.enterTarget(currentTarget,frame.frameConfig,frame.displayConfig);};
  // Unmodified native subcomponents remain byte-for-byte/layout-for-layout unchanged when OFF.
  // A hidden saved target has NO placeholder or interaction when the engineer is OFF.
  if(!engineer.enabled&&!appearance.visible)return null;
  // Saved text/color/font overrides apply to the native child directly. Never
  // introduce a new wrapper around text merely because it was customized;
  // this preserves the user's V3.0.3-accepted NORMAL-mode layout.
  const hasSpatialOverride=override.offsetX!==undefined||override.offsetY!==undefined||
    override.width!==undefined||override.height!==undefined||
    Boolean(override.anchorX&&override.anchorX!=='free')||
    Boolean(override.anchorY&&override.anchorY!=='free');
  const needsContainerStyle=Boolean(wrapperStyle&&Object.keys(wrapperStyle).length>0);
  if(!engineer.enabled&&!flex&&!hasSpatialOverride&&!needsContainerStyle)
    return <>{children(resolvedAppearance,customized,override,renderContext)}</>;
  return <View ref={node} collapsable={false} onLayout={measureCurrent}
    {...(active&&selected?responder.panHandlers:{})}
    style={[placement,{position:'relative',opacity:appearance.opacity},explicitWidth,spatial,wrapperStyle]}>
    {materialActive?<TargetBackdrop appearance={appearance} start={resolvedAppearance.backgroundColor}
      middle={resolvedAppearance.gradientMidColor} end={resolvedAppearance.gradientEndColor}
      glow={resolvedAppearance.glowColor}/>:null}
    {appearance.visible||selected||editing?children(resolvedAppearance,customized,override,renderContext):
      <View style={{height:24,opacity:.55}}><Text>元件已隱藏（維護模式）</Text></View>}
    {editing&&previewState!=='actual'?<View pointerEvents="none"
      style={{position:'absolute',left:2,right:2,bottom:1,padding:4,borderRadius:5,
        backgroundColor:theme.palette.surface,borderWidth:1,borderColor:theme.palette.primary}}>
      <Text style={{fontSize:10,fontWeight:'800',color:theme.palette.primary}}>
        模擬預覽｜{SIMULATION_LABELS[previewState]}｜真實資料及已儲存設定未變更
      </Text>
    </View>:null}
    {(selected||editing)&&engineer.enabled?<View pointerEvents="none"
      style={[StyleSheet.absoluteFill,styles.selectionOutline,{borderColor:theme.palette.primary}]}/>:null}
    {active?<Pressable style={StyleSheet.absoluteFill} accessibilityRole="button"
      accessibilityLabel={'選取元件 '+target.label} onPress={pick}/>:null}
    {(selected||editing)&&active?<Pressable accessibilityRole="button"
      accessibilityLabel={'編輯元件 '+target.label} onPress={enter}
      style={[styles.wrench,{borderColor:theme.palette.primary,backgroundColor:theme.palette.surface}]}>
      <Text style={{fontSize:15}}>🔧</Text>
    </Pressable>:null}
  </View>;
}
const styles=StyleSheet.create({
  metricPlacement:{flexGrow:1,flexShrink:0,flexBasis:'46%',minWidth:136,maxWidth:'100%',alignSelf:'stretch'},
  selectionOutline:{borderWidth:2,borderStyle:'dashed',borderRadius:8,zIndex:4},
  wrench:{position:'absolute',right:2,top:2,zIndex:8,elevation:8,
    minWidth:28,minHeight:28,borderRadius:15,borderWidth:1,justifyContent:'center',alignItems:'center'},
});
