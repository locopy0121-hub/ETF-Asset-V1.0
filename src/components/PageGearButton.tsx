import { Pressable, StyleSheet, Text } from 'react-native';
import {useThemeRuntime} from '../theme/ThemeRuntime';

export function PageGearButton({onPress,label='⚙'}:{onPress:()=>void;label?:string}){
  const c=useThemeRuntime().state.palette;
  return <Pressable accessibilityRole="button" accessibilityLabel="頁面設定" onPress={onPress} style={[styles.button,{backgroundColor:c.surfaceMuted,borderColor:c.border}]}><Text style={[styles.text,{color:c.primary}]}>{label}</Text></Pressable>;
}
const styles=StyleSheet.create({
  button:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center',borderWidth:1},
  text:{fontSize:19,fontWeight:'900'},
});
