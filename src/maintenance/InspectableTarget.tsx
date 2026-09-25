import {useEffect,type ReactNode} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useMaintenance} from './MaintenanceRuntime';
import {mergeTargetAppearance,type FrameMaintenanceContext,type InspectedTarget,type TargetAppearance,type TargetOverride} from './inspectionModel';

/** Light tap selects a live component; its mini wrench enters that *exact* component's engineer. */
export function InspectableTarget({target,frame,children,flex=false}:{
  target:InspectedTarget;frame:FrameMaintenanceContext;
  children:(appearance:TargetAppearance,customized:boolean,override:TargetOverride)=>ReactNode;flex?:boolean;
}){
  const engineer=useMaintenance();
  const theme=useThemeRuntime();
  const active=engineer.enabled&&(!engineer.session||engineer.session.page===frame.page&&engineer.session.frameKey===frame.frameKey);
  const selected=engineer.selection?.page===target.page&&engineer.selection.frameKey===target.frameKey&&engineer.selection.id===target.id;
  const editing=engineer.session?.scope==='target'&&engineer.session.target?.page===target.page&&engineer.session.target.frameKey===target.frameKey&&engineer.session.target.id===target.id;
  const override=engineer.getTargetOverride(target.page,target.frameKey,target.id);
  const appearance=mergeTargetAppearance(target.base,override);
  const customized=Object.keys(override).length>0;
  const wrapperStyle=customized&&['wall','portfolio-list','control','generic'].includes(target.kind)?{
    ...(override.backgroundColor?{backgroundColor:appearance.backgroundColor}:{}),
    ...(override.borderColor?{borderColor:appearance.borderColor}:{}),
    ...(override.borderWidth!==undefined?{borderWidth:appearance.borderWidth}:{}),
    ...(override.borderRadius!==undefined?{borderRadius:appearance.borderRadius}:{}),
    ...(override.padding!==undefined?{padding:appearance.padding}:{}),
  }:null;
  // A live quote/value can update while selected; refresh the inspector without replacing drafts.
  const fingerprint=JSON.stringify({properties:target.properties,base:target.base,label:target.label});
  useEffect(()=>{if(selected||editing)engineer.syncTarget(target);},[fingerprint,selected,editing,target.page,target.frameKey,target.id]);
  // Use the same grid placement in normal and engineer modes; toggling the engineer
  // must never make metric cards shrink into columns narrower than their content.
  const placement=flex?styles.metricPlacement:undefined;
  if(!engineer.enabled)return appearance.visible?(flex?
    <View style={placement}>{children(appearance,customized,override)}</View>:
    <>{children(appearance,customized,override)}</>):null;
  return <View style={[placement,{position:'relative',opacity:appearance.opacity},wrapperStyle]}>
    {(selected||editing)?<View pointerEvents="none" style={[StyleSheet.absoluteFill,styles.selectionOutline,{borderColor:theme.palette.primary}]}/>:null}
    {appearance.visible||selected||editing?children(appearance,customized,override):<View style={{height:24,opacity:.55}}><Text>元件已隱藏（維護模式）</Text></View>}
    {active?<Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={'選取元件 '+target.label} onPress={()=>engineer.selectTarget(target)} />:null}
    {(selected||editing)&&active?<Pressable accessibilityRole="button" accessibilityLabel={'編輯元件 '+target.label}
      onPress={()=>engineer.enterTarget(target,frame.frameConfig,frame.displayConfig)}
      style={[styles.wrench,{borderColor:theme.palette.primary,backgroundColor:theme.palette.surface}]}>
      <Text style={{fontSize:15}}>🔧</Text>
    </Pressable>:null}
  </View>;
}
const styles=StyleSheet.create({
  // Each card retains its minimum width so two narrow tiles wrap instead of colliding.
  // The selection outline is a separate absolute overlay and occupies ZERO layout space.
  metricPlacement:{flexGrow:1,flexShrink:0,flexBasis:'46%',minWidth:136,maxWidth:'100%',alignSelf:'stretch'},
  selectionOutline:{borderWidth:2,borderStyle:'dashed',borderRadius:8},
  wrench:{position:'absolute',right:2,top:2,zIndex:8,elevation:8,
    minWidth:28,minHeight:28,borderRadius:15,borderWidth:1,justifyContent:'center',alignItems:'center'},
});
