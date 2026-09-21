import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../theme/tokens';

type Hsl={h:number;s:number;l:number};

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const hex2=(n:number)=>Math.round(clamp(n,0,255)).toString(16).padStart(2,'0').toUpperCase();

function hexToHsl(value:string):Hsl{
  const match=/^#([0-9a-f]{6})$/i.exec(value.trim());
  if(!match)return {h:0,s:0,l:50};
  const raw=match[1]!;
  const r=parseInt(raw.slice(0,2),16)/255,g=parseInt(raw.slice(2,4),16)/255,b=parseInt(raw.slice(4,6),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;
  if(d!==0){
    if(max===r)h=((g-b)/d)%6;
    else if(max===g)h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h*=60;if(h<0)h+=360;
  }
  const l=(max+min)/2;
  const s=d===0?0:d/(1-Math.abs(2*l-1));
  return {h,s:s*100,l:l*100};
}
function hslToHex({h,s,l}:Hsl){
  const ss=clamp(s,0,100)/100,ll=clamp(l,0,100)/100;
  const c=(1-Math.abs(2*ll-1))*ss;
  const x=c*(1-Math.abs(((h/60)%2)-1));
  const m=ll-c/2;
  let r=0,g=0,b=0;
  if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}
  return '#'+hex2((r+m)*255)+hex2((g+m)*255)+hex2((b+m)*255);
}
function Marker({ratio}:{ratio:number}){return <View pointerEvents="none" style={[styles.marker,{left:`${clamp(ratio,0,1)*100}%`}]} />;}

export function ColorPalettePicker({label,value,onChange,profitColorEnabled,onProfitColorChange}:{label:string;value:string;onChange:(value:string)=>void;profitColorEnabled?:boolean;onProfitColorChange?:(value:boolean)=>void}){
  const [hsl,setHsl]=useState<Hsl>(()=>hexToHsl(value));
  const [widths,setWidths]=useState({h:1,s:1,l:1});
  useEffect(()=>setHsl(hexToHsl(value)),[value]);
  const update=(next:Hsl)=>{setHsl(next);onChange(hslToHex(next));};
  const setFromX=(key:'h'|'s'|'l',x:number)=>{
    const ratio=clamp(x/(widths[key]||1),0,1);
    if(key==='h')update({...hsl,h:ratio*359.999});
    else if(key==='s')update({...hsl,s:ratio*100});
    else update({...hsl,l:ratio*100});
  };
  const onLayout=(key:'h'|'s'|'l')=>(e:LayoutChangeEvent)=>setWidths(current=>({...current,[key]:Math.max(1,e.nativeEvent.layout.width)}));
  const hueSegments=useMemo(()=>Array.from({length:36},(_,i)=>hslToHex({h:i*10,s:100,l:50})),[]);
  const satSegments=Array.from({length:24},(_,i)=>hslToHex({h:hsl.h,s:(i/23)*100,l:hsl.l}));
  const lightSegments=Array.from({length:24},(_,i)=>hslToHex({h:hsl.h,s:hsl.s,l:(i/23)*100}));
  return <View style={styles.block}>
    <View style={styles.titleRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.preview,{backgroundColor:value}]}/>
      {onProfitColorChange?<Pressable onPress={()=>onProfitColorChange(!profitColorEnabled)} style={[styles.profitPill,profitColorEnabled&&styles.profitPillOn]}><Text style={[styles.profitText,profitColorEnabled&&styles.profitTextOn]}>損益色 {profitColorEnabled?'開':'關'}</Text></Pressable>:null}
    </View>
    <Text style={styles.hint}>調色盤直接選色，不需輸入色碼</Text>
    <PaletteBar colors={hueSegments} onLayout={onLayout('h')} onPick={x=>setFromX('h',x)}><Marker ratio={hsl.h/360}/></PaletteBar>
    <PaletteBar colors={satSegments} onLayout={onLayout('s')} onPick={x=>setFromX('s',x)}><Marker ratio={hsl.s/100}/></PaletteBar>
    <PaletteBar colors={lightSegments} onLayout={onLayout('l')} onPick={x=>setFromX('l',x)}><Marker ratio={hsl.l/100}/></PaletteBar>
    <Text style={styles.meta}>色相 {Math.round(hsl.h)}°　飽和 {Math.round(hsl.s)}%　明度 {Math.round(hsl.l)}%</Text>
  </View>;
}
function PaletteBar({colors:barColors,onLayout,onPick,children}:{colors:string[];onLayout:(e:LayoutChangeEvent)=>void;onPick:(x:number)=>void;children:React.ReactNode}){
  return <Pressable onLayout={onLayout} onPress={e=>onPick(e.nativeEvent.locationX)} style={styles.bar}>
    {barColors.map((c,i)=><View key={i} pointerEvents="none" style={{flex:1,backgroundColor:c}}/>)}
    {children}
  </Pressable>;
}

const styles=StyleSheet.create({
  block:{gap:6,paddingVertical:5},
  titleRow:{flexDirection:'row',alignItems:'center',gap:8},
  label:{fontSize:10,fontWeight:'900',color:colors.text,flex:1},
  hint:{fontSize:9,color:colors.textSecondary},
  preview:{width:24,height:24,borderRadius:12,borderWidth:1,borderColor:colors.border},
  bar:{height:28,borderRadius:radius.md,overflow:'hidden',flexDirection:'row',borderWidth:1,borderColor:colors.border,position:'relative'},
  marker:{position:'absolute',top:0,bottom:0,width:3,marginLeft:-1.5,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#0F172A'},
  meta:{fontSize:9,fontWeight:'700',color:colors.textSecondary},
  profitPill:{paddingHorizontal:8,paddingVertical:5,borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  profitPillOn:{borderColor:colors.primary,backgroundColor:'#EFF6FF'},
  profitText:{fontSize:9,fontWeight:'900',color:colors.textSecondary},
  profitTextOn:{color:colors.primary},
});
