import {Children,cloneElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {Pressable,StyleSheet,View,type TextStyle} from 'react-native';
import type {TargetOverride} from '../maintenance/inspectionModel';
import type {FrameEditorConfig} from '../editor/editorModel';
import {normalizeEqualGrid} from '../domain/equalGridLayout';
import {EqualGrid} from './EqualGrid';
import type {LayoutSelectionTarget} from '../editor/LayoutSelectionContext';
import {dividendControlVisual,dividendTargetId,dividendTextVisual} from '../editor/dividendPageLayout';
import {dividendCatalogTarget,dividendPreviewInteractionTarget} from '../editor/dividendEditorCatalog';
import {Text as EditableText,Pressable as EditablePressable} from './EditableNative';
import {MetricTile} from './MetricTile';
import {AiQuestionBox} from './AiQuestionBox';
import {readableDividendSummaryMetric} from '../dividend/dividendSummaryVisual';

type PreviewElement=ReactElement<{
  children?:ReactNode;
  style?:unknown;
  editorId?:string;
  editorReadOnly?:boolean;
  accessibilityLabel?:string;
  label?:string;
  onPress?:()=>void;
  onLongPress?:()=>void;
  disabled?:boolean;
  editorSkip?:boolean;
  editorStyle?:TargetOverride;
  previewConfig?:FrameEditorConfig;
}>;

/**
 * Decorates the *same rendered React element tree* used by DividendScreen.
 * Interactions in this preview select a design target and never write to the ledger.
 */
export function selectDividendPreview(
  content:ReactNode,
  onSelect:(target:LayoutSelectionTarget)=>void,
  selectedId:string|null,
  overrides:Readonly<Record<string,TargetOverride>>,
  previewConfig?:FrameEditorConfig,
):ReactNode {
  const equalActive=normalizeEqualGrid(previewConfig?.equalGrid).enabled;
  return Children.map(content,child=>{
    if(!isValidElement(child))return child;
    const element=child as PreviewElement;
    const p=element.props;
    if(child.type===AiQuestionBox)return <View pointerEvents="none">{child}</View>;
    if(child.type===EqualGrid)return cloneElement(element,{
      ...(previewConfig?{previewConfig}:{}),
      children:selectDividendPreview(p.children,onSelect,selectedId,overrides,previewConfig),
    });
    if(child.type===MetricTile&&typeof p.label==='string'){
      const label=p.label;
      const id=dividendTargetId('metric:'+label);
      const metricStyle=readableDividendSummaryMetric(overrides[id]??p.editorStyle);
      const fixedWidth=metricStyle.width!==undefined;
      const fixedHeight=metricStyle.height!==undefined;
      return <Pressable accessibilityRole="button" accessibilityLabel={'編輯'+p.label}
        onPress={()=>onSelect({id,kind:'card',label})}
        style={[{alignSelf:'stretch',
          // Only auto-sized cards use the recommended readable dimensions.
          // An explicit edited size is never replaced by that recommendation.
          ...(equalActive?{width:'100%',minWidth:0,flexGrow:0,alignSelf:'flex-start'}:
            fixedWidth?{width:metricStyle.width,minWidth:1,flexGrow:0}:{flex:1,minWidth:136}),
          ...(fixedHeight?{height:metricStyle.height,minHeight:1}:equalActive?{minHeight:0}:{minHeight:128}),
        },selectedId===id?{borderWidth:2,borderColor:'#0969DA',borderRadius:10}:undefined]}>
        <View pointerEvents="none" style={equalActive?{width:'100%'}:fixedWidth||fixedHeight?{flexGrow:0,flexShrink:0}:{flex:1}}>{cloneElement(element,{
          ...(overrides[id]??p.editorStyle?{editorStyle:metricStyle}:{})
        })}</View>
      </Pressable>;
    }
    if(typeof p.editorId==='string'&&child.type===EditableText){
      const id=dividendTargetId(p.editorId);
      const label=p.editorId.split(':').slice(-2).join(' · ');
      const raw=StyleSheet.flatten(p.style as TextStyle|TextStyle[]) as TextStyle|undefined;
      const explicit=overrides[id];
      return <Pressable accessibilityRole="button" accessibilityLabel={'編輯'+label}
        onPress={()=>onSelect(dividendCatalogTarget(id)??{id,kind:p.editorReadOnly===false?'text':'value',label})}
        style={[raw?.flex!==undefined&&explicit?.width===undefined?{flex:raw.flex}:{},
          raw?.width!==undefined&&explicit?.width===undefined?{width:raw.width}:{},
          explicit?.width!==undefined?{width:explicit.width,minWidth:1,maxWidth:explicit.width,flex:0}:undefined,
          explicit?.height!==undefined?{height:explicit.height,minHeight:1}:undefined,
          selectedId===id?{borderWidth:1,borderColor:'#0969DA',borderRadius:5}:undefined]}>
        <View pointerEvents="none">{cloneElement(element,{editorSkip:true,style:[p.style,dividendTextVisual(overrides[id])]})}</View>
      </Pressable>;
    }
    if(typeof p.editorId==='string'&&child.type===EditablePressable){
      const id=dividendTargetId(p.editorId);
      const label=p.accessibilityLabel??p.editorId.split(':').slice(-2).join(' · ');
      return cloneElement(element,{
        disabled:false,
        // A short tap on a calendar cell edits its date numeral; hold to edit the cell.
        // This also handles devices that dispatch both nested and parent press responders.
        onPress:()=>onSelect(dividendPreviewInteractionTarget(p.editorId!,'tap')??{id,kind:'card',label}),
        onLongPress:()=>onSelect(dividendPreviewInteractionTarget(p.editorId!,'long-press')??{id,kind:'card',label}),
        editorSkip:true,
        style:[p.style,dividendControlVisual(overrides[id]),
          ...(selectedId===id?[{borderWidth:2,borderColor:'#0969DA'}]:[])],
        children:selectDividendPreview(p.children,onSelect,selectedId,overrides,previewConfig),
      });
    }
    if(p.children!==undefined)return cloneElement(element,{
      children:selectDividendPreview(p.children,onSelect,selectedId,overrides,previewConfig),
    });
    return child;
  });
}
