export type EffectLayerType='background'|'shadow'|'glow'|'mask';
export type EffectLayer=Readonly<{
 id:string;type:EffectLayerType;enabled:boolean;color:string;opacity:number;
 blur:number;width:number;offsetX:number;offsetY:number;
}>;
const hex=(v:unknown):v is string=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
const clamp=(v:unknown,min:number,max:number,fallback:number)=>
 typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
export function makeEffectLayer(type:EffectLayerType,id:string):EffectLayer{
 return {id,type,enabled:true,color:type==='shadow'?'#000000':type==='mask'?'#000000':'#A78BFA',
  opacity:type==='shadow'?.22:type==='mask'?.18:.3,blur:8,width:3,offsetX:0,offsetY:2};
}
export function normalizeEffectStack(raw:unknown):readonly EffectLayer[]{
 if(!Array.isArray(raw))return [];
 const seen=new Set<string>(),out:EffectLayer[]=[];
 for(const item of raw.slice(0,6)){
  if(!item||typeof item!=='object'||Array.isArray(item))continue;
  const v=item as Record<string,unknown>;
  const type=['background','shadow','glow','mask'].includes(String(v.type))?v.type as EffectLayerType:null;
  const id=typeof v.id==='string'&&/^[a-z0-9-]{1,40}$/i.test(v.id)?v.id:null;
  if(!type||!id||seen.has(id))continue;seen.add(id);
  const base=makeEffectLayer(type,id);
  out.push({...base,enabled:typeof v.enabled==='boolean'?v.enabled:base.enabled,
   color:hex(v.color)?v.color.toUpperCase():base.color,opacity:clamp(v.opacity,0,.8,base.opacity),
   blur:clamp(v.blur,0,48,base.blur),width:clamp(v.width,0,16,base.width),
   offsetX:clamp(v.offsetX,-24,24,base.offsetX),offsetY:clamp(v.offsetY,-24,24,base.offsetY)});
 }
 return out;
}
export function moveEffectLayer(stack:readonly EffectLayer[],id:string,direction:-1|1):readonly EffectLayer[]{
 const next=[...normalizeEffectStack(stack)],from=next.findIndex(x=>x.id===id);
 if(from<0)return next;const to=Math.max(0,Math.min(next.length-1,from+direction));
 if(to===from)return next;const [item]=next.splice(from,1);next.splice(to,0,item!);return next;
}
