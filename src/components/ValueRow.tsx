import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/tokens';

export function ValueRow({label,value,subvalue,tone='default'}:{label:string;value:string;subvalue?:string;tone?:'default'|'gain'|'loss'}){
  const c=tone==='gain'?colors.gain:tone==='loss'?colors.loss:colors.text;
  return <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.values}><Text style={[styles.value,{color:c}]}>{value}</Text>{subvalue?<Text style={styles.sub}>{subvalue}</Text>:null}</View>
  </View>;
}
const styles=StyleSheet.create({
  row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:8},
  label:{color:colors.textSecondary,fontSize:12},
  values:{alignItems:'flex-end',marginLeft:spacing.md},
  value:{fontWeight:'900',fontSize:14},
  sub:{color:colors.textSecondary,fontSize:10,marginTop:2},
});
