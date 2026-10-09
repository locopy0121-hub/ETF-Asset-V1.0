import {createContext,useContext,type ComponentProps,type ReactNode} from 'react';
import {Text as NativeText,TextInput as NativeTextInput,Pressable as NativePressable,StyleSheet,type TextStyle,type ViewStyle} from 'react-native';
import {useEditingFrame} from '../editor/FrameEditingContext';
import {InspectableTarget} from '../maintenance/InspectableTarget';
import {TARGET_APPEARANCE,type InspectedTarget,type TargetAppearance,type TargetOverride} from '../maintenance/inspectionModel';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {colorWithAlpha} from '../maintenance/frameEffects';
import {scaledFontSize} from '../settings/displayFormat';
import {dividendControlVisual,dividendTargetId,dividendTextVisual} from '../editor/dividendPageLayout';

type Meta={editorId?:string;editorReadOnly?:boolean;editorSkip?:boolean};
const NestedText=createContext(false);
function labelKey(value:string):string{
  let hash=2166136261;
  for(const letter of value){hash=Math.imul(hash^letter.charCodeAt(0),16777619);}
  return (hash>>>0).toString(36);
}
const parentKeys=['flex','flexGrow','flexShrink','flexBasis','alignSelf','width','height','minWidth','maxWidth','minHeight','maxHeight','position','top','left','right','bottom','start','end','margin','marginTop','marginRight','marginBottom','marginLeft','marginStart','marginEnd','marginHorizontal','marginVertical','zIndex','aspectRatio'] as const;
function parentLayout(raw:ViewStyle|undefined):ViewStyle{
  return Object.fromEntries(parentKeys.filter(key=>raw?.[key]!==undefined).map(key=>[key,raw![key]]));
}
function clearParentLayout(raw:ViewStyle|undefined,wrapped:boolean|undefined):ViewStyle{
  if(!wrapped)return {};
  return Object.fromEntries(parentKeys.filter(key=>raw?.[key]!==undefined&&!['minWidth','maxWidth','minHeight','maxHeight'].includes(key))
    .map(key=>[key,key==='width'||key==='height'?'100%':undefined]));
}
function clearOwnedSurface(o:TargetOverride):TextStyle{
  return {
    ...(o.backgroundColor!==undefined||o.backgroundOpacity!==undefined||o.backgroundProfitColor!==undefined||o.backgroundMode!==undefined?{backgroundColor:'transparent'}:{}),
    ...(o.borderWidth!==undefined||o.borderColor!==undefined||o.borderProfitColor!==undefined?{borderWidth:0}:{}),
    ...(o.padding!==undefined?{padding:0,paddingHorizontal:0,paddingVertical:0}:{}),
  };
}
export function plainText(value:ReactNode):string{
  if(typeof value==='string'||typeof value==='number')return String(value);
  if(Array.isArray(value))return value.map(plainText).join('');
  return '';
}
function typography(style:TextStyle|undefined,a:TargetAppearance,o:TargetOverride):TextStyle{
  return {
    ...(o.textColor!==undefined||o.textProfitColor!==undefined||o.textOpacity!==undefined?{color:o.textOpacity!==undefined?colorWithAlpha(a.textColor,a.textOpacity):a.textColor}:{}),
    ...(o.fontWeight!==undefined?{fontWeight:a.fontWeight}:{}),
    ...(o.fontStyle!==undefined?{fontStyle:a.fontStyle}:{}),
    ...(o.fontFamily!==undefined?{fontFamily:a.fontFamily==='system'?undefined:a.fontFamily}:{}),
    ...(o.textDecorationLine!==undefined?{textDecorationLine:a.textDecorationLine}:{}),
    ...(o.letterSpacing!==undefined?{letterSpacing:a.letterSpacing}:{}),
    ...(o.lineHeight!==undefined&&a.lineHeight>0?{lineHeight:a.lineHeight}:{}),
    ...(o.align!==undefined?{textAlign:a.align}:{}),
  };
}
export function Text({editorId,editorReadOnly=true,editorSkip=false,style,children,...props}:ComponentProps<typeof NativeText>&Meta){
  const frame=useEditingFrame(),nested=useContext(NestedText);
  const dividendOverride=frame?.page==='dividend'&&editorId?frame.displayConfig.layoutTargets?.[dividendTargetId(editorId)]:undefined;
  const {prefs}=useSettingsRuntime();
  const raw=StyleSheet.flatten(style) as TextStyle|undefined;
  const size=raw?.fontSize??14;
  const render=(a?:TargetAppearance,o:TargetOverride={},wrapped=false)=><NestedText.Provider value={true}>
    <NativeText {...props} style={[style,{
      fontSize:scaledFontSize(o.fontSize!==undefined&&a?a.fontSize:size,prefs.display),
      ...(raw?.lineHeight!==undefined?{lineHeight:scaledFontSize(raw.lineHeight,prefs.display)}:{}),
    },a&&typography(raw,a,o),a&&o.lineHeight!==undefined&&a.lineHeight>0?{lineHeight:scaledFontSize(a.lineHeight,prefs.display)}:undefined,clearOwnedSurface(o),clearParentLayout(raw,wrapped),dividendTextVisual(dividendOverride)]}>
      {!editorReadOnly&&a&&o.labelText!==undefined?a.labelText:children}
    </NativeText>
  </NestedText.Provider>;
  if(!frame||!editorId||editorSkip||nested)return render();
  const target:InspectedTarget={id:editorReadOnly?editorId:editorId+':'+labelKey(plainText(children)),page:frame.page,frameKey:frame.frameKey,frameTitle:frame.frameTitle,
    kind:editorReadOnly?'value':'text',label:editorId.split(':').slice(-2).join(' · '),
    properties:[{name:'套用範圍',value:'此元件欄位，所有清單列共用外觀',readOnly:true},
      {name:'資料保護',value:editorReadOnly?'原始資料唯讀，僅修改顯示':'靜態標籤可編輯',readOnly:true}],
    base:{...TARGET_APPEARANCE,fontSize:size,fontWeight:raw?.fontWeight??'normal',
      textColor:typeof raw?.color==='string'?raw.color:'#0F172A',backgroundOpacity:0,padding:0,borderWidth:0,
      align:raw?.textAlign==='center'||raw?.textAlign==='right'?raw.textAlign:'left'}};
  return <InspectableTarget frame={frame} target={target} layoutStyle={parentLayout(raw)}>{(a,_custom,o,context)=>render(a,o,context.wrapped)}</InspectableTarget>;
}
export function TextInput({editorId,editorReadOnly:_readOnly,editorSkip:_skip,style,...props}:ComponentProps<typeof NativeTextInput>&Meta){
  const frame=useEditingFrame();
  const {prefs}=useSettingsRuntime();
  const raw=StyleSheet.flatten(style) as TextStyle|undefined;
  const render=(a?:TargetAppearance,o:TargetOverride={},wrapped=false)=><NativeTextInput {...props} style={[style,
    {fontSize:scaledFontSize(o.fontSize!==undefined&&a?a.fontSize:raw?.fontSize??14,prefs.display)},
    a&&typography(raw,a,o),a&&o.lineHeight!==undefined&&a.lineHeight>0?{lineHeight:scaledFontSize(a.lineHeight,prefs.display)}:undefined,clearOwnedSurface(o),clearParentLayout(raw,wrapped)]}/>;
  if(!frame||!editorId)return render();
  const target:InspectedTarget={id:editorId,page:frame.page,frameKey:frame.frameKey,frameTitle:frame.frameTitle,
    kind:'generic',label:'輸入欄位 · '+editorId.split(':').slice(-1)[0],
    properties:[{name:'輸入內容',value:'維護設定不讀取或改寫輸入內容',readOnly:true}],
    base:{...TARGET_APPEARANCE,fontSize:raw?.fontSize??14,textColor:typeof raw?.color==='string'?raw.color:'#0F172A',backgroundOpacity:0,padding:0,borderWidth:0}};
  return <InspectableTarget frame={frame} target={target} layoutStyle={parentLayout(raw)}>{(a,_custom,o,context)=>render(a,o,context.wrapped)}</InspectableTarget>;
}
export function Pressable({editorId,editorReadOnly:_readOnly,editorSkip:_skip,...props}:ComponentProps<typeof NativePressable>&Meta){
  const frame=useEditingFrame();
  const dividendOverride=frame?.page==='dividend'&&editorId?frame.displayConfig.layoutTargets?.[dividendTargetId(editorId)]:undefined;
  if(!frame||!editorId)return <NativePressable {...props}/>;
  const raw=StyleSheet.flatten(typeof props.style==='function'?props.style({pressed:false}):props.style) as ViewStyle|undefined;
  const target:InspectedTarget={id:editorId,page:frame.page,frameKey:frame.frameKey,frameTitle:frame.frameTitle,
    kind:'control',label:typeof props.accessibilityLabel==='string'?props.accessibilityLabel:editorId.split(':').slice(-2).join(' · '),
    properties:[{name:'業務動作',value:'維護設定只調整外觀，保留原動作與禁用狀態',readOnly:true}],
    base:{...TARGET_APPEARANCE,backgroundOpacity:0,padding:0,borderWidth:0}};
  return <InspectableTarget frame={frame} target={target} layoutStyle={parentLayout(raw)}>{(_a,_custom,o,context)=> <NativePressable {...props}
    style={typeof props.style==='function'?(state=>[typeof props.style==='function'?props.style(state):props.style,clearOwnedSurface(o),clearParentLayout(raw,context.wrapped),dividendControlVisual(dividendOverride)]):[props.style,clearOwnedSurface(o),clearParentLayout(raw,context.wrapped),dividendControlVisual(dividendOverride)]}/>}</InspectableTarget>;
}
