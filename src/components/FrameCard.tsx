import {useEffect,useMemo,useRef,useState,type PropsWithChildren,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,Image,StyleSheet,Text,View,type LayoutChangeEvent} from 'react-native';

import type {FrameAppearance,FrameEditorConfig,FrameLayout} from '../editor/pageEditor';
import {DEFAULT_FRAME_EFFECTS,angledFrameGradientBounds,colorWithAlpha,mixFrameColors,normalizeFrameEffects,outerGlowLayers,sampleFrameGradient} from '../maintenance/frameEffects';
import {linkedColor} from '../maintenance/workspaceModel';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {THEME_BACKGROUNDS,useThemeRuntime} from '../theme/ThemeRuntime';
import {colors,radius,spacing} from '../theme/tokens';

export type FrameCardProps=PropsWithChildren<{
  title:string;action?:ReactNode;layout?:FrameLayout;appearance?:FrameAppearance;
  editorStyle?:Partial<FrameEditorConfig>;
  workActive?:boolean;workHidden?:boolean;
}>;

export function FrameCard({title,action,children,layout='standard',appearance='theme',
  editorStyle,workActive=false,workHidden=false}:FrameCardProps){
  const theme=useThemeRuntime();
  const systemColors=useSettingsRuntime().prefs.display;
  const fx=normalizeFrameEffects(editorStyle?.effects,DEFAULT_FRAME_EFFECTS);
  const [reduceMotion,setReduceMotion]=useState(true);
  const [gradientBounds,setGradientBounds]=useState({width:0,height:0});
  const pulse=useRef(new Animated.Value(1)).current;
  const blink=useRef(new Animated.Value(1)).current;
  useEffect(()=>{
    let mounted=true;
    AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduceMotion(value);})
      .catch(()=>{if(mounted)setReduceMotion(true);});
    return()=>{mounted=false;};
  },[]);
  useEffect(()=>{
    pulse.stopAnimation();pulse.setValue(1);
    if(!fx.glowEnabled||!fx.glowPulse||reduceMotion||!editorStyle)return;
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:.25,duration:fx.glowPeriodMs/2,useNativeDriver:true}),
      Animated.timing(pulse,{toValue:1,duration:fx.glowPeriodMs/2,useNativeDriver:true}),
    ]));
    loop.start();
    return()=>{loop.stop();pulse.stopAnimation();};
  },[fx.glowEnabled,fx.glowPulse,fx.glowPeriodMs,reduceMotion,Boolean(editorStyle),pulse]);
  useEffect(()=>{
    blink.stopAnimation();blink.setValue(1);
    if(!editorStyle||!fx.blinkEnabled||reduceMotion)return;
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(blink,{toValue:.05,duration:fx.blinkPeriodMs/2,useNativeDriver:true}),
      Animated.timing(blink,{toValue:1,duration:fx.blinkPeriodMs/2,useNativeDriver:true}),
    ]));
    loop.start();
    return()=>{loop.stop();blink.stopAnimation();};
  },[Boolean(editorStyle),fx.blinkEnabled,fx.blinkPeriodMs,reduceMotion,blink]);
  const bg=linkedColor(editorStyle?.backgroundColor??theme.palette.surface,
    editorStyle?.backgroundProfitColor,'neutral',systemColors);
  const bgEnd=linkedColor(fx.gradientEndColor,fx.gradientEndProfitColor,'neutral',systemColors);
  const bgMiddle=linkedColor(fx.gradientMidColor,fx.gradientMidProfitColor,'neutral',systemColors);
  const imageMask=linkedColor(fx.maskColor,fx.maskProfitColor,'neutral',systemColors);
  const frameBorder=linkedColor(editorStyle?.borderColor??theme.palette.border,
    editorStyle?.borderProfitColor,'neutral',systemColors);
  const shadowColor=linkedColor(fx.shadowColor,fx.shadowProfitColor,'neutral',systemColors);
  const glowColor=linkedColor(fx.glowColor,fx.glowProfitColor,'neutral',systemColors);
  const outerGlowColor=linkedColor(fx.outerGlowColor,fx.outerGlowProfitColor,'neutral',systemColors);
  const blinkColor=linkedColor(fx.blinkColor,fx.blinkProfitColor,'neutral',systemColors);
  const outerGlowOn=Boolean(editorStyle&&fx.outerGlowEnabled&&fx.outerGlowOpacity>0);
  const alpha=editorStyle?.backgroundOpacity??1;
  const corners={
    borderTopLeftRadius:fx.cornerTopLeft>=0?fx.cornerTopLeft:editorStyle?.borderRadius??radius.lg,
    borderTopRightRadius:fx.cornerTopRight>=0?fx.cornerTopRight:editorStyle?.borderRadius??radius.lg,
    borderBottomRightRadius:fx.cornerBottomRight>=0?fx.cornerBottomRight:editorStyle?.borderRadius??radius.lg,
    borderBottomLeftRadius:fx.cornerBottomLeft>=0?fx.cornerBottomLeft:editorStyle?.borderRadius??radius.lg,
  };
  const gradient=useMemo(()=>Array.from({length:16},(_,i)=>
    fx.gradientMidEnabled?sampleFrameGradient(bg,bgMiddle,bgEnd,i/15,fx.gradientMidStop,true):
      mixFrameColors(bg,bgEnd,i/15)),[bg,bgMiddle,bgEnd,fx.gradientMidEnabled,fx.gradientMidStop]);
  const gradientOn=Boolean(editorStyle&&fx.backgroundMode==='gradient');
  const gradientAngle=fx.gradientAngle??(fx.gradientDirection==='vertical'?90:0);
  const angled=gradientAngle!==0&&gradientAngle!==90;
  const diagonal=angledFrameGradientBounds(gradientBounds.width,gradientBounds.height);
  const measureGradient=(event:LayoutChangeEvent)=>{
    const {width,height}=event.nativeEvent.layout;
    setGradientBounds(previous=>previous.width===width&&previous.height===height?previous:{width,height});
  };
  const backgroundImageUri=fx.imageSource==='builtIn'?THEME_BACKGROUNDS[fx.imageIndex]:fx.imageUri;
  const imageOn=Boolean(editorStyle&&fx.backgroundMode==='image'&&backgroundImageUri);
  const backgroundLayer=Boolean(editorStyle&&(gradientOn||imageOn));
  const shadowOn=Boolean(editorStyle?.shadowEnabled);
  return <View style={[
    styles.card,{backgroundColor:theme.palette.surface,borderColor:theme.palette.border},
    layout==='compact'&&styles.cardCompact,layout==='dense'&&styles.cardDense,
    appearance==='soft'&&[styles.cardSoft,{backgroundColor:theme.palette.surfaceMuted}],
    appearance==='outline'&&[styles.cardOutline,{borderWidth:2,borderColor:theme.palette.primary}],
    editorStyle&&{
      backgroundColor:gradientOn?'transparent':colorWithAlpha(bg,alpha),
      borderColor:frameBorder,borderWidth:editorStyle.borderWidth,
      borderRadius:editorStyle.borderRadius,...corners,
      borderStyle:fx.borderStyle,
      ...(fx.borderTop>=0?{borderTopWidth:fx.borderTop}:{}),
      ...(fx.borderRight>=0?{borderRightWidth:fx.borderRight}:{}),
      ...(fx.borderBottom>=0?{borderBottomWidth:fx.borderBottom}:{}),
      ...(fx.borderLeft>=0?{borderLeftWidth:fx.borderLeft}:{}),
      ...(editorStyle.padding!==undefined?{padding:editorStyle.padding}:{}),
      ...(fx.paddingTop>=0?{paddingTop:fx.paddingTop}:{}),
      ...(fx.paddingRight>=0?{paddingRight:fx.paddingRight}:{}),
      ...(fx.paddingBottom>=0?{paddingBottom:fx.paddingBottom}:{}),
      ...(fx.paddingLeft>=0?{paddingLeft:fx.paddingLeft}:{}),
      ...(editorStyle.width!==undefined?{width:editorStyle.width}:{}),
      ...(editorStyle.height!==undefined?{height:editorStyle.height,overflow:'visible' as const}:{}),
      ...(editorStyle.minHeight!==undefined?{minHeight:editorStyle.minHeight}:{}),
      ...(fx.contentGap>=0?{gap:fx.contentGap}:{}),
      ...(fx.marginVertical>0?{marginVertical:fx.marginVertical}:{}),
      ...(fx.maxWidth>0?{maxWidth:fx.maxWidth}:{}),
      ...(outerGlowOn?{overflow:'visible' as const}:{}),
      ...(shadowOn?{
        elevation:Math.max(1,Math.round((fx.shadowBlur+fx.shadowOffsetY)*.55)),
        shadowColor,shadowOpacity:editorStyle.shadowOpacity??.12,
        shadowRadius:fx.shadowBlur,shadowOffset:{width:fx.shadowOffsetX,height:fx.shadowOffsetY},
      }:{elevation:0,shadowOpacity:0}),
    },
    workHidden&&{opacity:.5},
  ]}>
    {outerGlowOn?outerGlowLayers(fx.outerGlowSpread,fx.outerGlowSoftness,fx.outerGlowOpacity)
      .map((band,index)=><View key={'outer-glow-'+index} pointerEvents="none"
        style={{position:'absolute',left:-band.inset,top:-band.inset,right:-band.inset,bottom:-band.inset,
          borderRadius:(editorStyle?.borderRadius??radius.lg)+band.inset,
          borderWidth:band.borderWidth,borderColor:colorWithAlpha(outerGlowColor,band.alpha)}}/>):null}
    {gradientOn?<View pointerEvents="none" onLayout={measureGradient}
      style={[StyleSheet.absoluteFill,corners,{overflow:'hidden',
        ...(!angled||!diagonal.side?{flexDirection:gradientAngle===90?'column':'row' as const}:{})}]}>
      {angled&&diagonal.side?<View style={{position:'absolute',width:diagonal.side,height:diagonal.side,
        left:diagonal.left,top:diagonal.top,flexDirection:'row',transform:[{rotate:gradientAngle+'deg'}]}}>
        {gradient.map((color,i)=><View key={i} style={{flex:1,backgroundColor:colorWithAlpha(color,alpha)}}/>)}
      </View>:gradient.map((color,i)=><View key={i} style={{flex:1,backgroundColor:colorWithAlpha(color,alpha)}}/>)}
    </View>:null}
    {imageOn?<View pointerEvents="none" style={[StyleSheet.absoluteFill,corners,{overflow:'hidden'}]}>
      <Image source={{uri:backgroundImageUri!}} resizeMode={fx.imageFit}
        style={[StyleSheet.absoluteFill,{opacity:fx.imageOpacity}]}/>
    </View>:null}
    {backgroundLayer&&fx.maskOpacity>0?<View pointerEvents="none"
      style={[StyleSheet.absoluteFill,corners,{backgroundColor:colorWithAlpha(imageMask,fx.maskOpacity)}]}/>:null}
    {fx.glowEnabled&&editorStyle?<Animated.View pointerEvents="none"
      style={[StyleSheet.absoluteFill,corners,{borderColor:colorWithAlpha(glowColor,fx.glowOpacity),
        borderWidth:fx.glowWidth,opacity:pulse,
        shadowColor:glowColor,shadowOpacity:fx.glowOpacity,
        shadowRadius:fx.glowWidth*1.5,shadowOffset:{width:0,height:0}}]}/>:null}
    {fx.blinkEnabled&&editorStyle?<Animated.View pointerEvents="none"
      style={[StyleSheet.absoluteFill,corners,{borderWidth:2,
        borderColor:colorWithAlpha(blinkColor,fx.blinkOpacity),opacity:blink}]}/>:null}
    {workActive?<View pointerEvents="none" style={[StyleSheet.absoluteFill,{
      borderStyle:'dashed',borderWidth:2,borderColor:theme.palette.primary,
      borderRadius:editorStyle?.borderRadius??radius.lg,
    }]}/>:null}
    <View style={styles.header}>
      <Text style={[styles.title,{color:theme.palette.text},
        layout==='dense'&&styles.titleDense,editorStyle&&{
          fontSize:editorStyle.titleFontSize,
          color:linkedColor(editorStyle.titleColor??theme.palette.text,
            editorStyle.titleProfitColor,'neutral',systemColors),
          textAlign:editorStyle.titleAlign,flex:1,
        }]}>{title}</Text>
      {action}
    </View>
    {editorStyle?.height!==undefined?<View style={{flexShrink:0,gap:fx.contentGap>=0?fx.contentGap:spacing.md}}>{children}</View>:children}
  </View>;
}

const styles=StyleSheet.create({
  card:{backgroundColor:colors.surface,borderRadius:radius.lg,borderWidth:1,
    borderColor:colors.border,padding:spacing.lg,gap:spacing.md},
  cardCompact:{padding:spacing.md,gap:spacing.sm,borderRadius:radius.md},
  cardDense:{padding:10,gap:6,borderRadius:radius.md},
  cardSoft:{backgroundColor:colors.surfaceMuted},
  cardOutline:{borderWidth:2,borderColor:colors.primary},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  title:{color:colors.text,fontSize:17,fontWeight:'800'},
  titleDense:{fontSize:15},
});
