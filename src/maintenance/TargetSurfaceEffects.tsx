import {View,StyleSheet,type ViewStyle} from 'react-native';
import type {TargetAppearance} from './inspectionModel';
import {colorWithAlpha,sampleFrameGradient} from './frameEffects';

/** Shared native View renderer: gradient/background alpha stay behind native text and values. */
export function targetShadowStyle(appearance:TargetAppearance,color:string):ViewStyle {
  if(!appearance.shadowEnabled)return {};
  return {
    shadowColor:color,shadowOpacity:appearance.shadowOpacity,shadowRadius:appearance.shadowBlur,
    shadowOffset:{width:appearance.shadowOffsetX,height:appearance.shadowOffsetY},
    elevation:Math.max(1,Math.min(24,Math.round(appearance.shadowBlur*.7+appearance.shadowOpacity*5))),
  };
}

/** Layer must be the FIRST child of a position:relative surface. It never fades its siblings. */
export function TargetBackdrop({appearance,start,middle,end,glow}:{
  appearance:TargetAppearance;start:string;middle:string;end:string;glow:string;
}){
  const gradient=appearance.backgroundMode==='gradient';
  const innerEdge=appearance.glowEnabled&&appearance.glowOpacity>0&&appearance.glowWidth>0;
  if(!gradient&&!innerEdge)return null;
  return <>
    {gradient?<View pointerEvents="none" style={[StyleSheet.absoluteFill,{
      overflow:'hidden',borderRadius:appearance.borderRadius,
      flexDirection:appearance.gradientDirection==='horizontal'?'row':'column',
    }]}>
      {Array.from({length:16},(_,i)=><View key={i} style={{
        flex:1,backgroundColor:colorWithAlpha(
          sampleFrameGradient(start,middle,end,i/15,appearance.gradientMidStop,appearance.gradientMidEnabled),
          appearance.backgroundOpacity),
      }}/>)}
    </View>:null}
    {innerEdge?<View pointerEvents="none" style={[StyleSheet.absoluteFill,{
      borderRadius:appearance.borderRadius,borderWidth:appearance.glowWidth,
      borderColor:colorWithAlpha(glow,appearance.glowOpacity),
    }]}/>:null}
  </>;
}
