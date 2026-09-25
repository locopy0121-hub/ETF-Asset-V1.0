import {useEffect,useMemo,type ReactNode} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useMaintenance} from './MaintenanceRuntime';
import {mergeTargetAppearance,type FrameMaintenanceContext,type InspectedTarget,type TargetAppearance} from './inspectionModel';

/** Light tap selects a live component; its mini wrench enters that *exact* component's engineer. */
export function InspectableTarget({target,frame,children,flex=false}:{
  target:InspectedTarget;frame:FrameMaintenanceContext;
  children:(appearance:TargetAppearance,customized:boolean)=>ReactNode;flex?:boolean;
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
    backgroundColor:appearance.backgroundColor,borderColor:appearance.borderColor,
    borderWidth:appearance.borderWidth,borderRadius:appearance.borderRadius,padding:appearance.padding,
  }:null;
  // A live quote/value can update while selected; refresh the inspector without replacing drafts.
  const fingerprint=JSON.stringify({properties:target.properties,base:target.base,label:target.label});
  useEffect(()=>{if(selected||editing)engineer.syncTarget(target);},[fingerprint,selected,editing,target.page,target.frameKey,target.id]);
  if(!engineer.enabled)return appearance.visible?<>{children(appearance,customized)}</>:null;
  return <View style={[flex?{flex:1,minWidth:0}:null,{position:'relative',opacity:appearance.opacity},wrapperStyle,
    (selected||editing)&&{borderWidth:2,borderStyle:'dashed',borderColor:theme.palette.primary,borderRadius:8}]}>
    {appearance.visible||selected||editing?children(appearance,customized):<View style={{height:24,opacity:.55}}><Text>元件已隱藏（維護模式）</Text></View>}
    {active?<Pressable style={StyleSheet.absoluteFillObject} accessibilityRole="button" accessibilityLabel={'選取元件 '+target.label} onPress={()=>engineer.selectTarget(target)} />:null}
    {(selected||editing)&&active?<Pressable accessibilityRole="button" accessibilityLabel={'編輯元件 '+target.label}
      onPress={()=>engineer.enterTarget(target,frame.frameConfig,frame.displayConfig)}
      style={[styles.wrench,{borderColor:theme.palette.primary,backgroundColor:theme.palette.surface}]}>
      <Text style={{fontSize:15}}>🔧</Text>
    </Pressable>:null}
    {(selected||editing)&&active?<View pointerEvents="none" style={[styles.caption,{backgroundColor:theme.palette.surface}]}>
      <Text numberOfLines={1} style={{fontSize:10,color:theme.palette.primary,fontWeight:'800'}}>已選取：{target.label}</Text>
    </View>:null}
  </View>;
}
const styles=StyleSheet.create({
  wrench:{position:'absolute',right:2,top:2,zIndex:8,elevation:8,
    minWidth:38,minHeight:38,borderRadius:20,borderWidth:1,justifyContent:'center',alignItems:'center'},
  caption:{position:'absolute',left:2,bottom:2,maxWidth:'80%',paddingHorizontal:5,paddingVertical:2,borderRadius:5},
});
