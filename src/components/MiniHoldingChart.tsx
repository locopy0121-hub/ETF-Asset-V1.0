import {useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,StyleSheet,View} from 'react-native';

import type {HoldingQuote} from '../domain/uiModels';

export type MiniHoldingChartStyle='line'|'area'|'bars'|'cost';
const MINI_STYLES:readonly MiniHoldingChartStyle[]=['line','area','bars','cost'];
const LABELS:Record<MiniHoldingChartStyle,string>={line:'走勢',area:'面積',bars:'柱狀',cost:'成本'};
const DOUBLE_TAP_MS=240;
const HEIGHT=70;

type Point={x:number;y:number;value:number};

function segmentView(a:Point,b:Point,color:string,key:string){
  const dx=b.x-a.x,dy=b.y-a.y;
  const length=Math.max(1,Math.sqrt(dx*dx+dy*dy));
  const angle=Math.atan2(dy,dx);
  return <View key={key} style={{
    position:'absolute',
    left:4+(a.x+b.x)/2-length/2,
    top:(a.y+b.y)/2-1,
    width:length,
    height:2,
    borderRadius:1,
    backgroundColor:color,
    transform:[{rotateZ:angle+'rad'}],
  }}/>;
}

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
  const [width,setWidth]=useState(narrow?150:220);
  const lastTap=useRef(0);
  const pending=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(pending.current)clearTimeout(pending.current);},[]);

  const values=useMemo(()=>{
    const source=Array.isArray(holding.sparkline)?holding.sparkline.filter(Number.isFinite):[];
    const previous=holding.previousClose>0?holding.previousClose:holding.price;
    return source.length>=2?source:[previous,holding.price];
  },[holding.sparkline,holding.previousClose,holding.price]);

  const baseline=holding.previousClose>0?holding.previousClose:(values[0]??holding.price);
  const innerWidth=Math.max(44,width-8);
  const pool=style==='cost'&&holding.costAvg>0?[...values,baseline,holding.costAvg]:[...values,baseline];
  const max=Math.max(...pool),min=Math.min(...pool),range=Math.max(.001,max-min);
  const x=(index:number)=>values.length<=1?innerWidth/2:index/(values.length-1)*innerWidth;
  const y=(value:number)=>5+(max-value)/range*(HEIGHT-12);
  const points:Point[]=values.map((value,index)=>({x:x(index),y:y(value),value}));
  const baselineY=y(baseline);

  const lineParts=points.slice(1).flatMap((point,index)=>{
    const prior=points[index]!;
    const priorDelta=prior.value-baseline;
    const nextDelta=point.value-baseline;
    if(priorDelta===0||nextDelta===0||priorDelta*nextDelta>0){
      const reference=nextDelta===0?priorDelta:nextDelta;
      return [segmentView(prior,point,reference>=0?gainColor:lossColor,`seg-${index}`)];
    }
    const ratio=(baseline-prior.value)/(point.value-prior.value);
    const cross:Point={
      x:prior.x+(point.x-prior.x)*ratio,
      y:baselineY,
      value:baseline,
    };
    return [
      segmentView(prior,cross,priorDelta>=0?gainColor:lossColor,`seg-${index}-a`),
      segmentView(cross,point,nextDelta>=0?gainColor:lossColor,`seg-${index}-b`),
    ];
  });

  const onPress=()=>{
    const now=Date.now();
    if(now-lastTap.current<=DOUBLE_TAP_MS){
      if(pending.current){clearTimeout(pending.current);pending.current=null;}
      lastTap.current=0;
      setStyle(currentStyle=>MINI_STYLES[(MINI_STYLES.indexOf(currentStyle)+1)%MINI_STYLES.length]!);
      return;
    }
    lastTap.current=now;
    pending.current=setTimeout(()=>{
      pending.current=null;
      lastTap.current=0;
      onOpen?.();
    },DOUBLE_TAP_MS);
  };

  const latest=points[points.length-1]!;
  const latestTone=latest.value>=baseline?gainColor:lossColor;

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${holding.symbol} Mini ${LABELS[style]}圖，昨收基準 ${baseline}，單點開啟完整圖表，連點切換樣式`}
    onPress={onPress}
    onLayout={event=>{const next=Math.round(event.nativeEvent.layout.width);if(next>0)setWidth(next);}}
    style={[styles.root,narrow&&styles.narrow]}
  >
    <View pointerEvents="none" style={styles.plot}>
      <View style={[styles.gridLine,{top:HEIGHT*.25}]}/>
      <View style={[styles.gridLine,{top:HEIGHT*.75}]}/>
      <View style={[styles.baseline,{top:baselineY}]}/>

      {(style==='area'||style==='bars')?points.map((point,index)=>{
        const columnWidth=style==='bars'?Math.max(2,innerWidth/Math.max(6,points.length)-2):Math.max(2,innerWidth/Math.max(8,points.length));
        const top=Math.min(point.y,baselineY);
        return <View key={'bar-'+index} style={{
          position:'absolute',
          left:4+point.x-columnWidth/2,
          top,
          width:columnWidth,
          height:Math.max(1,Math.abs(point.y-baselineY)),
          borderRadius:1,
          backgroundColor:point.value>=baseline?gainColor:lossColor,
          opacity:style==='area'?.22:.82,
        }}/>;
      }):null}

      {(style==='line'||style==='area'||style==='cost')?lineParts:null}

      {style==='cost'&&holding.costAvg>0?<View style={{
        position:'absolute',
        left:4,
        right:4,
        top:y(holding.costAvg),
        borderTopWidth:1,
        borderStyle:'dashed',
        borderColor:'#CBD5E1',
        opacity:.58,
      }}/>:null}

      <View style={[styles.lastDot,{left:4+latest.x-2.5,top:latest.y-2.5,backgroundColor:latestTone}]}/>
    </View>
  </Pressable>;
}

const styles=StyleSheet.create({
  root:{width:'100%',minHeight:82,paddingHorizontal:4,paddingVertical:6,justifyContent:'center',backgroundColor:'transparent'},
  narrow:{minHeight:72},
  plot:{height:HEIGHT,position:'relative',overflow:'hidden'},
  gridLine:{position:'absolute',left:4,right:4,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#29313A',opacity:.42},
  baseline:{position:'absolute',left:4,right:4,borderTopWidth:1,borderStyle:'dashed',borderTopColor:'#718096',opacity:.78},
  lastDot:{position:'absolute',width:5,height:5,borderRadius:3,borderWidth:1,borderColor:'#0B0F14'},
});
