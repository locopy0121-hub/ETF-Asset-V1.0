import {normalizeTargetOverride,targetToolSupported,type TargetAppearance,type TargetKind,type TargetOverride} from './inspectionModel';
import {normalizeFrameEffects,type FrameEffects} from './frameEffects';
import type {FrameEditorConfig} from '../editor/editorModel';

// An independent visual-only library. No transaction, quote, amount, tax, cash,
// label text, navigation action, identity or coordinates can enter a token.
export const ENGINEER_ASSETS_STORAGE_KEY='@tf-asset/maintenance-engineer-assets-v318';
export const DESIGN_TOKEN_FIELDS=[
 'fontSize','fontWeight','textColor','labelColor','backgroundColor','backgroundOpacity',
 'textProfitColor','labelProfitColor','backgroundProfitColor','borderColor','borderProfitColor',
 'borderWidth','borderRadius','padding','backgroundMode','gradientDirection',
 'gradientEndColor','gradientEndProfitColor','gradientMidEnabled','gradientMidColor',
 'gradientMidProfitColor','gradientMidStop','shadowEnabled','shadowColor',
 'shadowProfitColor','shadowOpacity','shadowBlur','glowEnabled','glowColor',
 'glowProfitColor','glowOpacity','glowWidth','marginVertical',
] as const satisfies readonly (keyof TargetAppearance)[];
export type TokenField=typeof DESIGN_TOKEN_FIELDS[number];
export type DesignToken=Readonly<{
 slot:1|2|3|4|5;name:string;style:Readonly<Partial<Pick<TargetAppearance,TokenField>>>;
 // Frame-only animation timing is never applied to arbitrary native targets.
 glowPeriodMs?:number;
}>;
export type EngineerAssets=Readonly<{
 schema:1;tokens:readonly DesignToken[];favorites:readonly string[];recent:readonly string[];
}>;
export const EMPTY_ENGINEER_ASSETS:EngineerAssets={schema:1,tokens:[],favorites:[],recent:[]};
const allowedSlots=[1,2,3,4,5] as const;
const onlyTokenFields=(source:Record<string,unknown>)=>
 Object.fromEntries(DESIGN_TOKEN_FIELDS.filter(key=>source[key]!==undefined).map(key=>[key,source[key]]));
export function tokenStyle(source:Readonly<Record<string,unknown>>):DesignToken['style']{
 return Object.fromEntries(Object.entries(normalizeTargetOverride(onlyTokenFields({...source})))
   .filter(([field])=>DESIGN_TOKEN_FIELDS.includes(field as TokenField))) as DesignToken['style'];
}
export function makeDesignToken(slot:number,name:string,source:Readonly<Record<string,unknown>>):DesignToken|null{
 if(!allowedSlots.some(value=>value===slot))return null;
 const clean=typeof name==='string'?name.trim().slice(0,24):'';
 const style=tokenStyle(source);
 if(!clean||!Object.keys(style).length)return null;
 const period=source.glowPeriodMs;
 return {slot:slot as DesignToken['slot'],name:clean,style,
   ...(typeof period==='number'&&Number.isFinite(period)?{glowPeriodMs:Math.max(800,Math.min(4000,Math.round(period)))}:{})};
}
export function normalizeEngineerAssets(raw:unknown,knownTools:readonly string[]):EngineerAssets{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return EMPTY_ENGINEER_ASSETS;
 const data=raw as Record<string,unknown>,allowed=new Set(knownTools);
 const tokens=Array.isArray(data.tokens)?data.tokens.flatMap(rawToken=>{
   if(!rawToken||typeof rawToken!=='object'||Array.isArray(rawToken))return [];
   const t=rawToken as Record<string,unknown>;
   const token=makeDesignToken(Number(t.slot),String(t.name??''),t.style&&typeof t.style==='object'&&!Array.isArray(t.style)?
     {...t.style as Record<string,unknown>,glowPeriodMs:t.glowPeriodMs}:{});return token?[token]:[];
 }):[];
 const valid=(input:unknown,max:number)=>Array.isArray(input)?
   [...new Set(input.filter((id):id is string=>typeof id==='string'&&allowed.has(id)))].slice(0,max):[];
 return {schema:1,tokens:[...new Map(tokens.map(t=>[t.slot,t])).values()].slice(0,5),
   favorites:valid(data.favorites,40),recent:valid(data.recent,10)};
}
export function replaceToken(assets:EngineerAssets,token:DesignToken):EngineerAssets{
 return {...assets,tokens:[...assets.tokens.filter(t=>t.slot!==token.slot),token]
   .sort((a,b)=>a.slot-b.slot).slice(0,5)};
}
export const removeToken=(assets:EngineerAssets,slot:number):EngineerAssets=>
 ({...assets,tokens:assets.tokens.filter(t=>t.slot!==slot)});
