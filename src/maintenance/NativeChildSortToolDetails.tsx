import {useMemo,useRef} from 'react';
import {Animated,PanResponder,Text,View} from 'react-native';
import {isEngineerOwnedInstance} from './componentLibrary';
import {childDragSteps} from './nativeChildSort';
import {useMaintenance} from './MaintenanceRuntime';
import {useThemeRuntime} from '../theme/ThemeRuntime';

function NativeDragRow({id,label,index,total,onMove}:{
 id:string;label:string;index:number;total:number;
 onMove:(id:string,steps:number)=>void;
}){
 const theme=useThemeRuntime(),offset=useRef(new Animated.Value(0)).current;
 const latest=useRef(onMove);latest.current=onMove;
 const responder=useMemo(()=>PanResponder.create({
  onStartShouldSetPanResponder:()=>true,
  onMoveShouldSetPanResponder:()=>true,
  onPanResponderMove:(_event,gesture)=>offset.setValue(gesture.dy),
  onPanResponderRelease:(_event,gesture)=>{
   offset.setValue(0);const steps=childDragSteps(gesture.dy);
   if(steps)latest.current(id,steps);
  },
  onPanResponderTerminate:()=>offset.setValue(0),
  onPanResponderTerminationRequest:()=>false,
 }),[id,offset]);
 return <View style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:52,
   backgroundColor:theme.palette.surfaceMuted,borderWidth:1,borderColor:theme.palette.border,
   borderRadius:8,padding:5}}>
   <Text style={{color:theme.palette.textSecondary,fontWeight:'700',minWidth:24}}>{index+1}</Text>
   <Text numberOfLines={1} style={{flex:1,color:theme.palette.text}}>{label}</Text>
   <Animated.View {...responder.panHandlers} accessible accessibilityRole="adjustable"
    accessibilityLabel={'拖曳排序 '+label+'，目前第 '+(index+1)+'／'+total+' 項'}
    accessibilityActions={[{name:'increment',label:'下一位'},{name:'decrement',label:'上一位'}]}
    onAccessibilityAction={event=>latest.current(id,event.nativeEvent.actionName==='increment'?1:-1)}
    style={{width:52,minHeight:44,alignItems:'center',justifyContent:'center',
      backgroundColor:theme.palette.surface,borderWidth:2,
      borderColor:theme.palette.primary,borderRadius:9,
      transform:[{translateY:offset}]}}>
    <Text accessible={false} style={{fontSize:24,color:theme.palette.primary}}>⠿</Text>
   </Animated.View>
 </View>;
}
/** Drag only real locally installed children; their true Flex order follows the draft array. */
export function NativeChildSortToolDetails(){
 const maint=useMaintenance(),theme=useThemeRuntime(),session=maint.session;
 const parent=session?.scope==='instance'?session.draftInstances.find(x=>x.id===session.instanceId):undefined;
 if(!parent||parent.templateId!=='parent-frame'||!isEngineerOwnedInstance(parent))
   return <Text style={{color:theme.palette.textSecondary}}>請先選取工程師新增的父框架。</Text>;
 const siblings=session!.draftInstances.filter(x=>x.parentId===parent.id&&isEngineerOwnedInstance(x));
 return <View style={{gap:8,marginTop:8}}>
   <Text style={{color:theme.palette.textSecondary,fontSize:12}}>
    按住右側 44dp 手柄向上或向下拖曳，即時改變上方目前 A 父框架內真實 Flex 子元件的順序。
    不更動其內容、尺寸、資料或其他框架；取消還原，底部「儲存／套用」後才寫入。
   </Text>
   {siblings.map((item,index)=><NativeDragRow key={item.id} id={item.id} index={index}
     total={siblings.length} label={item.text||item.templateId}
     onMove={maint.reorderOwnedSibling}/>)}
   {!siblings.length?<Text style={{color:theme.palette.textSecondary}}>目前父框架尚未新增子元件。</Text>:null}
 </View>;
}
