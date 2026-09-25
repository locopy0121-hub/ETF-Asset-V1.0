import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {PanResponder,Pressable,StyleSheet,Text,View} from 'react-native';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useMaintenance} from './MaintenanceRuntime';
import {useWorkspace} from './WorkspaceSurface';
import {effectiveOffset,linkedColor,positionedRect,snapDraggedRect,type TargetGeometry} from './workspaceModel';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {mergeTargetAppearance,type FrameMaintenanceContext,type InspectedTarget,type TargetAppearance,type TargetOverride} from './inspectionModel';

/** Selects the ACTUAL mounted component and measures its XY relative to the ACTUAL frame. */
export function InspectableTarget({target,frame,children,flex=false}:{
  target:InspectedTarget;frame:FrameMaintenanceContext;
  children:(appearance:TargetAppearance,customized:boolean,override:TargetOverride)=>ReactNode;flex?:boolean;
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
  const override=engineer.getTargetOverride(target.page,target.frameKey,target.id);
  const appearance=mergeTargetAppearance(target.base,override);
  const actualTone=override.profitToneOverride&&override.profitToneOverride!=='auto'?
    override.profitToneOverride:target.profitTone??'neutral';
  const resolvedAppearance={...appearance,
    textColor:linkedColor(appearance.textColor,appearance.textProfitColor,actualTone,settings.prefs.display),
    labelColor:linkedColor(appearance.labelColor,appearance.labelProfitColor,actualTone,settings.prefs.display),
    captionColor:linkedColor(appearance.captionColor,appearance.captionProfitColor,actualTone,settings.prefs.display),
    backgroundColor:linkedColor(appearance.backgroundColor,appearance.backgroundProfitColor,actualTone,settings.prefs.display),
    borderColor:linkedColor(appearance.borderColor,appearance.borderProfitColor,actualTone,settings.prefs.display),
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
  const wrapperStyle=customized&&['wall','portfolio-list','control','generic'].includes(target.kind)?{
    ...(override.backgroundColor||override.backgroundProfitColor?{backgroundColor:resolvedAppearance.backgroundColor}:{}),
    ...(override.borderColor||override.borderProfitColor?{borderColor:resolvedAppearance.borderColor}:{}),
    ...(override.borderWidth!==undefined?{borderWidth:appearance.borderWidth}:{}),
    ...(override.borderRadius!==undefined?{borderRadius:appearance.borderRadius}:{}),
    ...(override.padding!==undefined?{padding:appearance.padding}:{}),
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
  useEffect(()=>{if(selected||editing)measureCurrent();},
    [workspace?.scrollEpoch,workspace?.bounds.width,workspace?.bounds.height,selected,editing]);
  const rect=geometry?positionedRect(geometry,override):null;
  useEffect(()=>{
    if(!workspace||!rect)return;
    workspace.report(targetKey,rect);
    if(engineer.enabled)engineer.reportRect(target.page,target.frameKey,targetKey,rect);
    return()=>{workspace.report(targetKey,null);engineer.reportRect(target.page,target.frameKey,targetKey,null);};
  },[workspace?.report,engineer.enabled,engineer.reportRect,targetKey,rect?.x,rect?.y,rect?.width,rect?.height]);
  const currentTarget=geometry?{...target,geometry}:target;
  const pick=()=>{measureCurrent();engineer.selectTarget(currentTarget);};
  const enter=()=>{measureCurrent();engineer.enterTarget(currentTarget,frame.frameConfig,frame.displayConfig);};
  // Unmodified native subcomponents remain byte-for-byte/layout-for-layout unchanged when OFF.
  if(!engineer.enabled&&!customized&&!flex)return appearance.visible?<>{children(resolvedAppearance,false,override)}</>:null;
  return <View ref={node} collapsable={false} onLayout={measureCurrent}
    {...(active&&selected?responder.panHandlers:{})}
    style={[placement,{position:'relative',opacity:appearance.opacity},explicitWidth,spatial,wrapperStyle]}>
    {appearance.visible||selected||editing?children(resolvedAppearance,customized,override):
      <View style={{height:24,opacity:.55}}><Text>元件已隱藏（維護模式）</Text></View>}
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
