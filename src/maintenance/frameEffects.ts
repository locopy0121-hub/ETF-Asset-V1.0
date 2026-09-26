/** Frame-only display settings. No ledger, market or source-data dependencies. */
export type FrameEffects=Readonly<{
  backgroundMode:'solid'|'gradient'|'image';
  gradientEndColor:string;gradientDirection:'horizontal'|'vertical';gradientAngle:number|null;gradientEndProfitColor:boolean;
  gradientMidEnabled:boolean;gradientMidColor:string;gradientMidProfitColor:boolean;gradientMidStop:number;
  imageSource:'builtIn'|'custom';imageIndex:number;imageUri:string|null;
  imageFit:'cover'|'contain'|'stretch';imageOpacity:number;
  maskColor:string;maskProfitColor:boolean;maskOpacity:number;
  borderStyle:'solid'|'dashed'|'dotted';
  borderGradientEnabled:boolean;borderGradientMode:'dual'|'gradient';
  borderGradientStartColor:string;borderGradientStartProfitColor:boolean;
  borderGradientEndColor:string;borderGradientEndProfitColor:boolean;
  borderGradientWidth:number;borderGradientOpacity:number;
  borderTop:number;borderRight:number;borderBottom:number;borderLeft:number;
  cornerTopLeft:number;cornerTopRight:number;cornerBottomRight:number;cornerBottomLeft:number;
  shadowColor:string;shadowProfitColor:boolean;shadowBlur:number;
  shadowOffsetX:number;shadowOffsetY:number;
  shadowSpreadEnabled:boolean;shadowSpreadRadius:number;shadowSpreadLayers:number;shadowSpreadOpacity:number;
  glowEnabled:boolean;glowColor:string;glowProfitColor:boolean;glowOpacity:number;
  glowWidth:number;glowPulse:boolean;glowPeriodMs:number;
  blinkEnabled:boolean;blinkColor:string;blinkProfitColor:boolean;blinkOpacity:number;blinkPeriodMs:number;
  titleMarqueeEnabled:boolean;titleMarqueeSpeed:number;titleMarqueeGap:number;
  outerGlowEnabled:boolean;outerGlowColor:string;outerGlowProfitColor:boolean;
  outerGlowOpacity:number;outerGlowSpread:number;outerGlowSoftness:number;
  paddingTop:number;paddingRight:number;paddingBottom:number;paddingLeft:number;
  contentGap:number;marginVertical:number;maxWidth:number;
}>;
/** -1 means inherit the outer frame's original setting, preserving old page layouts. */
export const DEFAULT_FRAME_EFFECTS:FrameEffects={
  backgroundMode:'solid',gradientEndColor:'#EDE9FE',gradientDirection:'vertical',gradientAngle:null,gradientEndProfitColor:false,
  gradientMidEnabled:false,gradientMidColor:'#C4B5FD',gradientMidProfitColor:false,gradientMidStop:.5,
  imageSource:'builtIn',imageIndex:0,imageUri:null,imageFit:'cover',imageOpacity:1,
  maskColor:'#000000',maskProfitColor:false,maskOpacity:0,
  borderStyle:'solid',borderGradientEnabled:false,borderGradientMode:'dual',
  borderGradientStartColor:'#A78BFA',borderGradientStartProfitColor:false,
  borderGradientEndColor:'#38BDF8',borderGradientEndProfitColor:false,
  borderGradientWidth:5,borderGradientOpacity:.8,borderTop:-1,borderRight:-1,borderBottom:-1,borderLeft:-1,
  cornerTopLeft:-1,cornerTopRight:-1,cornerBottomRight:-1,cornerBottomLeft:-1,
  shadowColor:'#000000',shadowProfitColor:false,shadowBlur:8,shadowOffsetX:0,shadowOffsetY:2,
  shadowSpreadEnabled:false,shadowSpreadRadius:12,shadowSpreadLayers:3,shadowSpreadOpacity:.25,
  glowEnabled:false,glowColor:'#A78BFA',glowProfitColor:false,glowOpacity:.35,glowWidth:3,
  glowPulse:false,glowPeriodMs:1800,
  blinkEnabled:false,blinkColor:'#FBBF24',blinkProfitColor:false,blinkOpacity:.65,blinkPeriodMs:1500,
  titleMarqueeEnabled:false,titleMarqueeSpeed:72,titleMarqueeGap:32,
  outerGlowEnabled:false,outerGlowColor:'#A78BFA',outerGlowProfitColor:false,
  outerGlowOpacity:.35,outerGlowSpread:4,outerGlowSoftness:12,
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
    borderGradientWidth:[1,12],borderGradientOpacity:[0,.8],
    cornerTopLeft:[-1,48],cornerTopRight:[-1,48],cornerBottomRight:[-1,48],cornerBottomLeft:[-1,48],
    shadowBlur:[0,48],shadowOffsetX:[-24,24],shadowOffsetY:[-24,24],
    shadowSpreadRadius:[0,32],shadowSpreadLayers:[1,6],shadowSpreadOpacity:[0,.65],
    glowOpacity:[0,.8],glowWidth:[0,16],glowPeriodMs:[800,4000],
    blinkOpacity:[0,.8],blinkPeriodMs:[500,5000],
    titleMarqueeSpeed:[24,180],titleMarqueeGap:[12,80],
    outerGlowOpacity:[0,.8],outerGlowSpread:[0,32],outerGlowSoftness:[0,48],
    paddingTop:[-1,32],paddingRight:[-1,32],paddingBottom:[-1,32],paddingLeft:[-1,32],
    contentGap:[-1,40],marginVertical:[0,32],maxWidth:[0,1600],
    gradientMidStop:[.1,.9],imageIndex:[0,9],imageOpacity:[0,1],maskOpacity:[0,1],
  };
  const out:Record<string,unknown>={...defaults};
  for(const [key,[min,max]] of Object.entries(numberRanges)){
    const value=v[key];if(typeof value==='number'&&Number.isFinite(value))
      out[key]=finite(value,min!,max!,defaults[key as keyof FrameEffects] as number);
  }
  for(const key of ['gradientEndColor','gradientMidColor','borderGradientStartColor','borderGradientEndColor','maskColor','shadowColor','glowColor','outerGlowColor','blinkColor'] as const)
    if(hex(v[key]))out[key]=v[key].toUpperCase();
  for(const key of ['gradientEndProfitColor','gradientMidEnabled','borderGradientEnabled','borderGradientStartProfitColor','borderGradientEndProfitColor','gradientMidProfitColor','maskProfitColor','shadowProfitColor','shadowSpreadEnabled','glowEnabled','glowProfitColor','glowPulse','blinkEnabled','blinkProfitColor','titleMarqueeEnabled','outerGlowEnabled','outerGlowProfitColor'] as const)
    if(typeof v[key]==='boolean')out[key]=v[key];
  if(v.backgroundMode==='solid'||v.backgroundMode==='gradient'||v.backgroundMode==='image')out.backgroundMode=v.backgroundMode;
  if(v.imageSource==='builtIn'||v.imageSource==='custom')out.imageSource=v.imageSource;
  if(v.imageFit==='cover'||v.imageFit==='contain'||v.imageFit==='stretch')out.imageFit=v.imageFit;
  if(v.imageUri===null)out.imageUri=null;
  else if(typeof v.imageUri==='string'&&/^content:\/\/[^\s?#]{1,2048}$/.test(v.imageUri))
    out.imageUri=v.imageUri;
  out.imageIndex=Math.round(out.imageIndex as number);
  out.shadowSpreadLayers=Math.round(out.shadowSpreadLayers as number);
  if(v.gradientDirection==='horizontal'||v.gradientDirection==='vertical')out.gradientDirection=v.gradientDirection;
  if(v.gradientAngle===null)out.gradientAngle=null;
  else if(typeof v.gradientAngle==='number'&&Number.isFinite(v.gradientAngle))
    out.gradientAngle=Math.round(finite(v.gradientAngle,0,359,90));
  if(v.borderStyle==='solid'||v.borderStyle==='dashed'||v.borderStyle==='dotted')out.borderStyle=v.borderStyle;
  if(v.borderGradientMode==='dual'||v.borderGradientMode==='gradient')out.borderGradientMode=v.borderGradientMode;
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
  return ('#'+v(color(1))+v(color(3))+v(color(5))).toUpperCase();
}

/** Interpolated three-stop native View gradient (zero extra Android dependencies). */
export function sampleFrameGradient(start:string,middle:string,end:string,position:number,pivot:number,enabled:boolean):string{
  const at=Math.max(0,Math.min(1,position));
  if(!enabled)return mixFrameColors(start,end,at);
  const stop=Math.max(.1,Math.min(.9,pivot));
  return at<=stop?mixFrameColors(start,middle,at/stop):
    mixFrameColors(middle,end,(at-stop)/(1-stop));
}

/** A diagonal native View gradient needs an oversized centered square so rotation never exposes corners. */
export function angledFrameGradientBounds(width:number,height:number){
  const w=Math.max(0,width),h=Math.max(0,height);
  const side=Math.ceil(2*Math.hypot(w,h));
  return {side,left:(w-side)/2,top:(h-side)/2};
}

/** Non-interactive external concentric native View rings; never touches frame children or financial values. */
export function outerGlowLayers(spread:number,softness:number,opacity:number){
 const s=Math.max(0,Math.min(32,Number.isFinite(spread)?spread:0));
 const blur=Math.max(0,Math.min(48,Number.isFinite(softness)?softness:0));
 const alpha=Math.max(0,Math.min(.8,Number.isFinite(opacity)?opacity:0));
 if(!alpha)return [];
 const count=Math.max(1,Math.min(8,Math.ceil(blur/5)));
 return Array.from({length:count},(_,i)=>{
   const depth=count-i;
   return {inset:Math.max(1,Math.round(s+blur*depth/count)),
     borderWidth:Math.max(1,Math.ceil(blur/count)),
     alpha:Number((alpha*(1-depth/(count+1))*.7).toFixed(4))};
 });
}

/** One title-copy and its gap; keeps financial data and original title immutable. */
export function frameTitleMarqueeDuration(textWidth:number,gap:number,speed:number){
 const w=Number.isFinite(textWidth)?Math.max(0,textWidth):0;
 const g=Number.isFinite(gap)?Math.max(12,Math.min(80,gap)):32;
 const v=Number.isFinite(speed)?Math.max(24,Math.min(180,speed)):72;
 return Math.max(500,Math.round(1000*(w+g)/v));
}

/** Separate native non-touching shadow contours: each color layer lives outside content. */
export function frameShadowSpreadBands(radius:number,opacity:number,count:number){
 const r=Number.isFinite(radius)?Math.max(0,Math.min(32,radius)):0;
 const a=Number.isFinite(opacity)?Math.max(0,Math.min(.65,opacity)):0;
 const n=Number.isFinite(count)?Math.round(Math.max(1,Math.min(6,count))):3;
 if(r===0||a===0)return [];
 return Array.from({length:n},(_,i)=>{
   const progress=(i+1)/n;
   return {inset:Number((r*progress).toFixed(2)),
     borderWidth:Math.max(1,Math.min(4,Number((1+r/n/6).toFixed(2)))),
     alpha:Number((a*(1-progress*.7)).toFixed(4))};
 });
}

/** Bounded native border contours: two separate colors or eight depth-interpolated strokes. */
export function frameBorderGradientBands(start:string,end:string,width:number,opacity:number,mode:'dual'|'gradient'){
 const w=Number.isFinite(width)?Math.max(1,Math.min(12,width)):5;
 const alpha=Number.isFinite(opacity)?Math.max(0,Math.min(.8,opacity)):0;
 if(alpha===0)return [];
 const count=mode==='dual'?2:8;
 return Array.from({length:count},(_,i)=>({
   inset:Number((w*i/count).toFixed(3)),stroke:Number((w/count).toFixed(3)),
   color:mixFrameColors(start,end,i/(count-1)),alpha,
 }));
}
