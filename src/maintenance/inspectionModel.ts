import type {TextStyle} from 'react-native';
import type {MainPageKey} from '../domain/pageRegistry';
import type {FrameEditorConfig,PageDisplayConfig} from '../editor/editorModel';
import type {FinancialTone,TargetGeometry,SpatialOffset} from './workspaceModel';

// Read-only live snapshot comes from the *rendered App*, not a shadow mock.
export type TargetKind='metric'|'text'|'value'|'action'|'quote-card'|'wall'|'portfolio-list'|'control'|'generic'|'prefix';
export type TargetProperty=Readonly<{name:string;value:string;readOnly?:boolean}>;
export type TargetAppearance=Readonly<{
  visible:boolean;fontSize:number;labelFontSize:number;captionFontSize:number;
  textColor:string;labelColor:string;captionColor:string;backgroundColor:string;borderColor:string;
  // Each color source is independent. Legacy useProfitColor is kept for V3.0.2 saved overrides.
  textProfitColor?:boolean;labelProfitColor?:boolean;captionProfitColor?:boolean;
  backgroundProfitColor?:boolean;borderProfitColor?:boolean;
  profitToneOverride?:'auto'|FinancialTone;
  borderWidth:number;borderRadius:number;padding:number;opacity:number;backgroundOpacity:number;
  fontWeight:TextStyle['fontWeight'];fontFamily:'system'|'sans-serif'|'sans-serif-condensed'|'serif'|'monospace';
  fontStyle:'normal'|'italic';textDecorationLine:'none'|'underline'|'line-through'|'underline line-through';
  labelFontWeight:TextStyle['fontWeight'];captionFontWeight:TextStyle['fontWeight'];
  labelFontStyle:'normal'|'italic';captionFontStyle:'normal'|'italic';
  labelLetterSpacing:number;captionLetterSpacing:number;labelLineHeight:number;captionLineHeight:number;
  letterSpacing:number;lineHeight:number;prefixText:string;prefixGap:number;prefixOffsetY:number;
  align:'left'|'center'|'right';useProfitColor:boolean;
  labelText:string;captionText:string;
}> & SpatialOffset;
export type TargetOverride=Partial<TargetAppearance>;
export type InspectedTarget=Readonly<{
  id:string;page:MainPageKey;frameKey:string;frameTitle:string;
  kind:TargetKind;label:string;properties:readonly TargetProperty[];
  base:TargetAppearance;geometry?:TargetGeometry;profitTone?:FinancialTone;
}>;
export type FrameMaintenanceContext=Readonly<{
  page:MainPageKey;frameKey:string;frameTitle:string;
  frameConfig:FrameEditorConfig;displayConfig:PageDisplayConfig;
}>;
const hex=(v:unknown):v is string=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
const clamp=(n:unknown,min:number,max:number,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
export const TARGET_APPEARANCE:TargetAppearance={
  visible:true,fontSize:17,labelFontSize:11,captionFontSize:10,textColor:'#0F172A',labelColor:'#64748B',captionColor:'#64748B',
  backgroundColor:'#F4ECFF',borderColor:'#DDD1EF',borderWidth:0,borderRadius:12,padding:10,
  opacity:1,backgroundOpacity:1,align:'left',useProfitColor:true,labelText:'',captionText:'',
  fontWeight:'normal',fontFamily:'system',fontStyle:'normal',textDecorationLine:'none',letterSpacing:0,lineHeight:0,
  labelFontWeight:'700',captionFontWeight:'normal',labelFontStyle:'normal',captionFontStyle:'normal',
  labelLetterSpacing:0,captionLetterSpacing:0,labelLineHeight:0,captionLineHeight:0,
  prefixText:'',prefixGap:8,prefixOffsetY:0,
};
export const mergeTargetAppearance=(base:TargetAppearance,custom?:TargetOverride):TargetAppearance=>({...base,...(custom??{})});
export function normalizeTargetOverride(raw:unknown):TargetOverride {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  const v=raw as Record<string,unknown>,o:Record<string,unknown>={};
  for(const [field,min,max] of [['fontSize',8,48],['labelFontSize',8,32],['captionFontSize',8,30],['borderWidth',0,8],['borderRadius',0,48],['padding',0,32],['opacity',0,1],['backgroundOpacity',0,1],['offsetX',-5000,5000],['offsetY',-5000,5000],['width',28,2400],['height',24,2400],['anchorBaseWidth',0,2400],['anchorBaseHeight',0,2400],['letterSpacing',-4,16],['lineHeight',0,96],['prefixGap',0,48],['prefixOffsetY',-24,24],['labelLetterSpacing',-4,16],['captionLetterSpacing',-4,16],['labelLineHeight',0,96],['captionLineHeight',0,96]] as const){
    if(typeof v[field]==='number'&&Number.isFinite(v[field]))o[field]=clamp(v[field],min,max,min);
  }
  for(const field of ['textColor','labelColor','captionColor','backgroundColor','borderColor'] as const)
    if(hex(v[field]))o[field]=v[field].toUpperCase();
  for(const field of ['visible','useProfitColor','textProfitColor','labelProfitColor','captionProfitColor','backgroundProfitColor','borderProfitColor'] as const)
    if(typeof v[field]==='boolean')o[field]=v[field];
  for(const field of ['fontWeight','labelFontWeight','captionFontWeight'] as const)
    if(v[field]==='normal'||v[field]==='bold'||['100','200','300','400','500','600','700','800','900'].includes(String(v[field])))o[field]=v[field];
  for(const field of ['fontStyle','labelFontStyle','captionFontStyle'] as const)
    if(v[field]==='normal'||v[field]==='italic')o[field]=v[field];
  if(['system','sans-serif','sans-serif-condensed','serif','monospace'].includes(String(v.fontFamily)))o.fontFamily=v.fontFamily;
  if(v.textDecorationLine==='none'||v.textDecorationLine==='underline'||v.textDecorationLine==='line-through'||v.textDecorationLine==='underline line-through')o.textDecorationLine=v.textDecorationLine;
  if(v.align==='left'||v.align==='right'||v.align==='center')o.align=v.align;
  if(v.anchorX==='free'||v.anchorX==='left'||v.anchorX==='center'||v.anchorX==='right')o.anchorX=v.anchorX;
  if(v.anchorY==='free'||v.anchorY==='top'||v.anchorY==='center'||v.anchorY==='bottom')o.anchorY=v.anchorY;
  if(v.profitToneOverride==='auto'||v.profitToneOverride==='gain'||v.profitToneOverride==='loss'||v.profitToneOverride==='neutral')o.profitToneOverride=v.profitToneOverride;
  for(const field of ['labelText','captionText','prefixText'] as const)
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
  if(['target:offsetX','target:offsetY','target:xy','target:dimensions','target:anchors','target:width','target:height','target:anchorX','target:anchorY','target:backgroundProfitColor','target:borderProfitColor'].includes(field))return true;
  if(field==='target:profitToneOverride')return true;
  if(['target:prefixText','target:prefixGap','target:prefixOffsetY'].includes(field))return kind==='prefix';
  if(field==='target:fontFamily')return ['text','value','prefix','metric'].includes(kind);
  if(['target:labelFontWeight','target:captionFontWeight','target:labelFontStyle','target:captionFontStyle','target:labelLetterSpacing','target:captionLetterSpacing','target:labelLineHeight','target:captionLineHeight'].includes(field))return kind==='metric';
  if(['target:fontWeight','target:fontStyle','target:textDecorationLine','target:letterSpacing','target:lineHeight'].includes(field))return ['text','value','prefix','metric'].includes(kind);
  if(field==='target:textProfitColor')return kind!=='wall'&&kind!=='portfolio-list'&&kind!=='control';
  if(field==='target:labelProfitColor'||field==='target:captionProfitColor'||field==='target:captionColor')return kind==='metric';
  if(field==='target:labelText')return kind==='metric'||kind==='text';
  if(field==='target:captionText')return kind==='metric';
  if(field==='target:labelColor')return kind==='metric'||kind==='text';
  if(field==='target:labelFontSize'||field==='target:captionFontSize')return kind==='metric';
  if(field==='target:useProfitColor')return kind==='metric'||kind==='quote-card';
  if(kind==='wall'||kind==='portfolio-list'||kind==='control'){
    if(field.startsWith('target:'))return ['target:visible','target:opacity','target:padding','target:backgroundColor','target:borderColor','target:borderWidth','target:borderRadius'].includes(field);
  }
  if(field.startsWith('target:'))return kind!=='control'||['target:visible','target:opacity'].includes(field);
  if(field==='page:wall'||field==='page:badges'||field==='page:quoteStyle'||field==='page:holdingLayoutMode')
    return kind==='wall';
  if(field==='page:list')return kind==='portfolio-list';
  return false;
}
