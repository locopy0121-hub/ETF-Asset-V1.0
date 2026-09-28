import type {ReactNode} from 'react';
import {Pressable,StyleSheet,Text,type StyleProp,type TextStyle} from 'react-native';
import {colorWithAlpha} from '../../maintenance/frameEffects';
import {InspectableTarget} from '../../maintenance/InspectableTarget';
import {
  TARGET_APPEARANCE,
  mergeTargetAppearance,
  type FrameMaintenanceContext,
  type InspectedTarget,
  type TargetKind,
  type TargetOverride,
  type TargetAppearance,
} from '../../maintenance/inspectionModel';
import {activeConditionalRule,applyConditionalAppearance} from '../../maintenance/conditionalVisual';
import {formatDisplayNumber} from '../../maintenance/numberDisplay';
import type {FinancialTone} from '../../maintenance/workspaceModel';
import {MetricTile} from '../MetricTile';
import {useLayoutRuntime} from '../../editor/LayoutSelectionContext';

const hex=(value:unknown,fallback:string)=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback;

export function DashboardEditableText({
  id,label,frame,children,style,kind='text',tone='neutral',numberOfLines,adjustsFontSizeToFit=false,minimumFontScale,
}:{
  id:string;label:string;frame?:FrameMaintenanceContext|undefined;children:string|number;
  style:StyleProp<TextStyle>;
  kind?:Extract<TargetKind,'text'|'value'|'prefix'>;tone?:FinancialTone;
  numberOfLines?:number;adjustsFontSizeToFit?:boolean;minimumFontScale?:number;
}){
  const original=String(children);
  const layoutRuntime=useLayoutRuntime();
  const targetId=`dashboard:${id}`;
  const layoutOverride=layoutRuntime.targets[targetId];
  const raw=StyleSheet.flatten(style) as TextStyle;
  const size=typeof raw.fontSize==='number'?raw.fontSize:13;
  const color=hex(raw.color,'#0F172A');
  const background=hex(raw.backgroundColor,'#FFFFFF');
  const directBase:TargetAppearance={
    ...TARGET_APPEARANCE,fontSize:size,textColor:color,backgroundColor:background,
    align:raw.textAlign==='center'||raw.textAlign==='right'?raw.textAlign:'left',
    fontWeight:raw.fontWeight??'normal',fontStyle:raw.fontStyle??'normal',
    fontFamily:['sans-serif','sans-serif-condensed','serif','monospace'].includes(raw.fontFamily??'')?
      raw.fontFamily as 'sans-serif'|'sans-serif-condensed'|'serif'|'monospace':'system',
    textDecorationLine:raw.textDecorationLine??'none',
    letterSpacing:raw.letterSpacing??0,lineHeight:raw.lineHeight??0,
    borderWidth:typeof raw.borderWidth==='number'?raw.borderWidth:0,
    padding:typeof raw.padding==='number'?raw.padding:0,
    borderRadius:typeof raw.borderRadius==='number'?raw.borderRadius:0,
    prefixText:kind==='prefix'?original:TARGET_APPEARANCE.prefixText,
    prefixGap:kind==='prefix'?8:TARGET_APPEARANCE.prefixGap,
  };
  const renderDirect=(override:TargetOverride|undefined)=>{
    const appearance=mergeTargetAppearance(directBase,override);
    const text=kind==='value'&&override?.displayUnit&&appearance.displayUnit!=='original'?
      formatDisplayNumber(original,appearance.displayUnit,appearance.displayDigits,true):
      kind==='prefix'&&override?.prefixText!==undefined?appearance.prefixText:original;
    const custom:TextStyle|undefined=override?{
      ...(override.textColor||override.textProfitColor!==undefined?{color:appearance.textColor}:{}),
      ...(override.fontSize!==undefined?{fontSize:appearance.fontSize}:{}),
      ...(override.fontWeight!==undefined?{fontWeight:appearance.fontWeight}:{}),
      ...(override.fontFamily!==undefined?{fontFamily:appearance.fontFamily==='system'?undefined:appearance.fontFamily}:{}),
      ...(override.fontStyle!==undefined?{fontStyle:appearance.fontStyle}:{}),
      ...(override.textDecorationLine!==undefined?{textDecorationLine:appearance.textDecorationLine}:{}),
      ...(override.letterSpacing!==undefined?{letterSpacing:appearance.letterSpacing}:{}),
      ...(override.lineHeight!==undefined&&appearance.lineHeight>0?{lineHeight:appearance.lineHeight}:{}),
      ...(override.align!==undefined?{textAlign:appearance.align}:{}),
      ...(override.padding!==undefined?{padding:appearance.padding}:{}),
      ...(override.backgroundColor||override.backgroundOpacity!==undefined?
        {backgroundColor:colorWithAlpha(appearance.backgroundColor,appearance.backgroundOpacity)}:{}),
      ...(override.borderColor?{borderColor:appearance.borderColor}:{}),
      ...(override.borderWidth!==undefined?{borderWidth:appearance.borderWidth}:{}),
      ...(override.borderRadius!==undefined?{borderRadius:appearance.borderRadius}:{}),
      ...(kind==='prefix'&&override.prefixGap!==undefined?{marginRight:appearance.prefixGap}:{}),
      ...(kind==='prefix'&&override.prefixOffsetX!==undefined?{marginLeft:appearance.prefixOffsetX}:{}),
      ...(kind==='prefix'&&override.prefixOffsetY!==undefined?{transform:[{translateY:appearance.prefixOffsetY}]}:{}),
      ...(override.opacity!==undefined?{opacity:appearance.opacity}:{}),
    }:undefined;
    return <Text style={[style,custom,layoutRuntime.active&&layoutRuntime.selectedId===targetId?styles.layoutSelected:undefined]}
      onPress={layoutRuntime.active?(event=>{event.stopPropagation();layoutRuntime.onSelect?.({id:targetId,kind,label});}):undefined}
      {...(numberOfLines!==undefined?{numberOfLines}:{})}
      {...(adjustsFontSizeToFit?{adjustsFontSizeToFit:true}:{})}
      {...(minimumFontScale!==undefined?{minimumFontScale}:{})}>{text}</Text>;
  };
  if(!frame)return renderDirect(layoutOverride);

  const target:InspectedTarget={
    id:targetId,kind,label,page:frame.page,frameKey:frame.frameKey,frameTitle:frame.frameTitle,
    ...(tone!=='neutral'?{profitTone:tone}:{}),
    properties:[
      {name:'原畫面文字',value:original,readOnly:true},
      {name:'原字號',value:size+' px',readOnly:true},
      {name:'原文字顏色',value:color,readOnly:true},
      ...(kind==='value'?[{name:'資料保護',value:'顯示工具不可改寫帳務原始值',readOnly:true}]:[]),
    ],
    base:mergeTargetAppearance(directBase,layoutOverride),
  };

  return <InspectableTarget target={target} frame={frame}>
    {(appearance,customized,override,render)=>{
      const rule=activeConditionalRule(override.conditionalStyles,render.displayTone);
      const text=kind==='value'?
        (customized&&appearance.displayUnit!=='original'?formatDisplayNumber(original,appearance.displayUnit,appearance.displayDigits,true):original):
        kind==='prefix'?(customized&&override.prefixText!==undefined?appearance.prefixText:original):
        (customized&&(appearance.labelText||appearance.captionText)?appearance.labelText||appearance.captionText:original);
      const custom:TextStyle|undefined=customized?{
        ...(override.textColor||override.textProfitColor!==undefined||rule?.textColor?{color:appearance.textColor}:{}),
        ...(override.fontSize!==undefined?{fontSize:appearance.fontSize}:{}),
        ...(override.fontWeight!==undefined?{fontWeight:appearance.fontWeight}:{}),
        ...(override.fontFamily!==undefined?{fontFamily:appearance.fontFamily==='system'?undefined:appearance.fontFamily}:{}),
        ...(override.fontStyle!==undefined?{fontStyle:appearance.fontStyle}:{}),
        ...(override.textDecorationLine!==undefined?{textDecorationLine:appearance.textDecorationLine}:{}),
        ...(override.letterSpacing!==undefined?{letterSpacing:appearance.letterSpacing}:{}),
        ...(override.lineHeight!==undefined&&appearance.lineHeight>0?{lineHeight:appearance.lineHeight}:{}),
        ...(override.align!==undefined?{textAlign:appearance.align}:{}),
        ...(override.padding!==undefined?{padding:appearance.padding}:{}),
        ...(appearance.backgroundMode==='gradient'&&override.backgroundMode!==undefined?{backgroundColor:'transparent'}:
          override.backgroundColor||override.backgroundProfitColor!==undefined||override.backgroundOpacity!==undefined?
          {backgroundColor:colorWithAlpha(appearance.backgroundColor,appearance.backgroundOpacity)}:{}),
        ...(override.borderColor||override.borderProfitColor!==undefined?{borderColor:appearance.borderColor}:{}),
        ...(override.borderWidth!==undefined?{borderWidth:appearance.borderWidth}:{}),
        ...(override.borderRadius!==undefined?{borderRadius:appearance.borderRadius}:{}),
        ...(kind==='prefix'&&override.prefixGap!==undefined?{marginRight:appearance.prefixGap}:{}),
        ...(kind==='prefix'&&override.prefixOffsetX!==undefined?{marginLeft:appearance.prefixOffsetX}:{}),
        ...(kind==='prefix'&&override.prefixOffsetY!==undefined?{transform:[{translateY:appearance.prefixOffsetY}]}:{}),
      }:undefined;
      return <Text style={[style,custom]}
        {...(numberOfLines!==undefined?{numberOfLines}:{})}
        {...(adjustsFontSizeToFit?{adjustsFontSizeToFit:true}:{})}
        {...(minimumFontScale!==undefined?{minimumFontScale}:{})}>{text}</Text>;
    }}
  </InspectableTarget>;
}

