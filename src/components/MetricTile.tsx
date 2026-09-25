import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';
import { useThemeRuntime } from '../theme/ThemeRuntime';
import type {TargetOverride} from '../maintenance/inspectionModel';
import type {TargetAppearance} from '../maintenance/inspectionModel';

export function MetricTile({label,value,caption,tone='default',editorStyle}:{
  label:string;value:string;caption?:string;tone?:'default'|'gain'|'loss';
  editorStyle?:TargetOverride;
}){
  const theme=useThemeRuntime();
  const toneColor=tone==='gain'?theme.palette.gain:tone==='loss'?theme.palette.loss:theme.palette.text;
  const textColor=editorStyle?.useProfitColor===false?editorStyle.textColor:tone!=='default'?toneColor:editorStyle?.textColor??theme.palette.text;
  const semantic=tone==='gain'?theme.palette.gain:tone==='loss'?theme.palette.loss:theme.palette.flat;
  const labelColor=editorStyle?.labelProfitColor?semantic:editorStyle?.labelColor??theme.palette.textSecondary;
  const backgroundColor=editorStyle?.backgroundProfitColor?semantic:editorStyle?.backgroundColor??theme.palette.surfaceMuted;
  const borderColor=editorStyle?.borderProfitColor?semantic:editorStyle?.borderColor;
  const displayedLabel=editorStyle?.labelText||label;
  const displayedCaption=editorStyle?.captionText||caption;
  return <View style={[styles.tile,{backgroundColor},
    editorStyle&&{borderColor,borderWidth:editorStyle.borderWidth??(editorStyle.borderProfitColor?1:undefined),borderRadius:editorStyle.borderRadius,padding:editorStyle.padding}]}>
    <Text style={[styles.label,{color:labelColor,
      fontSize:editorStyle?.labelFontSize??11,textAlign:editorStyle?.align??'left'}]}>{displayedLabel}</Text>
    <Text style={[styles.value,{color:textColor,fontSize:editorStyle?.fontSize??17,
      textAlign:editorStyle?.align??'left'}]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
    {displayedCaption?<Text style={[styles.caption,{color:theme.palette.textSecondary,fontSize:editorStyle?.captionFontSize??10,
      textAlign:editorStyle?.align??'left'}]}>{displayedCaption}</Text>:null}
  </View>;
}
const styles=StyleSheet.create({
  tile:{flex:1,minWidth:92,backgroundColor:colors.surfaceMuted,borderRadius:radius.md,padding:spacing.md},
  label:{fontSize:11,fontWeight:'700',color:colors.textSecondary},
  value:{fontSize:17,fontWeight:'900',marginTop:5},
  caption:{fontSize:10,color:colors.textSecondary,marginTop:3},
});
