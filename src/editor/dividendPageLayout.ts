import type {TextStyle,ViewStyle} from 'react-native';
import type {TargetOverride} from '../maintenance/inspectionModel';
import {colorWithAlpha} from '../maintenance/frameEffects';

/** Page-local visual overrides only. A dividend value is never edited by this adapter. */
export const dividendTargetId=(editorId:string)=>'dividend:'+editorId;

export function dividendTextVisual(o?:TargetOverride):TextStyle|undefined {
  if(!o)return undefined;
  return {
    ...(o.fontSize!==undefined?{fontSize:o.fontSize}:{}),
    ...(o.fontWeight!==undefined?{fontWeight:o.fontWeight}:{}),
    ...(o.fontStyle!==undefined?{fontStyle:o.fontStyle}:{}),
    ...(o.letterSpacing!==undefined?{letterSpacing:o.letterSpacing}:{}),
    ...(o.lineHeight!==undefined&&o.lineHeight>0?{lineHeight:o.lineHeight}:{}),
    ...(o.textDecorationLine!==undefined?{textDecorationLine:o.textDecorationLine}:{}),
    ...(o.align!==undefined?{textAlign:o.align}:{}),
    ...(o.textColor!==undefined?{color:colorWithAlpha(o.textColor,o.textOpacity??1)}:{}),
    ...(o.backgroundColor!==undefined?{backgroundColor:colorWithAlpha(o.backgroundColor,o.backgroundOpacity??1)}:{}),
    ...(o.borderColor!==undefined?{borderColor:colorWithAlpha(o.borderColor,o.borderOpacity??1)}:{}),
    ...(o.borderWidth!==undefined?{borderWidth:o.borderWidth}:{}),
    ...(o.borderRadius!==undefined?{borderRadius:o.borderRadius}:{}),
    ...(o.padding!==undefined?{padding:o.padding}:{}),
    ...(o.opacity!==undefined?{opacity:o.opacity}:{}),
    ...(o.width!==undefined?{width:o.width}:{}),
    ...(o.height!==undefined?{height:o.height}:{}),
    ...(o.offsetX!==undefined||o.offsetY!==undefined?{transform:[{translateX:o.offsetX??0},{translateY:o.offsetY??0}]}:{}),
  };
}

export function dividendControlVisual(o?:TargetOverride):ViewStyle|undefined {
  if(!o)return undefined;
  return {
    ...(o.backgroundColor!==undefined?{backgroundColor:colorWithAlpha(o.backgroundColor,o.backgroundOpacity??1)}:{}),
    ...(o.borderColor!==undefined?{borderColor:colorWithAlpha(o.borderColor,o.borderOpacity??1)}:{}),
    ...(o.borderWidth!==undefined?{borderWidth:o.borderWidth}:{}),
    ...(o.borderRadius!==undefined?{borderRadius:o.borderRadius}:{}),
    ...(o.padding!==undefined?{padding:o.padding}:{}),
    ...(o.opacity!==undefined?{opacity:o.opacity}:{}),
    ...(o.width!==undefined?{width:o.width}:{}),
    ...(o.height!==undefined?{height:o.height}:{}),
    ...(o.marginVertical!==undefined?{marginVertical:o.marginVertical}:{}),
    ...(o.marginHorizontal!==undefined?{marginHorizontal:o.marginHorizontal}:{}),
    ...(o.offsetX!==undefined||o.offsetY!==undefined?{transform:[{translateX:o.offsetX??0},{translateY:o.offsetY??0}]}:{}),
  };
}
