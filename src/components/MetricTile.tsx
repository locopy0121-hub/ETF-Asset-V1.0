import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

export function MetricTile({label,value,caption,tone='default'}:{label:string;value:string;caption?:string;tone?:'default'|'gain'|'loss'}){
  const toneColor=tone==='gain'?colors.gain:tone==='loss'?colors.loss:colors.text;
  return <View style={styles.tile}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value,{color:toneColor}]} numberOfLines={1}>{value}</Text>
    {caption?<Text style={styles.caption}>{caption}</Text>:null}
  </View>;
}
const styles=StyleSheet.create({
  tile:{flex:1,minWidth:92,backgroundColor:colors.surfaceMuted,borderRadius:radius.md,padding:spacing.md},
  label:{fontSize:11,fontWeight:'700',color:colors.textSecondary},
  value:{fontSize:17,fontWeight:'900',marginTop:5},
  caption:{fontSize:10,color:colors.textSecondary,marginTop:3},
});
