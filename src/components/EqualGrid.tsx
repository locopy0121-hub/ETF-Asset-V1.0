import {Children,cloneElement,createContext,isValidElement,useContext,useState,
  type PropsWithChildren,type ReactElement} from 'react';
import {View,type LayoutChangeEvent,type ViewStyle,type StyleProp} from 'react-native';
import type {MainPageKey} from '../domain/pageRegistry';
import type {FrameEditorConfig} from '../editor/editorModel';
import {usePageEditor} from '../editor/pageEditor';
import {useMaintenance} from '../maintenance/MaintenanceRuntime';
import {DEFAULT_EQUAL_GRID,equalGridWidths,normalizeEqualGrid} from '../domain/equalGridLayout';

export const EqualGridContext=createContext(false);
export const useEqualGridActive=()=>useContext(EqualGridContext);

/** Measures the actual content width; no hardcoded 328px or assumed phone resolution.
 * Enabled: 2/3/4/auto equal columns, reflowing any partial last row to fill.
 * Disabled: renders exactly the original flex children (manual width/XY remain in force).
 */
export function EqualGrid({pageKey,frameKey,previewConfig,children}:PropsWithChildren<{
  pageKey:MainPageKey;frameKey:string;previewConfig?:FrameEditorConfig|undefined;
}>){
  const {config}=usePageEditor(pageKey);
  const engineer=useMaintenance();
  const session=engineer.session?.page===pageKey&&engineer.session.frameKey===frameKey?engineer.session:null;
  const effective=previewConfig??session?.draft??config[frameKey];
  const rule=normalizeEqualGrid(effective?.equalGrid??DEFAULT_EQUAL_GRID);
  const [available,setAvailable]=useState(0);
  const cells=Children.toArray(children);
  const widths=rule.enabled?equalGridWidths(cells.length,rule,available):[];
  const measured=(event:LayoutChangeEvent)=>{
    const next=Math.round(event.nativeEvent.layout.width);
    if(next>0)setAvailable(previous=>previous===next?previous:next);
  };
  return <View onLayout={measured} style={{
    width:'100%',flexDirection:'row',flexWrap:'wrap',
    alignItems:'flex-start',columnGap:rule.enabled?rule.gap:8,rowGap:rule.enabled?rule.gap:8,
  }}>
    {cells.map((child,index)=>{
      if(!isValidElement(child))return child;
      const element=child as ReactElement<{style?:StyleProp<ViewStyle>}>;
      const width=widths[index];
      return <EqualGridContext.Provider key={child.key??String(index)} value={rule.enabled}>
        {cloneElement(element,{style:rule.enabled&&width!==undefined?
          [element.props.style,{width,flexBasis:width,flexGrow:0,flexShrink:0,
            minWidth:0,maxWidth:width,alignSelf:'flex-start'}]:element.props.style})}
      </EqualGridContext.Provider>;
    })}
  </View>;
}
