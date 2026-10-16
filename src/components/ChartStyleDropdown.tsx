import {useState} from 'react';
import {View,StyleSheet} from 'react-native';
import {Pressable,Text} from './EditableNative';
import {NATIVE_CHART_STYLES,type NativeChartStyle} from '../domain/chartEditor';
import {useThemeRuntime} from '../theme/ThemeRuntime';
export const MARKET_CHART_STYLES:readonly NativeChartStyle[]=['candlestick','ohlc','line','area','column','price-volume','three-gates'];
/** Collapsible chart-type selector shared by stock, holding and market chart entry points. */
export function ChartStyleDropdown({value,onChange,allowedStyles}:{value:NativeChartStyle;onChange:(next:NativeChartStyle)=>void;allowedStyles?:readonly NativeChartStyle[]}){
 const theme=useThemeRuntime(),[expanded,setExpanded]=useState(false);
 const choices=NATIVE_CHART_STYLES.filter(s=>!allowedStyles||allowedStyles.includes(s.id));
 const selected=choices.find(s=>s.id===value)?.label??'K 線';
 return <View style={{gap:6,maxWidth:'100%'}}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={'圖表樣式 '+selected+' 下拉選單'}
    onPress={()=>setExpanded(open=>!open)} style={[styles.trigger,{backgroundColor:theme.palette.surfaceMuted,borderColor:theme.palette.border}]}>
   <Text style={{fontSize:11,color:theme.palette.textSecondary}}>圖表樣式</Text>
   <Text style={{fontSize:12,fontWeight:'900',color:theme.palette.primary}}>{selected}　{expanded?'▴':'▾'}</Text>
  </Pressable>
  {expanded?<View style={[styles.options,{backgroundColor:theme.palette.surfaceMuted,borderColor:theme.palette.border}]}>
   {choices.map(choice=><Pressable key={choice.id} accessibilityRole="button" accessibilityState={{selected:value===choice.id}}
     onPress={()=>{onChange(choice.id);setExpanded(false);}}
     style={[styles.choice,value===choice.id&&{backgroundColor:theme.palette.primary}]}>
      <Text style={{fontSize:12,fontWeight:'700',color:value===choice.id?'white':theme.palette.text}}>{choice.label}</Text>
   </Pressable>)}
  </View>:null}
 </View>;
}
const styles=StyleSheet.create({
 trigger:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',alignSelf:'flex-start',gap:12,minWidth:157,minHeight:38,borderWidth:1,borderRadius:9,paddingHorizontal:12,paddingVertical:7},
 options:{borderRadius:9,borderWidth:1,padding:7,gap:5,flexDirection:'row',flexWrap:'wrap'},
 choice:{minWidth:74,paddingHorizontal:10,paddingVertical:9,borderRadius:7,alignItems:'center'}
});
