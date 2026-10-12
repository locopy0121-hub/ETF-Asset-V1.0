import type {ReactNode} from 'react';
import {StyleSheet,View,type StyleProp,type TextStyle,type ViewStyle} from 'react-native';
import {Pressable,Text} from './EditableNative';
import {useLayoutRuntime} from '../editor/LayoutSelectionContext';
import {usePageEditor} from '../editor/pageEditor';
import {useSystemColors} from '../theme/useSystemColors';
import {colorWithAlpha} from '../maintenance/frameEffects';

type Tone='gain'|'loss'|'neutral';

function useMarketTarget(id:string){
  const editor=usePageEditor('market');
  const runtime=useLayoutRuntime();
  const override=(runtime.active?runtime.targets:editor.displayConfig.layoutTargets)?.[id];
  return {runtime,override};
}

function targetColor(color:string,opacity:number|undefined){
  return opacity===undefined?color:colorWithAlpha(color,opacity);
}

/** Rendering follows the same persisted layoutTargets in the real page and editor.
 * Never accepts or edits a raw quote, original ledger or API response.
 */
export function MarketEditableText({id,label,kind='text',tone='neutral',style,children}:{
  id:string;label:string;kind?:'text'|'value';tone?:Tone;
  style?:StyleProp<TextStyle>;children:ReactNode;
}){
  const {runtime,override}=useMarketTarget(id);
  const colors=useSystemColors();
  const gainLoss=tone==='gain'?colors.gain:tone==='loss'?colors.loss:colors.flat;
  const color=override?.textProfitColor===true?gainLoss:override?.textColor;
  const visual:TextStyle={
    ...(color?{color:targetColor(color,override?.textOpacity)}:{}),
    ...(override?.fontSize!==undefined?{fontSize:override.fontSize}:{}),
    ...(override?.fontWeight!==undefined?{fontWeight:override.fontWeight}:{}),
    ...(override?.fontStyle!==undefined?{fontStyle:override.fontStyle}:{}),
    ...(override?.fontFamily!==undefined?{fontFamily:override.fontFamily==='system'?undefined:override.fontFamily}:{}),
    ...(override?.textDecorationLine!==undefined?{textDecorationLine:override.textDecorationLine}:{}),
    ...(override?.letterSpacing!==undefined?{letterSpacing:override.letterSpacing}:{}),
    ...(override?.lineHeight!==undefined&&override.lineHeight>0?{lineHeight:override.lineHeight}:{}),
    ...(override?.align!==undefined?{textAlign:override.align}:{}),
    ...(override?.width!==undefined?{width:override.width}:{}),
    ...(override?.height!==undefined?{height:override.height}:{}),
    ...(override?.padding!==undefined?{padding:override.padding}:{}),
    ...(override?.backgroundColor!==undefined?{backgroundColor:targetColor(override.backgroundColor,override.backgroundOpacity)}:{}),
    ...(override?.borderWidth!==undefined?{borderWidth:override.borderWidth}:{}),
    ...(override?.borderColor!==undefined?{borderColor:targetColor(override.borderColor,override.borderOpacity)}:{}),
    ...(override?.borderRadius!==undefined?{borderRadius:override.borderRadius}:{}),
    ...(override?.opacity!==undefined?{opacity:override.opacity}:{}),
  };
  const child=<Text style={[StyleSheet.flatten(style),visual]}>{children}</Text>;
  if(!runtime.active)return child;
  return <Pressable accessibilityRole="button" accessibilityLabel={'編輯'+label}
    onPress={()=>runtime.onSelect?.({id,kind,label})}
    style={[{alignSelf:'flex-start',maxWidth:'100%',borderRadius:6},
      runtime.selectedId===id?{borderWidth:2,borderColor:'#0969DA'}:undefined]}>
    <View pointerEvents="none">{child}</View>
  </Pressable>;
}

export function MarketEditableSurface({id,label,style,children}:{
  id:string;label:string;style?:StyleProp<ViewStyle>;children:ReactNode;
}){
  const {runtime,override}=useMarketTarget(id);
  const visual:ViewStyle={
    ...(override?.width!==undefined?{width:override.width}:{}),
    ...(override?.height!==undefined?{height:override.height}:{}),
    ...(override?.padding!==undefined?{padding:override.padding}:{}),
    ...(override?.backgroundColor!==undefined?{backgroundColor:targetColor(override.backgroundColor,override.backgroundOpacity)}:{}),
    ...(override?.borderWidth!==undefined?{borderWidth:override.borderWidth}:{}),
    ...(override?.borderColor!==undefined?{borderColor:targetColor(override.borderColor,override.borderOpacity)}:{}),
    ...(override?.borderRadius!==undefined?{borderRadius:override.borderRadius}:{}),
    ...(override?.opacity!==undefined?{opacity:override.opacity}:{}),
  };
  const body=<View style={[style,visual]}>{children}</View>;
  if(!runtime.active)return body;
  return <Pressable accessibilityRole="button" accessibilityLabel={'編輯'+label}
    onPress={()=>runtime.onSelect?.({id,kind:'card',label})}
    style={runtime.selectedId===id?{borderWidth:2,borderColor:'#0969DA',borderRadius:8}:undefined}>
    <View pointerEvents="none">{body}</View>
  </Pressable>;
}

/** Only the editor preview is inert. Production touch/search/refresh stay intact. */
export function MarketPreviewActionGuard({children}:{children:ReactNode}){
  const runtime=useLayoutRuntime();
  return <View pointerEvents={runtime.active?'none':'auto'}>{children}</View>;
}