export function DashboardEditableMetric({
  id,frame,label,value,caption,tone='default',pageStyle,
}:{
  id:string;frame?:FrameMaintenanceContext|undefined;label:string;value:string;caption?:string;tone?:'default'|'gain'|'loss';pageStyle:TargetOverride;
}){
  const layoutRuntime=useLayoutRuntime();
  const targetId=`dashboard:${id}`;
  const layoutOverride=layoutRuntime.targets[targetId];
  const directStyle:TargetOverride={...pageStyle,...(layoutOverride??{})};
  if(!frame){
    const tile=<MetricTile label={label} value={value}
      {...(caption!==undefined?{caption}:{})}{...(tone!=='default'?{tone}:{})} editorStyle={directStyle}/>;
    return layoutRuntime.active?<Pressable onPress={event=>{event.stopPropagation();layoutRuntime.onSelect?.({id:targetId,kind:'card',label});}}
      style={layoutRuntime.selectedId===targetId?styles.metricSelected:undefined}>{tile}</Pressable>:tile;
  }

  const base=mergeTargetAppearance(TARGET_APPEARANCE,directStyle);
  const target:InspectedTarget={
    id:`dashboard:${id}`,kind:'metric',label,page:frame.page,frameKey:frame.frameKey,frameTitle:frame.frameTitle,
    ...(tone==='gain'?{profitTone:'gain' as const}:tone==='loss'?{profitTone:'loss' as const}:{}),
    properties:[
      {name:'欄位名稱',value:label,readOnly:true},{name:'即時數值（帳務唯讀）',value,readOnly:true},
      {name:'原說明',value:caption??'無',readOnly:true},
    ],
    base,
  };
  return <InspectableTarget target={target} frame={frame}>
    {(_appearance,customized,override,render)=>{
      const effective:TargetOverride=customized?
        applyConditionalAppearance({...pageStyle,...override},render.displayTone):pageStyle;
      return <MetricTile label={label} value={value}
        {...(caption!==undefined?{caption}:{})}{...(tone!=='default'?{tone}:{})}
        editorStyle={effective} previewTap={render.editing}
        {...(render.simulated?{simulationTone:render.displayTone}:{})}/>;
    }}
  </InspectableTarget>;
}

const styles=StyleSheet.create({
  layoutSelected:{borderWidth:2,borderStyle:'dashed',borderColor:'#0B6CFF',borderRadius:6},
  metricSelected:{borderWidth:2,borderStyle:'dashed',borderColor:'#0B6CFF',borderRadius:12},
});
