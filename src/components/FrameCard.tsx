import {useEffect,useMemo,useRef,useState,type PropsWithChildren,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,Easing,Image,StyleSheet,Text,View,type LayoutChangeEvent} from 'react-native';

import type {FrameAppearance,FrameEditorConfig,FrameLayout} from '../editor/pageEditor';
import {DEFAULT_FRAME_EFFECTS,angledFrameGradientBounds,colorWithAlpha,mixFrameColors,normalizeFrameEffects,outerGlowLayers,sampleFrameGradient,frameTitleMarqueeDuration,frameShadowSpreadBands,frameBorderGradientBands} from '../maintenance/frameEffects';
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
  const entrance=useRef(new Animated.Value(1)).current;
  const marqueeShift=useRef(new Animated.Value(0)).current;
  const [titleAvailable,setTitleAvailable]=useState(0);
  const [titleIntrinsic,setTitleIntrinsic]=useState(0);
  useEffect(()=>{
    let mounted=true;
    AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduceMotion(value);})
      .catch(()=>{if(mounted)setReduceMotion(true);});
    const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{
      if(mounted)setReduceMotion(Boolean(value));
    });
    return()=>{mounted=false;subscription.remove();};
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
  useEffect(()=>{
    entrance.stopAnimation();entrance.setValue(1);
    if(!editorStyle||!fx.entranceEnabled||reduceMotion)return;
    entrance.setValue(0);
    const animation=Animated.timing(entrance,{
      toValue:1,duration:fx.entranceDurationMs,easing:Easing.out(Easing.cubic),
      useNativeDriver:true,
    });
    animation.start();
    return()=>{animation.stop();entrance.stopAnimation();entrance.setValue(1);};
  },[Boolean(editorStyle),fx.entranceEnabled,fx.entranceMode,fx.entranceDurationMs,
     fx.entranceDistance,fx.entranceScale,fx.entranceRotationDeg,reduceMotion,entrance]);
  const entranceTransform=fx.entranceMode==='slide'
    ? [{translateX:entrance.interpolate({inputRange:[0,1],outputRange:[fx.entranceDistance,0]})}]
    : fx.entranceMode==='zoom'
      ? [{scale:entrance.interpolate({inputRange:[0,1],outputRange:[fx.entranceScale,1]})}]
      : [{rotate:entrance.interpolate({inputRange:[0,1],outputRange:['-'+fx.entranceRotationDeg+'deg','0deg']})}];
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
  const titleMarquee=Boolean(editorStyle&&fx.titleMarqueeEnabled);
  const titleStyle=[
    styles.title,{color:theme.palette.text},
    layout==='dense'&&styles.titleDense,
    editorStyle&&{
      fontSize:editorStyle.titleFontSize,
      color:linkedColor(editorStyle.titleColor??theme.palette.text,
        editorStyle.titleProfitColor,'neutral',systemColors),
      textAlign:editorStyle.titleAlign,
    },
  ];
  const marqueeActive=titleMarquee&&!reduceMotion&&titleAvailable>0&&titleIntrinsic>titleAvailable+1;
  useEffect(()=>{
    marqueeShift.stopAnimation();marqueeShift.setValue(0);
    if(!marqueeActive)return;
    const loop=Animated.loop(Animated.timing(marqueeShift,{
      toValue:-(titleIntrinsic+fx.titleMarqueeGap),
      duration:frameTitleMarqueeDuration(titleIntrinsic,fx.titleMarqueeGap,fx.titleMarqueeSpeed),
      easing:Easing.linear,useNativeDriver:true,
    }));
    loop.start();
    return()=>{loop.stop();marqueeShift.stopAnimation();};
  },[marqueeActive,title,titleIntrinsic,fx.titleMarqueeGap,fx.titleMarqueeSpeed,marqueeShift]);
  const outerGlowOn=Boolean(editorStyle&&fx.outerGlowEnabled&&fx.outerGlowOpacity>0);
  const shadowSpreadOn=Boolean(editorStyle&&fx.shadowSpreadEnabled&&fx.shadowSpreadRadius>0&&fx.shadowSpreadOpacity>0);
  const borderGradientOn=Boolean(editorStyle&&fx.borderGradientEnabled&&fx.borderGradientWidth>0&&fx.borderGradientOpacity>0);
  const borderGradientStart=linkedColor(fx.borderGradientStartColor,fx.borderGradientStartProfitColor,'neutral',systemColors);
  const borderGradientEnd=linkedColor(fx.borderGradientEndColor,fx.borderGradientEndProfitColor,'neutral',systemColors);
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
  return <Animated.View style={[
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
      ...(outerGlowOn||shadowSpreadOn||borderGradientOn?{overflow:'visible' as const}:{}),
      ...(shadowOn?{
        elevation:Math.max(1,Math.round((fx.shadowBlur+fx.shadowOffsetY)*.55)),
        shadowColor,shadowOpacity:editorStyle.shadowOpacity??.12,
        shadowRadius:fx.shadowBlur,shadowOffset:{width:fx.shadowOffsetX,height:fx.shadowOffsetY},
      }:{elevation:0,shadowOpacity:0}),
    },
    editorStyle&&fx.entranceEnabled&&!reduceMotion&&{transform:entranceTransform},
    workHidden&&{opacity:.5},
  ]}>
    {shadowSpreadOn?frameShadowSpreadBands(fx.shadowSpreadRadius,fx.shadowSpreadOpacity,fx.shadowSpreadLayers)
      .map((band,index)=><View key={'shadow-spread-'+index} pointerEvents="none"
        style={{position:'absolute',left:-band.inset+fx.shadowOffsetX,top:-band.inset+fx.shadowOffsetY,
          right:-band.inset-fx.shadowOffsetX,bottom:-band.inset-fx.shadowOffsetY,
          borderTopLeftRadius:corners.borderTopLeftRadius+band.inset,
          borderTopRightRadius:corners.borderTopRightRadius+band.inset,
          borderBottomLeftRadius:corners.borderBottomLeftRadius+band.inset,
          borderBottomRightRadius:corners.borderBottomRightRadius+band.inset,
          borderWidth:band.borderWidth,borderColor:colorWithAlpha(shadowColor,band.alpha)}}/>):null}
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
    {borderGradientOn?frameBorderGradientBands(borderGradientStart,borderGradientEnd,
      fx.borderGradientWidth,fx.borderGradientOpacity,fx.borderGradientMode)
      .map((band,index)=><View key={'border-gradient-'+index} pointerEvents="none"
        style={{position:'absolute',left:-band.inset,top:-band.inset,right:-band.inset,bottom:-band.inset,
          borderTopLeftRadius:corners.borderTopLeftRadius+band.inset,
          borderTopRightRadius:corners.borderTopRightRadius+band.inset,
          borderBottomLeftRadius:corners.borderBottomLeftRadius+band.inset,
          borderBottomRightRadius:corners.borderBottomRightRadius+band.inset,
          borderWidth:band.stroke,borderColor:colorWithAlpha(band.color,band.alpha)}}/>):null}
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
      <View style={{flex:1,overflow:'hidden',marginRight:action?8:0}}
        onLayout={(event:LayoutChangeEvent)=>{
          const width=event.nativeEvent.layout.width;
          setTitleAvailable(previous=>Math.abs(previous-width)<1?previous:width);
        }}>
        {titleMarquee&&!reduceMotion?<>
          <Text accessible={false} numberOfLines={1} onLayout={(event:LayoutChangeEvent)=>{
            const width=event.nativeEvent.layout.width;
            setTitleIntrinsic(previous=>Math.abs(previous-width)<1?previous:width);
          }} style={[titleStyle,{position:'absolute',left:0,top:0,opacity:0,alignSelf:'flex-start'}]}>{title}</Text>
          <Animated.View pointerEvents="none" style={{flexDirection:'row',alignItems:'center',
            transform:[{translateX:marqueeShift}]}}>
            <Text numberOfLines={1} style={[titleStyle,{flexShrink:0}]}>{title}</Text>
            {marqueeActive?<Text accessible={false} importantForAccessibility="no-hide-descendants"
              numberOfLines={1} style={[titleStyle,{flexShrink:0,marginLeft:fx.titleMarqueeGap}]}>{title}</Text>:null}
          </Animated.View>
        </>:<Text numberOfLines={titleMarquee?1:undefined} ellipsizeMode="tail"
          style={[titleStyle,{flexShrink:1}]}>{title}</Text>}
      </View>
      {action}
    </View>
    {editorStyle?.height!==undefined?<View style={{flexShrink:0,gap:fx.contentGap>=0?fx.contentGap:spacing.md}}>{children}</View>:children}
  </Animated.View>;
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
