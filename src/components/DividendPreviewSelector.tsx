import {Children,cloneElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {Pressable,View} from 'react-native';
import type {TargetOverride} from '../maintenance/inspectionModel';
import type {LayoutSelectionTarget} from '../editor/LayoutSelectionContext';
import {dividendControlVisual,dividendTargetId,dividendTextVisual} from '../editor/dividendPageLayout';
import {Text as EditableText,Pressable as EditablePressable} from './EditableNative';
import {MetricTile} from './MetricTile';
import {AiQuestionBox} from './AiQuestionBox';

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
):ReactNode {
  return Children.map(content,child=>{
    if(!isValidElement(child))return child;
    const element=child as PreviewElement;
    const p=element.props;
    if(child.type===AiQuestionBox)return <View pointerEvents="none">{child}</View>;
    if(child.type===MetricTile&&typeof p.label==='string'){
      const id=dividendTargetId('metric:'+p.label);
      return <Pressable accessibilityRole="button" accessibilityLabel={'編輯'+p.label}
        onPress={()=>onSelect({id,kind:'card',label:p.label})}
        style={selectedId===id?{borderWidth:2,borderColor:'#0969DA',borderRadius:10}:undefined}>
        <View pointerEvents="none">{cloneElement(element,{editorStyle:overrides[id]??p.editorStyle})}</View>
      </Pressable>;
    }
    if(typeof p.editorId==='string'&&child.type===EditableText){
      const id=dividendTargetId(p.editorId);
      const label=p.editorId.split(':').slice(-2).join(' · ');
      return <Pressable accessibilityRole="button" accessibilityLabel={'編輯'+label}
        onPress={()=>onSelect({id,kind:p.editorReadOnly===false?'text':'value',label})}
        style={selectedId===id?{borderWidth:1,borderColor:'#0969DA',borderRadius:5}:undefined}>
        <View pointerEvents="none">{cloneElement(element,{editorSkip:true,style:[p.style,dividendTextVisual(overrides[id])]})}</View>
      </Pressable>;
    }
    if(typeof p.editorId==='string'&&child.type===EditablePressable){
      const id=dividendTargetId(p.editorId);
      const label=p.accessibilityLabel??p.editorId.split(':').slice(-2).join(' · ');
      return cloneElement(element,{
        disabled:false,
        onPress:()=>onSelect({id,kind:'card',label}),
        onLongPress:undefined,
        editorSkip:true,
        style:[p.style,dividendControlVisual(overrides[id]),
          ...(selectedId===id?[{borderWidth:2,borderColor:'#0969DA'}]:[])],
        children:selectDividendPreview(p.children,onSelect,selectedId,overrides),
      });
    }
    if(p.children!==undefined)return cloneElement(element,{
      children:selectDividendPreview(p.children,onSelect,selectedId,overrides),
    });
    return child;
  });
}
