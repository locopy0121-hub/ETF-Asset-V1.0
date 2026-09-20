import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/tokens';

export function PageGearButton({onPress,label='⚙'}:{onPress:()=>void;label?:string}){
  return <Pressable accessibilityRole="button" accessibilityLabel="頁面設定" onPress={onPress} style={styles.button}><Text style={styles.text}>{label}</Text></Pressable>;
}
const styles=StyleSheet.create({
  button:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center',backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},
  text:{fontSize:19,color:colors.primary,fontWeight:'900'},
});
