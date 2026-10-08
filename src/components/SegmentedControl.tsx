import {StyleSheet,View} from 'react-native';
import {Pressable,Text} from './EditableNative';
import { colors, radius, spacing } from '../theme/tokens';
import { useThemeRuntime } from '../theme/ThemeRuntime';

export function SegmentedControl<T extends string>({items,value,onChange}:{items:readonly {key:T;label:string}[];value:T;onChange:(value:T)=>void}){
  const theme=useThemeRuntime();
  return <View style={[styles.wrap,{backgroundColor:theme.palette.surfaceMuted}]}>{items.map(item=>{
    const active=item.key===value;
    return <Pressable editorId="native:SegmentedControl:item:1" key={item.key} style={[styles.item,active&&{backgroundColor:theme.palette.primary}]} onPress={()=>onChange(item.key)}>
      <Text editorId="native:SegmentedControl:label:2" editorReadOnly={false} style={[styles.label,{color:active?'#FFFFFF':theme.palette.textSecondary}]}>{item.label}</Text>
    </Pressable>;
  })}</View>;
}
const styles=StyleSheet.create({
  wrap:{flexDirection:'row',backgroundColor:colors.surfaceMuted,borderRadius:radius.pill,padding:3,gap:3},
  item:{flex:1,paddingVertical:9,paddingHorizontal:10,borderRadius:radius.pill,alignItems:'center'},
  active:{backgroundColor:colors.primary},
  label:{fontSize:12,fontWeight:'800',color:colors.textSecondary},
  activeLabel:{color:'#FFFFFF'},
});
