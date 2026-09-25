import type {MainPageKey} from '../domain/pageRegistry';
import type {FrameEditorConfig,PageDisplayConfig} from '../editor/editorModel';

// Read-only live snapshot comes from the *rendered App*, not a shadow mock.
export type TargetKind='metric'|'text'|'quote-card'|'wall'|'portfolio-list'|'control'|'generic';
export type TargetProperty=Readonly<{name:string;value:string;readOnly?:boolean}>;
export type TargetAppearance=Readonly<{
  visible:boolean;fontSize:number;labelFontSize:number;captionFontSize:number;
  textColor:string;labelColor:string;backgroundColor:string;borderColor:string;
  borderWidth:number;borderRadius:number;padding:number;opacity:number;
  align:'left'|'center'|'right';useProfitColor:boolean;
  labelText:string;captionText:string;
}>;
export type TargetOverride=Partial<TargetAppearance>;
export type InspectedTarget=Readonly<{
  id:string;page:MainPageKey;frameKey:string;frameTitle:string;
  kind:TargetKind;label:string;properties:readonly TargetProperty[];
  base:TargetAppearance;
}>;
export type FrameMaintenanceContext=Readonly<{
  page:MainPageKey;frameKey:string;frameTitle:string;
  frameConfig:FrameEditorConfig;displayConfig:PageDisplayConfig;
}>;
const hex=(v:unknown):v is string=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
const clamp=(n:unknown,min:number,max:number,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
export const TARGET_APPEARANCE:TargetAppearance={
  visible:true,fontSize:17,labelFontSize:11,captionFontSize:10,textColor:'#0F172A',labelColor:'#64748B',
  backgroundColor:'#F4ECFF',borderColor:'#DDD1EF',borderWidth:0,borderRadius:12,padding:10,
  opacity:1,align:'left',useProfitColor:true,labelText:'',captionText:'',
};
export const mergeTargetAppearance=(base:TargetAppearance,custom?:TargetOverride):TargetAppearance=>({...base,...(custom??{})});
export function normalizeTargetOverride(raw:unknown):TargetOverride {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  const v=raw as Record<string,unknown>,o:Record<string,unknown>={};
  for(const [field,min,max] of [['fontSize',8,48],['labelFontSize',8,32],['captionFontSize',8,30],['borderWidth',0,8],['borderRadius',0,48],['padding',0,32],['opacity',0,1]] as const){
    if(typeof v[field]==='number'&&Number.isFinite(v[field]))o[field]=clamp(v[field],min,max,min);
  }
  for(const field of ['textColor','labelColor','backgroundColor','borderColor'] as const)
    if(hex(v[field]))o[field]=v[field].toUpperCase();
  for(const field of ['visible','useProfitColor'] as const)
    if(typeof v[field]==='boolean')o[field]=v[field];
  if(v.align==='left'||v.align==='right'||v.align==='center')o.align=v.align;
  for(const field of ['labelText','captionText'] as const)
    if(typeof v[field]==='string')o[field]=v[field].slice(0,120);
  return o as TargetOverride;
}
export function normalizeTargetMap(raw:unknown):Record<string,Record<string,TargetOverride>> {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  return Object.fromEntries(Object.entries(raw as Record<string,unknown>)
    .filter(([frameId,value])=>/^(home|ledger|portfolio|dividend|ai):[a-z0-9-]+$/.test(frameId)
      &&value&&typeof value==='object'&&!Array.isArray(value))
    .map(([frameId,value])=>[frameId,Object.fromEntries(Object.entries(value as Record<string,unknown>)
      .filter(([id])=>id.length>0&&id.length<=150)
      .slice(0,120)
      .map(([id,override])=>[id,normalizeTargetOverride(override)]))]));
}
export function targetToolSupported(kind:TargetKind,field:string):boolean {
  if(field==='target:labelText')return kind==='metric'||kind==='text';
  if(field==='target:captionText')return kind==='metric';
  if(field==='target:labelFontSize'||field==='target:captionFontSize')return kind==='metric';
  if(field==='target:useProfitColor')return kind==='metric'||kind==='quote-card';
  if(field.startsWith('target:'))return kind!=='control'||['target:visible','target:opacity'].includes(field);
  if(field==='page:wall'||field==='page:badges'||field==='page:quoteStyle'||field==='page:holdingLayoutMode')
    return kind==='wall'||kind==='quote-card';
  if(field==='page:list')return kind==='portfolio-list';
  return false;
}
