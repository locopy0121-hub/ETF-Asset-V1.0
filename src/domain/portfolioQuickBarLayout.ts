import {colors} from '../theme/tokens';
import {EDITOR_DIMENSION_MIN,EDITOR_DIMENSION_MAX} from '../editor/dimensionPolicy';
/** Four-mode selector display only. No change to mode/sort semantics or accounting. */
export const QUICK_BAR_KEYS=['first','chart','advanced','sort'] as const;
export type QuickBarKey=(typeof QUICK_BAR_KEYS)[number];
export const QUICK_BAR_LABELS:Readonly<Record<QuickBarKey,string>>={
  first:'清單／行情模式',chart:'圖表',advanced:'進階',sort:'排序',
};
export type QuickBarButtonStyle=Readonly<{
  width:number|null;
  height:number|null;
  minHeight:number;
  paddingHorizontal:number;
  paddingVertical:number;
  marginHorizontal:number;
  marginVertical:number;
  borderWidth:number;
  borderRadius:number;
  borderColor:string;
  backgroundColor:string;
  selectedBackgroundColor:string;
  glyphColor:string;
  labelColor:string;
  statusColor:string;
  selectedTextColor:string;
  glyphSize:number;
  glyphLineHeight:number;
  labelSize:number;
  labelLineHeight:number;
  statusSize:number;
  statusLineHeight:number;
  contentGap:number;
}>;
export type QuickBarLayout=Readonly<{
  order:readonly QuickBarKey[];
  columnGap:number;
  rowGap:number;
  paddingHorizontal:number;
  paddingVertical:number;
  marginHorizontal:number;
  marginVertical:number;
  button:QuickBarButtonStyle;
  overrides:Readonly<Partial<Record<QuickBarKey,Partial<QuickBarButtonStyle>>>>;
}>;
export const DEFAULT_QUICK_BAR_BUTTON:QuickBarButtonStyle={
  width:null,height:null,minHeight:76,paddingHorizontal:3,paddingVertical:8,marginHorizontal:0,marginVertical:0,
  borderWidth:1,borderRadius:12,borderColor:colors.border,backgroundColor:colors.surfaceMuted,
  selectedBackgroundColor:colors.primary,glyphColor:colors.primary,labelColor:colors.text,
  statusColor:colors.textSecondary,selectedTextColor:'#FFFFFF',
  glyphSize:26,glyphLineHeight:31,labelSize:12,labelLineHeight:17,
  statusSize:9,statusLineHeight:12,contentGap:3,
};
export const DEFAULT_QUICK_BAR_LAYOUT:QuickBarLayout={
  order:QUICK_BAR_KEYS,columnGap:6,rowGap:6,paddingHorizontal:0,paddingVertical:4,
  marginHorizontal:0,marginVertical:0,button:DEFAULT_QUICK_BAR_BUTTON,overrides:{},
};
const isObject=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const bounded=(raw:unknown,min:number,max:number,defaultValue:number)=>{
  if(typeof raw!=='number'||!Number.isFinite(raw))return defaultValue;
  return Math.max(min,Math.min(max,Math.round(raw)));
};
const color=(raw:unknown,fallback:string)=>typeof raw==='string'&&/^#[0-9a-fA-F]{6}$/.test(raw)?raw.toUpperCase():fallback;
const RANGES:Readonly<Record<keyof QuickBarButtonStyle,readonly [number,number]|null>>={
  width:[EDITOR_DIMENSION_MIN,EDITOR_DIMENSION_MAX],height:[EDITOR_DIMENSION_MIN,EDITOR_DIMENSION_MAX],minHeight:[EDITOR_DIMENSION_MIN,EDITOR_DIMENSION_MAX],
  paddingHorizontal:[0,36],paddingVertical:[0,36],
  marginHorizontal:[0,28],marginVertical:[0,28],borderWidth:[0,8],borderRadius:[0,48],
  glyphSize:[12,52],glyphLineHeight:[12,72],labelSize:[8,34],labelLineHeight:[8,48],
  statusSize:[8,28],statusLineHeight:[8,40],contentGap:[0,30],
  borderColor:null,backgroundColor:null,selectedBackgroundColor:null,glyphColor:null,
  labelColor:null,statusColor:null,selectedTextColor:null,
};
function normalizeButtonPartial(input:unknown,base:QuickBarButtonStyle,partial:boolean):Partial<QuickBarButtonStyle>{
  if(!isObject(input))return partial?{}:base;
  const out:Record<string,unknown>={};
  for(const key of Object.keys(RANGES) as (keyof QuickBarButtonStyle)[]){
    if(!(key in input)){
      if(!partial)out[key]=base[key];
      continue;
    }
    const value=input[key],range=RANGES[key];
    if(key==='width'||key==='height'){
      out[key]=value===null?null:bounded(value,range![0],range![1],base[key]??(key==='width'?100:76));
    }else if(range){
      out[key]=bounded(value,range[0],range[1],base[key] as number);
    }else{
      out[key]=color(value,base[key] as string);
    }
  }
  // Layout must never clip the requested text metrics on smaller Android screens.
  const glyphSize=typeof out.glyphSize==='number'?out.glyphSize:base.glyphSize;
  const labelSize=typeof out.labelSize==='number'?out.labelSize:base.labelSize;
  const statusSize=typeof out.statusSize==='number'?out.statusSize:base.statusSize;
  if('glyphLineHeight' in out)out.glyphLineHeight=Math.max(glyphSize,out.glyphLineHeight as number);
  if('labelLineHeight' in out)out.labelLineHeight=Math.max(labelSize,out.labelLineHeight as number);
  if('statusLineHeight' in out)out.statusLineHeight=Math.max(statusSize,out.statusLineHeight as number);
  return out as Partial<QuickBarButtonStyle>;
}
export const normalizeQuickBarButton=(raw:unknown):QuickBarButtonStyle=>{
  const style={...DEFAULT_QUICK_BAR_BUTTON,...normalizeButtonPartial(raw,DEFAULT_QUICK_BAR_BUTTON,false)};
  return {...style,glyphLineHeight:Math.max(style.glyphSize,style.glyphLineHeight),
    labelLineHeight:Math.max(style.labelSize,style.labelLineHeight),
    statusLineHeight:Math.max(style.statusSize,style.statusLineHeight)};
};
export const normalizeQuickBarLayout=(raw:unknown):QuickBarLayout=>{
  const r=isObject(raw)?raw:{};
  const order=Array.isArray(r.order)?r.order.filter((x):x is QuickBarKey=>QUICK_BAR_KEYS.includes(x as QuickBarKey)):[];
  const unique=[...new Set(order)];
  const overrides:Partial<Record<QuickBarKey,Partial<QuickBarButtonStyle>>>={};
  const shared=normalizeQuickBarButton(r.button);
  const rawOverrides=isObject(r.overrides)?r.overrides:{};
  for(const key of QUICK_BAR_KEYS){
    if(isObject(rawOverrides[key]))overrides[key]=normalizeButtonPartial(rawOverrides[key],shared,true);
  }
  return {
    order:[...unique,...QUICK_BAR_KEYS.filter(k=>!unique.includes(k))],
    columnGap:bounded(r.columnGap,0,40,DEFAULT_QUICK_BAR_LAYOUT.columnGap),
    rowGap:bounded(r.rowGap,0,40,DEFAULT_QUICK_BAR_LAYOUT.rowGap),
    paddingHorizontal:bounded(r.paddingHorizontal,0,40,0),
    paddingVertical:bounded(r.paddingVertical,0,40,4),
    marginHorizontal:bounded(r.marginHorizontal,0,40,0),
    marginVertical:bounded(r.marginVertical,0,40,0),
    button:shared,overrides,
  };
};
export const resolveQuickBarButton=(layout:QuickBarLayout,key:QuickBarKey):QuickBarButtonStyle=>
  normalizeQuickBarButton({...layout.button,...layout.overrides[key]});
export const moveQuickBarButton=(layout:QuickBarLayout,key:QuickBarKey,delta:-1|1):QuickBarLayout=>{
  const order=[...layout.order],index=order.indexOf(key),target=index+delta;
  if(index<0||target<0||target>=order.length)return layout;
  [order[index],order[target]]=[order[target]!,order[index]!];
  return {...layout,order};
};
