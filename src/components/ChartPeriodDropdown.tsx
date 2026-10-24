import {useState} from 'react';
import {View,StyleSheet} from 'react-native';
import {Pressable,Text} from './EditableNative';
import {useThemeRuntime} from '../theme/ThemeRuntime';
/** Reusable compact period/range dropdown. Only the parent fetches official data. */
export function ChartPeriodDropdown<T extends string>({label,value,options,onChange}:{
 label:string;value:T;options:readonly Readonly<{id:T;label:string}>[];onChange:(item:T)=>void;
}){
 const theme=useThemeRuntime();
 const [expanded,setExpanded]=useState(false);
 const chosen=options.find(x=>x.id===value)?.label??String(value);
 return <View style={{gap:5,maxWidth:'100%'}}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded}}
    accessibilityLabel={label+' '+chosen+' 下拉選單'}
    onPress={()=>setExpanded(open=>!open)}
    style={[styles.button,{borderColor:theme.palette.border,backgroundColor:theme.palette.surfaceMuted}]}>
    <Text style={{fontSize:11,color:theme.palette.textSecondary}}>{label}</Text>
    <Text style={{color:theme.palette.primary,fontSize:12,fontWeight:'900'}}>{chosen}　{expanded?'▴':'▾'}</Text>
  </Pressable>
  {expanded?<View style={[styles.menu,{borderColor:theme.palette.border,backgroundColor:theme.palette.surfaceMuted}]}>
   {options.map(option=><Pressable key={option.id} accessibilityRole="button"
     accessibilityState={{selected:option.id===value}}
     onPress={()=>{onChange(option.id);setExpanded(false);}}
     style={[styles.option,option.id===value&&{backgroundColor:theme.palette.primary}]}>
    <Text style={{fontSize:12,fontWeight:'800',color:option.id===value?'white':theme.palette.text}}>{option.label}</Text>
   </Pressable>)}
  </View>:null}
 </View>;
}
const styles=StyleSheet.create({
 button:{alignSelf:'flex-start',minHeight:38,minWidth:138,gap:11,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderRadius:9,borderWidth:1,paddingHorizontal:10,paddingVertical:7},
 menu:{flexDirection:'row',flexWrap:'wrap',padding:6,borderWidth:1,borderRadius:9,gap:5},
 option:{paddingHorizontal:11,paddingVertical:8,borderRadius:7,minWidth:65,alignItems:'center'}
});
