import {useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';

import type {HoldingQuote} from '../domain/uiModels';

export type MiniHoldingChartStyle='line'|'area'|'bars'|'cost';
const MINI_STYLES:readonly MiniHoldingChartStyle[]=['line','area','bars','cost'];
const LABELS:Record<MiniHoldingChartStyle,string>={line:'折線',area:'面積',bars:'柱狀',cost:'成本'};
const DOUBLE_TAP_MS=240;
const HEIGHT=64;

export function MiniHoldingChart({
  holding,gainColor,lossColor,narrow=false,onOpen,
}:{
  holding:HoldingQuote;
  gainColor:string;
  lossColor:string;
  narrow?:boolean;
  onOpen?:()=>void;
}){
  const [style,setStyle]=useState<MiniHoldingChartStyle>('line');
  const [width,setWidth]=useState(narrow?220:108);
  const lastTap=useRef(0);
  const pending=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(pending.current)clearTimeout(pending.current);},[]);
  const values=useMemo(()=>{
    const source=Array.isArray(holding.sparkline)?holding.sparkline.filter(Number.isFinite):[];
    return source.length>=2?source:[holding.previousClose||holding.price,holding.price];
  },[holding.sparkline,holding.previousClose,holding.price]);
  const positive=holding.price>=holding.previousClose;
  const tone=positive?gainColor:lossColor;
  const innerWidth=Math.max(40,width-14);
  const pool=style==='cost'&&holding.costAvg>0?[...values,holding.costAvg]:values;
  const max=Math.max(...pool),min=Math.min(...pool),range=Math.max(.001,max-min);
  const x=(index:number)=>values.length<=1?0:index/(values.length-1)*innerWidth;
  const y=(value:number)=>6+(max-value)/range*(HEIGHT-18);
  const points=values.map((value,index)=>({x:x(index),y:y(value)}));
  const onPress=()=>{
    const now=Date.now();
    if(now-lastTap.current<=DOUBLE_TAP_MS){
      if(pending.current){clearTimeout(pending.current);pending.current=null;}
      lastTap.current=0;
      setStyle(current=>MINI_STYLES[(MINI_STYLES.indexOf(current)+1)%MINI_STYLES.length]!);
      return;
    }
    lastTap.current=now;
    pending.current=setTimeout(()=>{
      pending.current=null;
      lastTap.current=0;
      onOpen?.();
    },DOUBLE_TAP_MS);
  };
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={holding.symbol+' Mini 圖表，單點開啟完整圖表，連點切換樣式'}
    onPress={onPress}
    onLayout={event=>{const next=Math.round(event.nativeEvent.layout.width);if(next>0)setWidth(next);}}
    style={[styles.root,narrow&&styles.narrow]}
  >
    <View pointerEvents="none" style={styles.plot}>
      {(style==='area'||style==='bars')?points.map((point,index)=>{
        const columnWidth=Math.max(2,innerWidth/Math.max(4,points.length)-2);
        return <View key={'bar'+index} style={{
          position:'absolute',left:7+point.x-columnWidth/2,top:point.y,width:columnWidth,
          height:Math.max(2,HEIGHT-9-point.y),borderRadius:2,backgroundColor:tone,opacity:style==='area'?.28:.86,
        }}/>;
      }):null}
      {(style==='line'||style==='area'||style==='cost')?points.slice(1).map((point,index)=>{
        const prior=points[index]!;
        const dx=point.x-prior.x,dy=point.y-prior.y;
        const length=Math.max(1,Math.sqrt(dx*dx+dy*dy));
        const angle=Math.atan2(dy,dx);
        return <View key={'seg'+index} style={{
          position:'absolute',
          left:7+(prior.x+point.x)/2-length/2,
          top:(prior.y+point.y)/2-1,
          width:length,height:2,borderRadius:1,backgroundColor:tone,
          transform:[{rotateZ:angle+'rad'}],
        }}/>;
      }):null}
      {style==='cost'&&holding.costAvg>0?<View style={{
        position:'absolute',left:7,right:7,top:y(holding.costAvg),borderTopWidth:1,borderStyle:'dashed',borderColor:'#F8FAFC',opacity:.78,
      }}/>:null}
      <View style={[styles.lastDot,{left:7+points[points.length-1]!.x-2,top:points[points.length-1]!.y-2,backgroundColor:tone}]}/>
    </View>
    <Text pointerEvents="none" style={styles.label}>{LABELS[style]}</Text>
  </Pressable>;
}

const styles=StyleSheet.create({
  root:{width:108,minHeight:96,backgroundColor:'#090E15',paddingHorizontal:7,paddingTop:8,paddingBottom:6,justifyContent:'center'},
  narrow:{width:'100%',minHeight:72},
  plot:{height:HEIGHT,position:'relative',overflow:'hidden'},
  lastDot:{position:'absolute',width:5,height:5,borderRadius:3},
  label:{fontSize:8,fontWeight:'900',color:'#91A0B5',textAlign:'right',paddingRight:2},
});
