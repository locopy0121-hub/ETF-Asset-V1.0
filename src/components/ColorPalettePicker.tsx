import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme/tokens';

type Hsv={h:number;s:number;v:number};
type PickerMode='wheel'|'classic'|'palette';

const WHEEL_STEPS=18;
const CLASSIC_COLORS=[
  '#FFFFFF','#E5E7EB','#94A3B8','#475569','#0F172A','#000000',
  '#FEE2E2','#FCA5A5','#EF4444','#B91C1C','#7F1D1D','#FB923C',
  '#FEF3C7','#FACC15','#84CC16','#22C55E','#10B981','#0F766E',
  '#CFFAFE','#22D3EE','#0EA5E9','#0066FF','#1D4ED8','#312E81',
  '#EDE9FE','#8B5CF6','#A855F7','#D946EF','#EC4899','#BE185D',
] as const;
const THEME_COLORS=[
  '#0066FF','#EFF6FF','#0F172A','#64748B','#FFFFFF','#F8FAFC',
  '#EF4444','#10B981','#F59E0B','#0EA5E9','#8B5CF6','#EC4899',
  '#111827','#1E293B','#334155','#CBD5E1','#E2E8F0','#F1F5F9',
] as const;

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const hex2=(n:number)=>Math.round(clamp(n,0,255)).toString(16).padStart(2,'0').toUpperCase();
const normalizeHex=(value:string)=>/^#[0-9A-Fa-f]{6}$/.test(String(value||''))?String(value).toUpperCase():'#FFFFFF';

