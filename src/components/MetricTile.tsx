import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';
import { useThemeRuntime } from '../theme/ThemeRuntime';
import type {TargetOverride} from '../maintenance/inspectionModel';
import type {TargetAppearance} from '../maintenance/inspectionModel';
import {linkedColor} from '../maintenance/workspaceModel';
import {useSettingsRuntime} from '../settings/SettingsRuntime';

export function MetricTile({label,value,caption,tone='default',editorStyle}:{
  label:string;value:string;caption?:string;tone?:'default'|'gain'|'loss';
  editorStyle?:TargetOverride;
}){
  const theme=useThemeRuntime();
  const settings=useSettingsRuntime();
  const actualTone=editorStyle?.profitToneOverride&&editorStyle.profitToneOverride!=='auto'?
    editorStyle.profitToneOverride:tone==='gain'?'gain':tone==='loss'?'loss':'neutral';
  const colorPrefs=settings.prefs.display;
  const toneColor=tone==='gain'?theme.palette.gain:tone==='loss'?theme.palette.loss:theme.palette.text;
  const textColor=editorStyle?.useProfitColor===false?editorStyle.textColor:tone!=='default'?toneColor:editorStyle?.textColor??theme.palette.text;
  const effectiveTextColor=editorStyle?.textProfitColor===true?
    linkedColor(editorStyle.textColor??theme.palette.text,true,actualTone,colorPrefs):
    editorStyle?.textProfitColor===false?editorStyle.textColor??theme.palette.text:textColor;
  const effectiveBackground=linkedColor(editorStyle?.backgroundColor??theme.palette.surfaceMuted,
    editorStyle?.backgroundProfitColor,actualTone,colorPrefs);
  const effectiveLabel=linkedColor(editorStyle?.labelColor??theme.palette.textSecondary,
    editorStyle?.labelProfitColor,actualTone,colorPrefs);
  const effectiveCaption=linkedColor(editorStyle?.captionColor??theme.palette.textSecondary,
    editorStyle?.captionProfitColor,actualTone,colorPrefs);
  const effectiveBorder=linkedColor(editorStyle?.borderColor??theme.palette.border,
    editorStyle?.borderProfitColor,actualTone,colorPrefs);
  const displayedLabel=editorStyle?.labelText||label;
  const displayedCaption=editorStyle?.captionText||caption;
  return <View style={[styles.tile,{backgroundColor:effectiveBackground},
    editorStyle&&{borderColor:effectiveBorder,borderWidth:editorStyle.borderWidth,borderRadius:editorStyle.borderRadius,padding:editorStyle.padding}]}>
    <Text style={[styles.label,{color:effectiveLabel,
      fontSize:editorStyle?.labelFontSize??11,textAlign:editorStyle?.align??'left',
      ...(editorStyle?.fontFamily&&editorStyle.fontFamily!=='system'?{fontFamily:editorStyle.fontFamily}:{}),
      ...(editorStyle?.labelFontWeight?{fontWeight:editorStyle.labelFontWeight}:{}),
      ...(editorStyle?.labelFontStyle?{fontStyle:editorStyle.labelFontStyle}:{}),
      ...(editorStyle?.labelLetterSpacing!==undefined?{letterSpacing:editorStyle.labelLetterSpacing}:{}),
      ...(editorStyle?.labelLineHeight&&editorStyle.labelLineHeight>0?{lineHeight:editorStyle.labelLineHeight}:{}),
      }]}>{displayedLabel}</Text>
    <Text style={[styles.value,{color:effectiveTextColor,fontSize:editorStyle?.fontSize??17,
      textAlign:editorStyle?.align??'left',
      ...(editorStyle?.fontFamily&&editorStyle.fontFamily!=='system'?{fontFamily:editorStyle.fontFamily}:{}),
      ...(editorStyle?.fontWeight?{fontWeight:editorStyle.fontWeight}:{}),
      ...(editorStyle?.fontStyle?{fontStyle:editorStyle.fontStyle}:{}),
      ...(editorStyle?.textDecorationLine?{textDecorationLine:editorStyle.textDecorationLine}:{}),
      ...(editorStyle?.letterSpacing!==undefined?{letterSpacing:editorStyle.letterSpacing}:{}),
      ...(editorStyle?.lineHeight&&editorStyle.lineHeight>0?{lineHeight:editorStyle.lineHeight}:{}),
      }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
    {displayedCaption?<Text style={[styles.caption,{color:effectiveCaption,fontSize:editorStyle?.captionFontSize??10,
      textAlign:editorStyle?.align??'left',
      ...(editorStyle?.fontFamily&&editorStyle.fontFamily!=='system'?{fontFamily:editorStyle.fontFamily}:{}),
      ...(editorStyle?.captionFontWeight?{fontWeight:editorStyle.captionFontWeight}:{}),
      ...(editorStyle?.captionFontStyle?{fontStyle:editorStyle.captionFontStyle}:{}),
      ...(editorStyle?.captionLetterSpacing!==undefined?{letterSpacing:editorStyle.captionLetterSpacing}:{}),
      ...(editorStyle?.captionLineHeight&&editorStyle.captionLineHeight>0?{lineHeight:editorStyle.captionLineHeight}:{}),
      }]}>{displayedCaption}</Text>:null}
  </View>;
}
const styles=StyleSheet.create({
  tile:{flex:1,minWidth:92,backgroundColor:colors.surfaceMuted,borderRadius:radius.md,padding:spacing.md},
  label:{fontSize:11,fontWeight:'700',color:colors.textSecondary},
  value:{fontSize:17,fontWeight:'900',marginTop:5},
  caption:{fontSize:10,color:colors.textSecondary,marginTop:3},
});
