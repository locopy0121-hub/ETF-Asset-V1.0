import {Children,cloneElement,isValidElement,useState,
  type PropsWithChildren,type ReactElement} from 'react';
import {View,type LayoutChangeEvent,type ViewStyle,type StyleProp} from 'react-native';
import type {MainPageKey} from '../domain/pageRegistry';
import type {FrameEditorConfig} from '../editor/editorModel';
import {usePageEditor} from '../editor/pageEditor';
import {useMaintenance} from '../maintenance/MaintenanceRuntime';
import {DEFAULT_EQUAL_GRID,equalGridPixelWidths,normalizeEqualGrid} from '../domain/equalGridLayout';
import {EqualGridContext} from './equalGridContext';

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
  const columns=rule.columns==='auto'?Math.min(4,Math.max(1,cells.length)):rule.columns;
  // Width and gap together may never exceed the measured parent on narrow screens.
  const safeGap=rule.enabled&&available>0&&columns>1?
    Math.min(rule.gap,Math.max(0,Math.floor((available-columns)/(columns-1)))):rule.gap;
  const effectiveRule={...rule,gap:safeGap};
  const widths=rule.enabled?equalGridPixelWidths(cells.length,effectiveRule,available):[];
  const measured=(event:LayoutChangeEvent)=>{
    // Floor fractional dp so the allocated column widths cannot exceed the physical row.
    const next=Math.floor(event.nativeEvent.layout.width);
    if(next>0)setAvailable(previous=>previous===next?previous:next);
  };
  return <View onLayout={measured} style={{
    width:'100%',flexDirection:'row',flexWrap:'wrap',
    alignItems:'flex-start',columnGap:rule.enabled?safeGap:8,rowGap:rule.enabled?safeGap:8,
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