function hexToHsv(value:string):Hsv{
  const hex=normalizeHex(value).slice(1);
  const r=parseInt(hex.slice(0,2),16)/255;
  const g=parseInt(hex.slice(2,4),16)/255;
  const b=parseInt(hex.slice(4,6),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;
  if(d!==0){
    if(max===r)h=60*(((g-b)/d)%6);
    else if(max===g)h=60*((b-r)/d+2);
    else h=60*((r-g)/d+4);
  }
  if(h<0)h+=360;
  return {h,s:max===0?0:(d/max)*100,v:max*100};
}
function hsvToHex({h,s,v}:Hsv){
  const hh=((h%360)+360)%360;
  const ss=clamp(s,0,100)/100;
  const vv=clamp(v,0,100)/100;
  const c=vv*ss;
  const x=c*(1-Math.abs(((hh/60)%2)-1));
  const m=vv-c;
  let r=0,g=0,b=0;
  if(hh<60){r=c;g=x;}
  else if(hh<120){r=x;g=c;}
  else if(hh<180){g=c;b=x;}
  else if(hh<240){g=x;b=c;}
  else if(hh<300){r=x;b=c;}
  else{r=c;b=x;}
  return '#'+hex2((r+m)*255)+hex2((g+m)*255)+hex2((b+m)*255);
}

function Marker({ratio}:{ratio:number}){return <View pointerEvents="none" style={[styles.marker,{left:`${clamp(ratio,0,1)*100}%`}]} />;}

export function ColorPalettePicker({
  label,
  value,
  onChange,
  profitColorEnabled,
  onProfitColorChange,
}:{
  label:string;
  value:string;
  onChange:(value:string)=>void;
  profitColorEnabled?:boolean;
  onProfitColorChange?:(value:boolean)=>void;
}){
  const [expanded,setExpanded]=useState(false);
  const [mode,setMode]=useState<PickerMode>('wheel');
  const [draft,setDraft]=useState(()=>normalizeHex(value));
  const [original,setOriginal]=useState(()=>normalizeHex(value));
  const [wheelSize,setWheelSize]=useState(1);
  const [barWidth,setBarWidth]=useState(1);

  useEffect(()=>{
    if(!expanded){
      const next=normalizeHex(value);
      setDraft(next);
      setOriginal(next);
    }
  },[value,expanded]);

  const safeValue=normalizeHex(value);
  const hsv=useMemo(()=>hexToHsv(draft),[draft]);
  // Do not allocate hundreds of wheel cells for every closed picker on a settings page.
  // Only the single visible wheel owns the heavy render data.
  const wheelRows=useMemo(()=>{
    if(!expanded||mode!=='wheel')return [] as string[][];
    return Array.from({length:WHEEL_STEPS},(_,row)=>
      Array.from({length:WHEEL_STEPS},(_,col)=>{
        const x=((col+.5)/WHEEL_STEPS)*2-1;
        const y=((row+.5)/WHEEL_STEPS)*2-1;
        const radiusValue=Math.sqrt(x*x+y*y);
        if(radiusValue>1)return 'transparent';
        const hue=(Math.atan2(y,x)*180/Math.PI+360)%360;
        return hsvToHex({h:hue,s:clamp(radiusValue*100,0,100),v:100});
      })
    );
  },[expanded,mode]);
  const brightnessSegments=useMemo(
    ()=>expanded&&mode==='wheel'
      ?Array.from({length:32},(_,i)=>hsvToHex({h:hsv.h,s:hsv.s,v:(i/31)*100}))
      :[],
    [expanded,mode,hsv.h,hsv.s],
  );

  const updateDraftHsv=(next:Hsv)=>setDraft(hsvToHex(next));
  const pickWheel=(x:number,y:number)=>{
    const size=Math.max(1,wheelSize);
    const dx=(x-size/2)/(size/2);
    const dy=(y-size/2)/(size/2);
    const radial=Math.sqrt(dx*dx+dy*dy);
    if(radial>1.08)return;
    const hue=(Math.atan2(dy,dx)*180/Math.PI+360)%360;
    updateDraftHsv({h:hue,s:clamp(radial*100,0,100),v:hsv.v});
  };
  const wheelResponder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onMoveShouldSetPanResponder:()=>true,
    onPanResponderGrant:event=>pickWheel(event.nativeEvent.locationX,event.nativeEvent.locationY),
    onPanResponderMove:event=>pickWheel(event.nativeEvent.locationX,event.nativeEvent.locationY),
  }),[wheelSize,hsv.h,hsv.s,hsv.v]);

  const openPicker=()=>{
    const next=normalizeHex(value);
    setOriginal(next);
    setDraft(next);
    setMode('wheel');
    setExpanded(true);
  };
  const cancel=()=>{
    setDraft(original);
    setExpanded(false);
  };
  const confirm=()=>{
    onChange(draft);
    setOriginal(draft);
    setExpanded(false);
  };
  const setBrightness=(x:number)=>{
    const ratio=clamp(x/(barWidth||1),0,1);
    updateDraftHsv({...hsv,v:ratio*100});
  };
  const wheelMarkerLeft=50+Math.cos(hsv.h*Math.PI/180)*(hsv.s/100)*50;
  const wheelMarkerTop=50+Math.sin(hsv.h*Math.PI/180)*(hsv.s/100)*50;

  return <View style={styles.block}>
    <View style={styles.titleRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.preview,{backgroundColor:safeValue}]}/>
      {onProfitColorChange?<Pressable onPress={()=>onProfitColorChange(!profitColorEnabled)} style={[styles.profitPill,profitColorEnabled&&styles.profitPillOn]}><Text style={[styles.profitText,profitColorEnabled&&styles.profitTextOn]}>損益色 {profitColorEnabled?'開':'關'}</Text></Pressable>:null}
    </View>

    <Pressable onPress={openPicker} style={styles.paletteToggle}>
      <Text style={styles.hint}>調色盤直接選色，不需輸入色碼</Text>
      <Text style={styles.toggleText}>開啟調色盤</Text>
    </Pressable>

    {expanded?<Modal visible animationType="slide" presentationStyle="fullScreen" hardwareAccelerated onRequestClose={cancel}>
      <View style={styles.modalRoot}>
        <View style={styles.modalTop}>
          <Pressable onPress={cancel} style={styles.topAction}><Text style={styles.cancelText}>取消</Text></Pressable>
          <View style={styles.modalTitleWrap}>
            <Text style={styles.modalTitle}>顏色</Text>
            <Text style={styles.modalSubtitle}>{label}</Text>
          </View>
          <Pressable onPress={confirm} style={styles.topAction}><Text style={styles.doneText}>完成</Text></Pressable>
        </View>

        <View style={styles.compareRow}>
          <View><Text style={styles.compareLabel}>原本</Text><View style={[styles.compareSwatch,{backgroundColor:original}]}/></View>
          <View><Text style={styles.compareLabel}>目前</Text><View style={[styles.compareSwatch,{backgroundColor:draft}]}/></View>
        </View>

        <View style={styles.modeTabs}>
          {([
            {key:'wheel',label:'色盤'},
            {key:'classic',label:'經典'},
            {key:'palette',label:'調色板'},
          ] as const).map(item=><Pressable key={item.key} onPress={()=>setMode(item.key)} style={[styles.modeTab,mode===item.key&&styles.modeTabActive]}><Text style={[styles.modeText,mode===item.key&&styles.modeTextActive]}>{item.label}</Text></Pressable>)}
        </View>

        <View style={styles.pickerBody}>
          {mode==='wheel'?<>
            <View
              onLayout={(event:LayoutChangeEvent)=>setWheelSize(Math.max(1,event.nativeEvent.layout.width))}
              {...wheelResponder.panHandlers}
              style={styles.wheel}
            >
              {wheelRows.map((row,rowIndex)=><View key={rowIndex} pointerEvents="none" style={styles.wheelRow}>
                {row.map((cell,colIndex)=><View key={colIndex} style={[styles.wheelCell,{backgroundColor:cell}]}/>)}
              </View>)}
              <View pointerEvents="none" style={[styles.wheelMarker,{left:`${wheelMarkerLeft}%`,top:`${wheelMarkerTop}%`}]} />
            </View>
            <Text style={styles.sectionTitle}>亮度</Text>
            <PaletteBar colors={brightnessSegments} onLayout={(event)=>setBarWidth(Math.max(1,event.nativeEvent.layout.width))} onPick={setBrightness}><Marker ratio={hsv.v/100}/></PaletteBar>
          </>:null}

          {mode==='classic'?<ColorGrid colors={CLASSIC_COLORS} selected={draft} onPick={setDraft}/>:null}
          {mode==='palette'?<>
            <Text style={styles.sectionTitle}>TF Asset 調色板</Text>
            <ColorGrid colors={THEME_COLORS} selected={draft} onPick={setDraft}/>
            <Text style={styles.noInputNote}>全程點選、拖曳與滑動；不提供 HEX、RGB、HSV 或任何文字輸入欄位。</Text>
          </>:null}
        </View>
      </View>
    </Modal>:null}
  </View>;
}

