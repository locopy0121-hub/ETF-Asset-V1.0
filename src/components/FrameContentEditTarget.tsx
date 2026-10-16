import type {PropsWithChildren} from 'react';
import {Pressable,View,type ViewStyle} from 'react-native';
import type {MainPageKey} from '../domain/pageRegistry';
import {useLayoutRuntime} from '../editor/LayoutSelectionContext';
import {usePageEditor} from '../editor/pageEditor';
import {colorWithAlpha} from '../maintenance/frameEffects';

/** Applies the same saved card appearance to the production view and its inert preview. */
export function FrameContentEditTarget({page,frameKey,children}:PropsWithChildren<{page:MainPageKey;frameKey:string}>){
  const runtime=useLayoutRuntime(),editor=usePageEditor(page);
  const id='content:'+page+':'+frameKey;
  const styleTarget=(runtime.active?runtime.targets:editor.displayConfig.layoutTargets)?.[id];
  if(!runtime.active&&!styleTarget)return <>{children}</>;
  const o=styleTarget;
  const style:ViewStyle={
    ...(o?.width!==undefined?{width:o.width}:{}),
    ...(o?.height!==undefined?{height:o.height}:{}),
    ...(o?.padding!==undefined?{padding:o.padding}:{}),
    ...(o?.backgroundColor!==undefined?{backgroundColor:colorWithAlpha(o.backgroundColor,o.backgroundOpacity??1)}:{}),
    ...(o?.borderWidth!==undefined?{borderWidth:o.borderWidth}:{}),
    ...(o?.borderColor!==undefined?{borderColor:colorWithAlpha(o.borderColor,o.borderOpacity??1)}:{}),
    ...(o?.borderRadius!==undefined?{borderRadius:o.borderRadius}:{}),
    ...(o?.opacity!==undefined?{opacity:o.opacity}:{}),
  };
  const content=<View style={style}>{children}</View>;
  if(!runtime.active)return content;
  return <Pressable accessibilityRole="button" accessibilityLabel="選取內容卡片"
    onPress={()=>runtime.onSelect?.({id,kind:'card',label:'內容卡片'})}
    style={runtime.selectedId===id?{borderWidth:2,borderColor:'#0969DA',borderRadius:8}:undefined}>
    <View pointerEvents="none">{content}</View>
  </Pressable>;
}
