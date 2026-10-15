import type {ReactNode} from 'react';
import {Image,Pressable,StyleSheet,View,type TextStyle} from 'react-native';
import {Text} from './EditableNative';

import type {FrameEditorConfig} from '../editor/editorModel';
import type {LayoutSelectionTarget} from '../editor/LayoutSelectionContext';
import {colorWithAlpha,mixFrameColors,normalizeFrameEffects,sampleFrameGradient} from '../maintenance/frameEffects';
import {InspectableTarget} from '../maintenance/InspectableTarget';
import {TARGET_APPEARANCE,mergeTargetAppearance,type FrameMaintenanceContext,type InspectedTarget,type TargetOverride} from '../maintenance/inspectionModel';
import {linkedColor} from '../maintenance/workspaceModel';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {THEME_BACKGROUNDS,useThemeRuntime} from '../theme/ThemeRuntime';
import {spacing} from '../theme/tokens';

type HeaderId='brand'|'title'|'subtitle';

function HeaderVisualText({id,value,style,frame,layoutTargets,selectedId,onSelect}:{
  id:HeaderId;value:string;style:TextStyle;frame:FrameMaintenanceContext;
  layoutTargets:Readonly<Record<string,TargetOverride>>;
  selectedId?:string|null|undefined;
  onSelect?:((target:LayoutSelectionTarget)=>void)|undefined;
}){
  const targetId='header:'+id;
  const readOnly=id!=='brand'&&['chart-header','holding-detail-header'].includes(frame.frameKey);
  const base=mergeTargetAppearance({
    ...TARGET_APPEARANCE,
    fontSize:style.fontSize??13,
    fontWeight:style.fontWeight??'normal',
    textColor:typeof style.color==='string'?style.color:'#0F172A',
    backgroundColor:'#FFFFFF',backgroundOpacity:0,padding:0,borderWidth:0,borderRadius:0,
    labelText:'',align:'left',
  },layoutTargets[targetId]);
  const target:InspectedTarget={
    id:targetId,kind:readOnly?'value':'text',label:id==='brand'?'品牌名稱':id==='title'?'頁面主標題':'頁面副標題',
    page:frame.page,frameKey:frame.frameKey,frameTitle:frame.frameTitle,
    properties:[{name:'原始文字',value,readOnly:true},{name:'作用範圍',value:'本頁表頭外觀'}],
    base,
  };
  return <InspectableTarget target={target} frame={frame}>{(appearance,customized,override)=>{
    const layoutOverride=layoutTargets[targetId];
    const styled=customized||Boolean(layoutOverride&&Object.keys(layoutOverride).length);
    const shown=!readOnly&&customized&&appearance.labelText?appearance.labelText:value;
    return <Text accessibilityLabel={id==='title'?'頁面標題':undefined}
      onPress={onSelect?(event=>{event.stopPropagation();onSelect({id:targetId,kind:readOnly?'value':'text',label:target.label});}):undefined}
      style={[style,styled&&{
        ...(override.fontSize!==undefined||layoutOverride?.fontSize!==undefined?{fontSize:appearance.fontSize}:{}),
        ...(override.textColor!==undefined||override.textProfitColor!==undefined||layoutOverride?.textColor!==undefined?{color:appearance.textColor}:{}),
        ...(override.fontWeight!==undefined||layoutOverride?.fontWeight!==undefined?{fontWeight:appearance.fontWeight}:{}),
        ...(override.fontStyle!==undefined||layoutOverride?.fontStyle!==undefined?{fontStyle:appearance.fontStyle}:{}),
        ...(override.fontFamily!==undefined||layoutOverride?.fontFamily!==undefined?
          appearance.fontFamily!=='system'?{fontFamily:appearance.fontFamily}:{}:{}),
        ...(override.letterSpacing!==undefined||layoutOverride?.letterSpacing!==undefined?{letterSpacing:appearance.letterSpacing}:{}),
        ...(override.lineHeight!==undefined||layoutOverride?.lineHeight!==undefined?
          appearance.lineHeight>0?{lineHeight:appearance.lineHeight}:{}:{}),
        ...(override.textDecorationLine!==undefined||layoutOverride?.textDecorationLine!==undefined?{textDecorationLine:appearance.textDecorationLine}:{}),
        ...(override.align!==undefined||layoutOverride?.align!==undefined?{textAlign:appearance.align}:{}),
        ...(layoutOverride?.backgroundColor!==undefined||layoutOverride?.backgroundOpacity!==undefined?
          {backgroundColor:colorWithAlpha(appearance.backgroundColor,appearance.backgroundOpacity)}:{}),
        ...(layoutOverride?.padding!==undefined?{padding:appearance.padding}:{}),
        ...(layoutOverride?.borderColor!==undefined?{borderColor:appearance.borderColor}:{}),
        ...(layoutOverride?.borderWidth!==undefined?{borderWidth:appearance.borderWidth}:{}),
        ...(layoutOverride?.borderRadius!==undefined?{borderRadius:appearance.borderRadius}:{}),
        ...(layoutOverride?.opacity!==undefined?{opacity:appearance.opacity}:{}),
      },selectedId===targetId&&styles.selectedText]}>{shown}</Text>;
  }}</InspectableTarget>;
}

