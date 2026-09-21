import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../theme/tokens';
import {useThemeRuntime} from '../theme/ThemeRuntime';

export function MetricTile({label,value,caption,tone='default'}:{label:string;value:string;caption?:string;tone?:'default'|'gain'|'loss'}){
  const c=useThemeRuntime().state.palette;
  const toneColor=tone==='gain'?c.gain:tone==='loss'?c.loss:c.text;
  return <View style={[styles.tile,{backgroundColor:c.surfaceMuted}]}>
    <Text style={[styles.label,{color:c.textSecondary}]}>{label}</Text>
    <Text style={[styles.value,{color:toneColor}]} numberOfLines={1}>{value}</Text>
    {caption?<Text style={[styles.caption,{color:c.textSecondary}]}>{caption}</Text>:null}
  </View>;
}
const styles=StyleSheet.create({
  tile:{flex:1,minWidth:92,borderRadius:radius.md,padding:spacing.md},
  label:{fontSize:11,fontWeight:'700'},
  value:{fontSize:17,fontWeight:'900',marginTop:5},
  caption:{fontSize:10,marginTop:3},
});