function ColorGrid({colors:gridColors,selected,onPick}:{colors:readonly string[];selected:string;onPick:(color:string)=>void}){
  return <View style={styles.colorGrid}>{gridColors.map(color=><Pressable key={color} accessibilityRole="button" onPress={()=>onPick(color)} style={[styles.colorCell,{backgroundColor:color},selected===color&&styles.colorCellSelected]}/>)}</View>;
}

function PaletteBar({colors:barColors,onLayout,onPick,children}:{colors:readonly string[];onLayout:(e:LayoutChangeEvent)=>void;onPick:(x:number)=>void;children:ReactNode}){
  return <View
    onLayout={onLayout}
    onStartShouldSetResponder={()=>true}
    onMoveShouldSetResponder={()=>true}
    onResponderGrant={event=>onPick(event.nativeEvent.locationX)}
    onResponderMove={event=>onPick(event.nativeEvent.locationX)}
    style={styles.bar}
  >
    {barColors.map((c,i)=><View key={i} pointerEvents="none" style={{flex:1,backgroundColor:c}}/>)}
    {children}
  </View>;
}

const styles=StyleSheet.create({
  block:{gap:6,paddingVertical:5},
  titleRow:{flexDirection:'row',alignItems:'center',gap:8},
  label:{fontSize:10,fontWeight:'900',color:colors.text,flex:1},
  hint:{fontSize:9,color:colors.textSecondary,flex:1},
  paletteToggle:{minHeight:34,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  toggleText:{fontSize:9,fontWeight:'900',color:colors.primary},
  preview:{width:26,height:26,borderRadius:13,borderWidth:1,borderColor:colors.border},
  profitPill:{paddingHorizontal:8,paddingVertical:5,borderRadius:999,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  profitPillOn:{borderColor:colors.primary,backgroundColor:'#EFF6FF'},
  profitText:{fontSize:9,fontWeight:'900',color:colors.textSecondary},
  profitTextOn:{color:colors.primary},

  modalRoot:{flex:1,backgroundColor:colors.background,paddingTop:46},
  modalTop:{flexDirection:'row',alignItems:'center',paddingHorizontal:spacing.lg,paddingBottom:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  topAction:{minWidth:56,paddingVertical:8},
  cancelText:{fontSize:14,fontWeight:'800',color:colors.textSecondary},
  doneText:{fontSize:14,fontWeight:'900',color:colors.primary,textAlign:'right'},
  modalTitleWrap:{flex:1,alignItems:'center'},
  modalTitle:{fontSize:24,fontWeight:'900',color:colors.text},
  modalSubtitle:{fontSize:11,color:colors.textSecondary,marginTop:2},
  compareRow:{flexDirection:'row',justifyContent:'center',gap:28,paddingVertical:12},
  compareLabel:{fontSize:10,fontWeight:'800',color:colors.textSecondary,textAlign:'center',marginBottom:5},
  compareSwatch:{width:58,height:30,borderRadius:10,borderWidth:1,borderColor:colors.border},
  modeTabs:{flexDirection:'row',marginHorizontal:spacing.lg,backgroundColor:colors.surfaceMuted,borderRadius:radius.pill,padding:3},
  modeTab:{flex:1,paddingVertical:8,borderRadius:radius.pill,alignItems:'center'},
  modeTabActive:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  modeText:{fontSize:11,fontWeight:'800',color:colors.textSecondary},
  modeTextActive:{color:colors.primary},
  pickerBody:{flex:1,padding:spacing.lg,gap:14},
  wheel:{width:'100%',aspectRatio:1,maxWidth:360,alignSelf:'center',borderRadius:999,overflow:'hidden',backgroundColor:'#FFFFFF',position:'relative',borderWidth:1,borderColor:colors.border},
  wheelRow:{flex:1,flexDirection:'row'},
  wheelCell:{flex:1},
  wheelMarker:{position:'absolute',width:34,height:34,borderRadius:17,marginLeft:-17,marginTop:-17,borderWidth:3,borderColor:'#FFFFFF',backgroundColor:'transparent',shadowColor:'#000000',shadowOpacity:.25,shadowRadius:3,elevation:3},
  sectionTitle:{fontSize:12,fontWeight:'900',color:colors.text},
  bar:{height:34,borderRadius:radius.md,overflow:'hidden',flexDirection:'row',borderWidth:1,borderColor:colors.border,position:'relative'},
  marker:{position:'absolute',top:0,bottom:0,width:4,marginLeft:-2,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#0F172A'},
  colorGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,justifyContent:'center',paddingTop:6},
  colorCell:{width:46,height:46,borderRadius:12,borderWidth:1,borderColor:colors.border},
  colorCellSelected:{borderWidth:4,borderColor:colors.primary},
  noInputNote:{fontSize:10,lineHeight:16,color:colors.textSecondary,textAlign:'center',marginTop:6},
});