export function PageHeaderVisual({title,subtitle,frameConfig,frame,layoutTargets,actions,selectedId,onSelect,
  active=false,showEdit=false,onEdit}:{
  title:string;subtitle?:string;frameConfig:FrameEditorConfig;frame:FrameMaintenanceContext;
  layoutTargets?:Readonly<Record<string,TargetOverride>>;actions?:ReactNode;
  selectedId?:string|null|undefined;onSelect?:((target:LayoutSelectionTarget)=>void)|undefined;
  active?:boolean;showEdit?:boolean;onEdit?:()=>void;
}){
  const theme=useThemeRuntime();
  const settings=useSettingsRuntime();
  const targets=layoutTargets??{};
  const fx=normalizeFrameEffects(frameConfig.effects);
  const background=linkedColor(frameConfig.backgroundColor,frameConfig.backgroundProfitColor,'neutral',settings.prefs.display);
  const border=linkedColor(frameConfig.borderColor,frameConfig.borderProfitColor,'neutral',settings.prefs.display);
  const titleColor=linkedColor(frameConfig.titleColor,frameConfig.titleProfitColor,'neutral',settings.prefs.display);
  const end=linkedColor(fx.gradientEndColor,fx.gradientEndProfitColor,'neutral',settings.prefs.display);
  const middle=linkedColor(fx.gradientMidColor,fx.gradientMidProfitColor,'neutral',settings.prefs.display);
  const gradientOn=fx.backgroundMode==='gradient';
  const imageUri=fx.imageSource==='builtIn'?THEME_BACKGROUNDS[fx.imageIndex]:fx.imageUri;
  const imageOn=fx.backgroundMode==='image'&&Boolean(imageUri);
  const mask=linkedColor(fx.maskColor,fx.maskProfitColor,'neutral',settings.prefs.display);
  const gradient=Array.from({length:16},(_,i)=>fx.gradientMidEnabled?
    sampleFrameGradient(background,middle,end,i/15,fx.gradientMidStop,true):mixFrameColors(background,end,i/15));
  const titleStyle:TextStyle={...styles.title,color:titleColor||theme.palette.text,
    fontSize:frameConfig.titleFontSize||28,textAlign:frameConfig.titleAlign};
  if(frameConfig.visible===false&&!active)return null;
  return <View style={[styles.header,{
    backgroundColor:gradientOn?'transparent':colorWithAlpha(background,frameConfig.backgroundOpacity),
    borderColor:border,borderWidth:frameConfig.borderWidth,borderRadius:frameConfig.borderRadius,
    ...(frameConfig.width!==undefined?{width:frameConfig.width}:{}),
    ...(frameConfig.height!==undefined?{height:frameConfig.height}:{}),
    ...(frameConfig.minHeight!==undefined?{minHeight:frameConfig.minHeight}:{}),
    ...(frameConfig.padding!==undefined?{padding:frameConfig.padding}:{}),
    ...(fx.contentGap>=0?{gap:fx.contentGap}:{}),
  },active&&frameConfig.visible===false?{opacity:.5}:{}]}>
    {gradientOn?<View pointerEvents="none" style={[StyleSheet.absoluteFill,{overflow:'hidden',flexDirection:fx.gradientDirection==='vertical'?'column':'row'}]}>
      {gradient.map((color,i)=><View key={i} style={{flex:1,backgroundColor:colorWithAlpha(color,frameConfig.backgroundOpacity)}}/>)}
    </View>:null}
    {imageOn?<View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={{uri:imageUri!}} resizeMode={fx.imageFit} style={[StyleSheet.absoluteFill,{opacity:fx.imageOpacity}]}/>
    </View>:null}
    {(gradientOn||imageOn)&&fx.maskOpacity>0?<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:colorWithAlpha(mask,fx.maskOpacity)}]}/>:null}
    {active?<View pointerEvents="none" style={[StyleSheet.absoluteFill,{borderWidth:2,borderStyle:'dashed',borderColor:theme.palette.primary,borderRadius:frameConfig.borderRadius}]}/>:null}
    <View style={styles.titleWrap}>
      <HeaderVisualText id="brand" value="TF Asset" style={{...styles.brand,color:theme.palette.primary}}
        frame={frame} layoutTargets={targets} selectedId={selectedId} onSelect={onSelect}/>
      <HeaderVisualText id="title" value={title} style={titleStyle}
        frame={frame} layoutTargets={targets} selectedId={selectedId} onSelect={onSelect}/>
      {subtitle?<HeaderVisualText id="subtitle" value={subtitle} style={{...styles.subtitle,color:theme.palette.textSecondary}}
        frame={frame} layoutTargets={targets} selectedId={selectedId} onSelect={onSelect}/>:null}
    </View>
    {actions?<View style={styles.actions}>{actions}</View>:null}
    {showEdit&&onEdit?<Pressable accessibilityRole="button" accessibilityLabel="編輯頁面最上方表頭"
      onPress={onEdit} style={[styles.wrench,{borderColor:theme.palette.primary}]}>
      <Text style={{fontSize:16}}>🔧</Text>
    </Pressable>:null}
  </View>;
}

const styles=StyleSheet.create({
  header:{paddingHorizontal:spacing.lg,paddingVertical:spacing.md,position:'relative',flexDirection:'row',alignItems:'center'},
  titleWrap:{flex:1,minWidth:0},
  brand:{fontSize:13,fontWeight:'800',letterSpacing:.4},
  title:{fontSize:28,fontWeight:'800',marginTop:2},
  subtitle:{fontSize:13,marginTop:4},
  actions:{marginLeft:spacing.md,flexDirection:'row',gap:spacing.sm},
  wrench:{position:'absolute',top:3,right:3,borderWidth:1,borderRadius:16,backgroundColor:'#FFFFFF',
    justifyContent:'center',alignItems:'center',width:29,height:29},
  selectedText:{borderWidth:2,borderStyle:'dashed',borderColor:'#0B6CFF',borderRadius:6},
});
