/** Frame-only display settings. No ledger, market or source-data dependencies. */
export type FrameEffects=Readonly<{
  backgroundMode:'solid'|'gradient';
  gradientEndColor:string;gradientDirection:'horizontal'|'vertical';gradientEndProfitColor:boolean;
  borderStyle:'solid'|'dashed'|'dotted';
  borderTop:number;borderRight:number;borderBottom:number;borderLeft:number;
  cornerTopLeft:number;cornerTopRight:number;cornerBottomRight:number;cornerBottomLeft:number;
  shadowColor:string;shadowProfitColor:boolean;shadowBlur:number;
  shadowOffsetX:number;shadowOffsetY:number;
  glowEnabled:boolean;glowColor:string;glowProfitColor:boolean;glowOpacity:number;
  glowWidth:number;glowPulse:boolean;glowPeriodMs:number;
  paddingTop:number;paddingRight:number;paddingBottom:number;paddingLeft:number;
  contentGap:number;marginVertical:number;maxWidth:number;
}>;
/** -1 means inherit the outer frame's original setting, preserving old page layouts. */
export const DEFAULT_FRAME_EFFECTS:FrameEffects={
  backgroundMode:'solid',gradientEndColor:'#EDE9FE',gradientDirection:'vertical',gradientEndProfitColor:false,
  borderStyle:'solid',borderTop:-1,borderRight:-1,borderBottom:-1,borderLeft:-1,
  cornerTopLeft:-1,cornerTopRight:-1,cornerBottomRight:-1,cornerBottomLeft:-1,
  shadowColor:'#000000',shadowProfitColor:false,shadowBlur:8,shadowOffsetX:0,shadowOffsetY:2,
  glowEnabled:false,glowColor:'#A78BFA',glowProfitColor:false,glowOpacity:.35,glowWidth:3,
  glowPulse:false,glowPeriodMs:1800,
  paddingTop:-1,paddingRight:-1,paddingBottom:-1,paddingLeft:-1,
  contentGap:-1,marginVertical:0,maxWidth:0,
};
const hex=(value:unknown):value is string=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const finite=(v:unknown,min:number,max:number,otherwise:number)=>typeof v==='number'&&Number.isFinite(v)?
  Math.max(min,Math.min(max,v)):otherwise;
export function normalizeFrameEffects(raw:unknown,defaults:FrameEffects=DEFAULT_FRAME_EFFECTS):FrameEffects{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {...defaults};
  const v=raw as Record<string,unknown>;
  const numberRanges:Record<string,readonly [number,number]>={
    borderTop:[-1,8],borderRight:[-1,8],borderBottom:[-1,8],borderLeft:[-1,8],
    cornerTopLeft:[-1,48],cornerTopRight:[-1,48],cornerBottomRight:[-1,48],cornerBottomLeft:[-1,48],
    shadowBlur:[0,48],shadowOffsetX:[-24,24],shadowOffsetY:[-24,24],
    glowOpacity:[0,.8],glowWidth:[0,16],glowPeriodMs:[800,4000],
    paddingTop:[-1,32],paddingRight:[-1,32],paddingBottom:[-1,32],paddingLeft:[-1,32],
    contentGap:[-1,40],marginVertical:[0,32],maxWidth:[0,1600],
  };
  const out:Record<string,unknown>={...defaults};
  for(const [key,[min,max]] of Object.entries(numberRanges)){
    const value=v[key];if(typeof value==='number'&&Number.isFinite(value))
      out[key]=finite(value,min!,max!,defaults[key as keyof FrameEffects] as number);
  }
  for(const key of ['gradientEndColor','shadowColor','glowColor'] as const)
    if(hex(v[key]))out[key]=v[key].toUpperCase();
  for(const key of ['gradientEndProfitColor','shadowProfitColor','glowEnabled','glowProfitColor','glowPulse'] as const)
    if(typeof v[key]==='boolean')out[key]=v[key];
  if(v.backgroundMode==='solid'||v.backgroundMode==='gradient')out.backgroundMode=v.backgroundMode;
  if(v.gradientDirection==='horizontal'||v.gradientDirection==='vertical')out.gradientDirection=v.gradientDirection;
  if(v.borderStyle==='solid'||v.borderStyle==='dashed'||v.borderStyle==='dotted')out.borderStyle=v.borderStyle;
  return out as FrameEffects;
}
export function colorWithAlpha(color:string,alpha:number):string{
  if(!hex(color))return 'rgba(255,255,255,1)';
  const n=parseInt(color.slice(1),16),a=Math.max(0,Math.min(1,alpha));
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a.toFixed(3)+')';
}
export function mixFrameColors(a:string,b:string,at:number):string{
  if(!hex(a)||!hex(b))return '#FFFFFF';
  const fraction=Math.max(0,Math.min(1,at)),v=(n:number)=>Math.round(n).toString(16).padStart(2,'0');
  const color=(pos:number)=>parseInt(a.slice(pos,pos+2),16)*(1-fraction)+parseInt(b.slice(pos,pos+2),16)*fraction;
  return '#'+v(color(1))+v(color(3))+v(color(5));
}
