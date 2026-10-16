import {Children,cloneElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {Pressable,Text as NativeText,TextInput as NativeInput,Pressable as NativePressable,View,type TextStyle} from 'react-native';
import type {LayoutSelectionTarget} from '../editor/LayoutSelectionContext';
import type {TargetOverride} from '../maintenance/inspectionModel';
import {Text as EditableText,TextInput as EditableInput,Pressable as EditablePressable,plainText} from './EditableNative';
import {MetricTile} from './MetricTile';
import {AiQuestionBox} from './AiQuestionBox';
type Item=LayoutSelectionTarget;
type P={children?:ReactNode;editorId?:string;editorReadOnly?:boolean;editorSkip?:boolean;label?:string;
  accessibilityLabel?:string;style?:unknown;onPress?:()=>void;onLongPress?:()=>void;disabled?:boolean;
  editable?:boolean;showSoftInputOnFocus?:boolean;editorStyle?:TargetOverride};
type E=ReactElement<P>;
const hash=(value:string)=>{let h=2166136261;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(36);};
/** Match persisted IDs chosen by the production PageEditorStack / EditableNative renderer. */
export function contentItem(element:E,path:string):Item|null{
  const p=element.props;
  if(element.type===MetricTile&&typeof p.label==='string')return {id:'metric:'+p.label,kind:'card',label:'指標 · '+p.label};
  if(element.type===EditableText||element.type===NativeText){
    const value=typeof p.children==='string'||typeof p.children==='number'?String(p.children):null;
    if(value&&value.trim().length>=2)return {id:'text:'+path,
      kind:p.editorReadOnly===true||/^[+-]?[\d,.]+%?$/.test(value.trim())?'value':'text',
      label:(p.editorReadOnly===true?'數值':'文字')+' · '+value.slice(0,22)};
    if(p.editorId)return {id:p.editorReadOnly===false?p.editorId+':'+hash(plainText(p.children)):p.editorId,
      kind:p.editorReadOnly===false?'text':'value',label:'欄位 · '+p.editorId.split(':').slice(-2).join(' · ')};
  }
  if(p.editorId&&(element.type===EditablePressable||element.type===EditableInput||element.type===NativeInput))
    return {id:p.editorId,kind:element.type===EditablePressable?'button':'card',
      label:(element.type===EditablePressable?'按鈕':'輸入框')+' · '+(p.accessibilityLabel??p.editorId.split(':').slice(-2).join(' · '))};
  return null;
}
function traverse(node:ReactNode,path:string,visit:(item:Item)=>void):void{
  Children.forEach(node,(child,index)=>{
    if(!isValidElement(child))return;
    const el=child as E,next=(path+'/'+(child.key!==null?String(child.key):String(index))).slice(0,120),item=contentItem(el,next);
    if(item)visit(item);
    else if(el.props.children!==undefined)traverse(el.props.children,next,visit);
  });
}
export function listCardContentItems(content:ReactNode):Item[]{
  const out:Item[]=[],seen=new Set<string>();
  traverse(content,'root',item=>{if(!seen.has(item.id)){seen.add(item.id);out.push(item);}});
  return out;
}
const typography=(o:TargetOverride|undefined):TextStyle=>({
  ...(o?.fontSize!==undefined?{fontSize:o.fontSize}:{}),
  ...(o?.textColor!==undefined?{color:o.textColor}:{}),
  ...(o?.fontWeight!==undefined?{fontWeight:o.fontWeight}:{}),
  ...(o?.fontStyle!==undefined?{fontStyle:o.fontStyle}:{}),
  ...(o?.fontFamily&&o.fontFamily!=='system'?{fontFamily:o.fontFamily}:{}),
  ...(o?.letterSpacing!==undefined?{letterSpacing:o.letterSpacing}:{}),
  ...(o?.lineHeight!==undefined&&o.lineHeight>0?{lineHeight:o.lineHeight}:{}),
  ...(o?.align!==undefined?{textAlign:o.align}:{}),
});
/** Select inside the real JSX tree, but never invoke a form, refresh, navigation or financial action. */
export function selectCardContentPreview(node:ReactNode,onSelect:(item:Item)=>void,
  selectedId:string|null,overrides:Readonly<Record<string,TargetOverride>>,path='root'):ReactNode{
  return Children.map(node,(child,index)=>{
    if(!isValidElement(child))return child;
    const element=child as E,p=element.props;
    const next=(path+'/'+(child.key!==null?String(child.key):String(index))).slice(0,120);
    const target=contentItem(element,next);
    if(target){
      const isText=element.type===EditableText||element.type===NativeText;
      const isInput=element.type===EditableInput||element.type===NativeInput;
      const childProps:P={...(isText?{editorSkip:true,style:[p.style,typography(overrides[target.id])]}:
        isInput?{editorSkip:true,editable:false,showSoftInputOnFocus:false}:
        {editorSkip:true,disabled:true,onPress:undefined,onLongPress:undefined}),
        ...(element.type===MetricTile&&overrides[target.id]?{editorStyle:overrides[target.id]}:{})};
      const safe=cloneElement(element,{...childProps,...(p.children!==undefined&&!isText?{
        children:selectCardContentPreview(p.children,onSelect,selectedId,overrides,next)}:{})});
      return <Pressable accessibilityRole="button" accessibilityLabel={'編輯'+target.label}
        onPress={()=>onSelect(target)} style={[{alignSelf:'stretch',minWidth:1},
          selectedId===target.id?{borderWidth:2,borderColor:'#0969DA',borderRadius:6}:undefined]}>
        <View pointerEvents="none">{safe}</View>
      </Pressable>;
    }
    if(element.type===AiQuestionBox||element.type===NativePressable||element.type===EditablePressable)
      return <View pointerEvents="none">{element}</View>;
    if(p.children!==undefined)return cloneElement(element,{children:selectCardContentPreview(p.children,onSelect,selectedId,overrides,next)});
    if(typeof child.type==='function')return <View pointerEvents="none">{element}</View>;
    return element;
  });
}