export function toggleFavorite(assets:EngineerAssets,id:string,allowed:readonly string[]):EngineerAssets{
 if(!allowed.includes(id))return assets;
 return {...assets,favorites:assets.favorites.includes(id)?
   assets.favorites.filter(item=>item!==id):[...assets.favorites,id].slice(0,40)};
}
export function trackRecent(assets:EngineerAssets,id:string,allowed:readonly string[]):EngineerAssets{
 if(!allowed.includes(id))return assets;
 return {...assets,recent:[id,...assets.recent.filter(item=>item!==id)].slice(0,10)};
}
export function tokenTargetPatch(token:DesignToken,kind:TargetKind):TargetOverride{
 const supported=Object.fromEntries(Object.entries(token.style).filter(([key])=>
   targetToolSupported(kind,'target:'+key)));
 return normalizeTargetOverride(supported);
}
export function frameTokenSource(frame:FrameEditorConfig):Record<string,unknown>{
 const fx=normalizeFrameEffects(frame.effects);
 return {fontSize:frame.titleFontSize,textColor:frame.titleColor,
  textProfitColor:frame.titleProfitColor??false,backgroundColor:frame.backgroundColor,
  backgroundProfitColor:frame.backgroundProfitColor??false,
  backgroundOpacity:frame.backgroundOpacity,borderColor:frame.borderColor,
  borderProfitColor:frame.borderProfitColor??false,borderWidth:frame.borderWidth,
  borderRadius:frame.borderRadius,padding:frame.padding??16,
  shadowEnabled:frame.shadowEnabled,shadowOpacity:frame.shadowOpacity,
  backgroundMode:fx.backgroundMode==='gradient'?'gradient':'solid',
  gradientDirection:fx.gradientDirection,gradientEndColor:fx.gradientEndColor,
  gradientEndProfitColor:fx.gradientEndProfitColor,gradientMidEnabled:fx.gradientMidEnabled,
  gradientMidColor:fx.gradientMidColor,gradientMidProfitColor:fx.gradientMidProfitColor,
  gradientMidStop:fx.gradientMidStop,shadowColor:fx.shadowColor,
  shadowProfitColor:fx.shadowProfitColor,shadowBlur:fx.shadowBlur,
  glowEnabled:fx.glowEnabled,glowColor:fx.glowColor,
  glowProfitColor:fx.glowProfitColor,glowOpacity:fx.glowOpacity,
  glowWidth:fx.glowWidth,marginVertical:fx.marginVertical,glowPeriodMs:fx.glowPeriodMs};
}
export function frameTokenPatch(token:DesignToken,current:FrameEditorConfig):Partial<FrameEditorConfig>{
 const s=token.style;const patch:Record<string,unknown>={};
 const direct:Record<string,string>={
  fontSize:'titleFontSize',textColor:'titleColor',textProfitColor:'titleProfitColor',
  backgroundColor:'backgroundColor',backgroundProfitColor:'backgroundProfitColor',
  backgroundOpacity:'backgroundOpacity',borderColor:'borderColor',
  borderProfitColor:'borderProfitColor',borderWidth:'borderWidth',
  borderRadius:'borderRadius',padding:'padding',shadowEnabled:'shadowEnabled',
  shadowOpacity:'shadowOpacity'};
 for(const [source,dest] of Object.entries(direct))
   if(s[source as TokenField]!==undefined)patch[dest]=s[source as TokenField];
 const fx=normalizeFrameEffects(current.effects);
 const fxPatch:Record<string,unknown>={};
 const effects=['backgroundMode','gradientDirection','gradientEndColor','gradientEndProfitColor',
  'gradientMidEnabled','gradientMidColor','gradientMidProfitColor','gradientMidStop',
  'shadowColor','shadowProfitColor','shadowBlur','glowEnabled','glowColor',
  'glowProfitColor','glowOpacity','glowWidth','marginVertical'] as const;
 for(const key of effects)
   if(s[key]!==undefined)fxPatch[key]=s[key];
 if(token.glowPeriodMs!==undefined)fxPatch.glowPeriodMs=token.glowPeriodMs;
 if(Object.keys(fxPatch).length)patch.effects=normalizeFrameEffects({...fx,...fxPatch});
 return patch as Partial<FrameEditorConfig>;
}
