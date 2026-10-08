import {useEffect,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text} from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';
import { useThemeRuntime } from '../theme/ThemeRuntime';
import type {TargetOverride} from '../maintenance/inspectionModel';
import {TARGET_APPEARANCE,mergeTargetAppearance} from '../maintenance/inspectionModel';
import {TargetBackdrop,targetShadowStyle} from '../maintenance/TargetSurfaceEffects';
import {linkedColor,type FinancialTone} from '../maintenance/workspaceModel';
import {resolveNativeMetricTones} from '../maintenance/dataSimulation';
import {formatDisplayNumber} from '../maintenance/numberDisplay';
import {metricSwipeExceeded,nextMetricTapEmphasis,type MetricTouchPoint} from '../maintenance/metricTap';
import {metricThresholdMatches} from '../maintenance/metricThreshold';
import {colorWithAlpha} from '../maintenance/frameEffects';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {resolveSystemProfitColors} from '../settings/systemColorPalette';

export function MetricTile({label,value,caption,tone='default',editorStyle,simulationTone,previewTap=false}:{
  label:string;value:string;caption?:string;tone?:'default'|'gain'|'loss'|'neutral';
  editorStyle?:TargetOverride;simulationTone?:FinancialTone;previewTap?:boolean; // ephemeral preview only
}){
  const theme=useThemeRuntime();
  const [emphasized,setEmphasized]=useState(false);
  const start=useRef<MetricTouchPoint|null>(null);
  const swipeConsumed=useRef(false);
  const tapEnabled=editorStyle?.tapAction==='emphasize';
  const guardEnabled=editorStyle?.tapSwipeGuard!==false;
  const thresholdMatched=metricThresholdMatches(value,editorStyle?.thresholdEnabled??false,editorStyle?.thresholdValue??0,editorStyle?.thresholdOperator??'gte');
  useEffect(()=>{setEmphasized(false);swipeConsumed.current=false;start.current=null;},
    [editorStyle?.tapAction,editorStyle?.tapSwipeGuard]);
  const settings=useSettingsRuntime();
  const nativeTones=resolveNativeMetricTones(tone,editorStyle?.profitToneOverride,simulationTone);
  const actualTone=nativeTones.linked;
  const colorPrefs=resolveSystemProfitColors(settings.prefs.display);
  const toneColor=nativeTones.fallback==='gain'?colorPrefs.gainColor:nativeTones.fallback==='loss'?colorPrefs.lossColor:tone==='neutral'||simulationTone==='neutral'?colorPrefs.neutralColor:theme.palette.text;
  const textColor=editorStyle?.useProfitColor===false?editorStyle.textColor:tone!=='default'||simulationTone?toneColor:editorStyle?.textColor??theme.palette.text;
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
  const surface=mergeTargetAppearance(TARGET_APPEARANCE,editorStyle);
  const gradientOn=editorStyle?.backgroundMode==='gradient';
  const gradientEnd=linkedColor(surface.gradientEndColor,surface.gradientEndProfitColor,actualTone,colorPrefs);
  const gradientMid=linkedColor(surface.gradientMidColor,surface.gradientMidProfitColor,actualTone,colorPrefs);
  const shadow=linkedColor(surface.shadowColor,surface.shadowProfitColor,actualTone,colorPrefs);
  const glow=linkedColor(surface.glowColor,surface.glowProfitColor,actualTone,colorPrefs);
  const displayedLabel=editorStyle?.labelText||label;
  const displayedCaption=editorStyle?.captionText||caption;
  const displayedValue=editorStyle?.displayUnit&&editorStyle.displayUnit!=='original'?
    formatDisplayNumber(value,editorStyle.displayUnit,editorStyle.displayDigits??0):value;
  return <Pressable disabled={!tapEnabled} accessibilityRole={tapEnabled?'button':undefined}
    accessibilityLabel={tapEnabled?'切換強調顯示：'+label:undefined}
    accessibilityState={tapEnabled?{selected:emphasized}:undefined}
    onTouchStart={event=>{start.current={x:event.nativeEvent.pageX,y:event.nativeEvent.pageY};swipeConsumed.current=false;}}
    onTouchMove={event=>{if(guardEnabled&&metricSwipeExceeded(start.current,{x:event.nativeEvent.pageX,y:event.nativeEvent.pageY}))swipeConsumed.current=true;}}
    onTouchCancel={()=>{swipeConsumed.current=true;start.current=null;}}
    onPress={()=>{if(!tapEnabled||guardEnabled&&swipeConsumed.current)return;
      setEmphasized(previous=>nextMetricTapEmphasis(previous,editorStyle?.tapAction??'none'));}}

    style={[styles.tile,{position:'relative',backgroundColor:gradientOn?'transparent':colorWithAlpha(effectiveBackground,surface.backgroundOpacity)},
    editorStyle&&{borderColor:colorWithAlpha(effectiveBorder??'#E2E8F0',surface.borderOpacity),borderWidth:surface.borderWidth,borderRadius:surface.borderRadius,
      borderStyle:surface.borderStyle,padding:surface.padding,marginVertical:surface.marginVertical,
      marginHorizontal:surface.marginHorizontal,
      ...(editorStyle.width!==undefined?{width:editorStyle.width}:{}),
      ...(editorStyle.height!==undefined?{height:editorStyle.height}:{}),
      ...(editorStyle.offsetX!==undefined||editorStyle.offsetY!==undefined?{transform:[{translateX:editorStyle.offsetX??0},{translateY:editorStyle.offsetY??0}]}:{}),
      ...targetShadowStyle(surface,shadow)},
    (thresholdMatched||tapEnabled&&(emphasized||previewTap))&&{borderWidth:Math.max(2,surface.borderWidth),borderColor:theme.palette.primary}]}>

    {editorStyle?<TargetBackdrop appearance={surface} start={effectiveBackground} middle={gradientMid} end={gradientEnd} glow={glow}/>:null}
    <Text style={[styles.label,{color:colorWithAlpha(effectiveLabel??'#64748B',surface.labelOpacity),
      fontSize:editorStyle?.labelFontSize??11,textAlign:editorStyle?.align??'left',
      ...(editorStyle?.fontFamily&&editorStyle.fontFamily!=='system'?{fontFamily:editorStyle.fontFamily}:{}),
      ...(editorStyle?.labelFontWeight?{fontWeight:editorStyle.labelFontWeight}:{}),
      ...(editorStyle?.labelFontStyle?{fontStyle:editorStyle.labelFontStyle}:{}),
      ...(editorStyle?.labelLetterSpacing!==undefined?{letterSpacing:editorStyle.labelLetterSpacing}:{}),
      ...(editorStyle?.labelLineHeight&&editorStyle.labelLineHeight>0?{lineHeight:editorStyle.labelLineHeight}:{}),
      }]}>{displayedLabel}</Text>
    <Text style={[styles.value,{color:colorWithAlpha(effectiveTextColor??'#0F172A',surface.textOpacity),fontSize:editorStyle?.fontSize??17,
      textAlign:editorStyle?.align??'left',
      ...(editorStyle?.fontFamily&&editorStyle.fontFamily!=='system'?{fontFamily:editorStyle.fontFamily}:{}),
      ...(editorStyle?.fontWeight?{fontWeight:editorStyle.fontWeight}:{}),
      ...(editorStyle?.fontStyle?{fontStyle:editorStyle.fontStyle}:{}),
      ...(editorStyle?.textDecorationLine?{textDecorationLine:editorStyle.textDecorationLine}:{}),
      ...(editorStyle?.letterSpacing!==undefined?{letterSpacing:editorStyle.letterSpacing}:{}),
      ...(editorStyle?.lineHeight&&editorStyle.lineHeight>0?{lineHeight:editorStyle.lineHeight}:{}),
      }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{displayedValue}</Text>
    {displayedCaption?<Text style={[styles.caption,{color:colorWithAlpha(effectiveCaption??'#64748B',surface.captionOpacity),fontSize:editorStyle?.captionFontSize??10,
      textAlign:editorStyle?.align??'left',
      ...(editorStyle?.fontFamily&&editorStyle.fontFamily!=='system'?{fontFamily:editorStyle.fontFamily}:{}),
      ...(editorStyle?.captionFontWeight?{fontWeight:editorStyle.captionFontWeight}:{}),
      ...(editorStyle?.captionFontStyle?{fontStyle:editorStyle.captionFontStyle}:{}),
      ...(editorStyle?.captionLetterSpacing!==undefined?{letterSpacing:editorStyle.captionLetterSpacing}:{}),
      ...(editorStyle?.captionLineHeight&&editorStyle.captionLineHeight>0?{lineHeight:editorStyle.captionLineHeight}:{}),
      }]}>{displayedCaption}</Text>:null}
  </Pressable>;
}
const styles=StyleSheet.create({
  tile:{flex:1,minWidth:92,backgroundColor:colors.surfaceMuted,borderRadius:radius.md,padding:spacing.md},
  label:{fontSize:11,fontWeight:'700',color:colors.textSecondary},
  value:{fontSize:17,fontWeight:'900',marginTop:5},
  caption:{fontSize:10,color:colors.textSecondary,marginTop:3},
});
