import {Children,cloneElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {Pressable,Text as NativeText,TextInput as NativeInput,Pressable as NativePressable,View,type TextStyle} from 'react-native';
import type {LayoutSelectionTarget} from '../editor/LayoutSelectionContext';
import type {TargetOverride} from '../maintenance/inspectionModel';
import {Text as EditableText,TextInput as EditableInput,Pressable as EditablePressable,plainText} from './EditableNative';
import {MetricTile} from './MetricTile';
import {AiQuestionBox} from './AiQuestionBox';
type Item=LayoutSelectionTarget;
type P={children?:ReactNode;editorId?:string;editorReadOnly?:boolean;editorSkip?:boolean;label?:string;
  accessibilityLabel?:string;style?:unknown;onPress?:(()=>void)|undefined;onLongPress?:(()=>void)|undefined;disabled?:boolean;
  editable?:boolean;showSoftInputOnFocus?:boolean;editorStyle?:TargetOverride};
type E=ReactElement<P>;
/** Only collect display copy from native text descendants; do not infer hidden business data. */
const textCopy=(node:ReactNode):string=>{
  if(typeof node==='string'||typeof node==='number')return String(node);
  if(Array.isArray(node))return node.map(textCopy).join('');
  if(isValidElement(node)){
    const element=node as E;
    return (element.type===EditableText||element.type===NativeText)?textCopy(element.props.children):'';
  }
  return '';
};
/** A copy target is editable only when every leaf is literal text, including
 * nested native Text spans. Numbers and other dynamic children stay read-only. */
const staticTextCopy=(node:ReactNode):string|null=>{
  if(typeof node==='string')return node;
  if(Array.isArray(node)){
    let copy='';
    for(const part of node){const value=staticTextCopy(part);if(value===null)return null;copy+=value;}
    return copy;
  }
  if(isValidElement(node)){
    const element=node as E;
    if((element.type===EditableText||element.type===NativeText)&&element.props.editorReadOnly!==true)
      return staticTextCopy(element.props.children);
  }
  return null;
};
const hash=(value:string)=>{let h=2166136261;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(36);};
/** Match persisted IDs chosen by the production PageEditorStack / EditableNative renderer. */
export function contentItem(element:E,path:string):Item|null{
  const p=element.props;
  if(element.type===MetricTile&&typeof p.label==='string')return {id:'metric:'+p.label,kind:'card',label:'指標 · '+p.label};
  if(element.type===EditableText||element.type===NativeText){
    const value=textCopy(p.children)||null;
    if(value&&value.trim().length>=2){
      const protectedValue=p.editorReadOnly===true||staticTextCopy(p.children)===null||
        /^[+-]?[\d,.]+%?$/.test(value.trim());
      return {id:'text:'+path,kind:protectedValue?'value':'text',
        label:(protectedValue?'數值':'文字')+' · '+value.slice(0,22)};
    }
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
    // Buttons are containers too: their visible captions need independent edit targets.
    if(el.props.children!==undefined&&(!item||item.kind==='button'))traverse(el.props.children,next,visit);
  });
}
export function listCardContentItems(content:ReactNode,path='root'):Item[]{
  const out:Item[]=[],seen=new Set<string>();
  traverse(content,path,item=>{if(!seen.has(item.id)){seen.add(item.id);out.push(item);}});
  return out;
}
export function readCardStaticText(content:ReactNode,id:string,path='root'):string|null{
  let found:string|null=null;
  const visit=(node:ReactNode,at:string):void=>{
    Children.forEach(node,(child,index)=>{
      if(!isValidElement(child))return;
      const element=child as E,next=(at+'/'+(child.key!==null?String(child.key):String(index))).slice(0,120);
      const item=contentItem(element,next);
      if(item?.id===id&&item.kind==='text'&&element.props.editorReadOnly!==true)
        found=staticTextCopy(element.props.children);
      if(element.props.children!==undefined)visit(element.props.children,next);
    });
  };
  visit(content,path);
  return found;
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
  ...(o?.textOpacity!==undefined?{opacity:o.textOpacity}:{}),
});
const surfaceVisual=(o:TargetOverride|undefined)=>({
  ...(o?.backgroundColor!==undefined?{backgroundColor:o.backgroundColor}:{}),
  ...(o?.borderColor!==undefined?{borderColor:o.borderColor}:{}),
  ...(o?.borderWidth!==undefined?{borderWidth:o.borderWidth}:{}),
  ...(o?.borderRadius!==undefined?{borderRadius:o.borderRadius}:{}),
  ...(o?.padding!==undefined?{padding:o.padding}:{}),
  ...(o?.width!==undefined?{width:o.width}:{}),
  ...(o?.height!==undefined?{height:o.height}:{}),
  ...(o?.opacity!==undefined?{opacity:o.opacity}:{}),
});
/** Actual screen consumes the same saved target IDs as the editor preview.
 * Leaf values and action handlers are never rewritten. */
export function applyCardContentAppearance(content:ReactNode,overrides:Readonly<Record<string,TargetOverride>>,path='root'):ReactNode{
  return Children.map(content,(child,index)=>{
    if(!isValidElement(child))return child;
    const element=child as E,p=element.props;
    const next=(path+'/'+(child.key!==null?String(child.key):String(index))).slice(0,120);
    const item=contentItem(element,next),override=item?overrides[item.id]:undefined;
    const isText=element.type===EditableText||element.type===NativeText;
    const isMetric=element.type===MetricTile;
    const contentProps:P={
      ...(override?{style:[p.style,isText?typography(override):surfaceVisual(override)]}:{}),
      ...(override&&isMetric?{editorStyle:{...p.editorStyle,...override}}:{}),
      ...(override&&isText&&item?.kind==='text'&&p.editorReadOnly!==true&&
         staticTextCopy(p.children)!==null&&override.labelText?{children:override.labelText}:{})
    };
    const children=contentProps.children!==undefined?contentProps.children:
      p.children!==undefined?(isValidElement(p.children)||Array.isArray(p.children)?
        applyCardContentAppearance(p.children,overrides,next):p.children):undefined;
    return cloneElement(element,{...contentProps,...(children!==undefined?{children}:{})});
  });
}

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
      const childProps:P={...(isText?{editorSkip:true,style:[p.style,typography(overrides[target.id])],
        ...(target.kind==='text'&&p.editorReadOnly!==true&&staticTextCopy(p.children)!==null&&overrides[target.id]?.labelText?
          {children:overrides[target.id]!.labelText}:{})}:
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
