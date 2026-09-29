import {useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';

import type {HoldingQuote} from '../domain/uiModels';

export type MiniHoldingChartStyle='line'|'area'|'bars'|'cost';
const MINI_STYLES:readonly MiniHoldingChartStyle[]=['line','area','bars','cost'];
const LABELS:Record<MiniHoldingChartStyle,string>={line:'走勢',area:'面積',bars:'柱狀',cost:'成本'};
const DOUBLE_TAP_MS=240;
const HEIGHT=70;
const SESSION_START_MINUTE=9*60;
const SESSION_END_MINUTE=13*60+30;
const SESSION_MINUTES=SESSION_END_MINUTE-SESSION_START_MINUTE;
const TAIPEI_OFFSET_MS=8*60*60*1000;
export const MAX_MINI_RENDER_POINTS=160;

type Point={x:number;y:number;value:number;at:number};
type IntradayLike={at:number;price:number};

function taipeiDateMinute(at:number){
  const shifted=new Date(at+TAIPEI_OFFSET_MS);
  return {
    date:shifted.toISOString().slice(0,10),
    minute:shifted.getUTCHours()*60+shifted.getUTCMinutes(),
  };
}

/**
 * Mini charts do not need one native View for every 5-second market tick.
 * Preserve each bucket's high/low in chronological order so spikes remain
 * visible while keeping the rendered node count bounded.
 */
export function downsampleIntradayPoints<T extends IntradayLike>(
  rows:readonly T[],
  maxPoints=MAX_MINI_RENDER_POINTS,
):T[]{
  const cap=Math.max(4,Math.floor(maxPoints));
  if(rows.length<=cap)return [...rows];
  const bucketCount=Math.max(1,Math.floor((cap-2)/2));
  const span=(rows.length-2)/bucketCount;
  const out:T[]=[rows[0]!];

  for(let bucket=0;bucket<bucketCount;bucket+=1){
    const start=1+Math.floor(bucket*span);
    const end=Math.min(rows.length-1,1+Math.floor((bucket+1)*span));
    if(start>=end)continue;
    let lowIndex=start,highIndex=start;
    for(let index=start+1;index<end;index+=1){
      if(rows[index]!.price<rows[lowIndex]!.price)lowIndex=index;
      if(rows[index]!.price>rows[highIndex]!.price)highIndex=index;
    }
    if(lowIndex===highIndex)out.push(rows[lowIndex]!);
    else if(lowIndex<highIndex)out.push(rows[lowIndex]!,rows[highIndex]!);
    else out.push(rows[highIndex]!,rows[lowIndex]!);
  }

  const last=rows[rows.length-1]!;
  if(out[out.length-1]!==last)out.push(last);
  return out;
}

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

  const session=useMemo(()=>{
    const raw=Array.isArray(holding.intraday)?holding.intraday:[];
    const date=holding.intradayDate??(raw.length?taipeiDateMinute(raw[raw.length-1]?.at??0).date:null);
    const byAt=new Map<number,{at:number;price:number}>();
    for(const item of raw){
      if(!item||!Number.isFinite(item.at)||!Number.isFinite(item.price)||item.at<=0||item.price<=0)continue;
      const local=taipeiDateMinute(item.at);
      if(date&&local.date!==date)continue;
      if(local.minute<SESSION_START_MINUTE||local.minute>SESSION_END_MINUTE)continue;
      byAt.set(item.at,{at:item.at,price:item.price});
    }
    return {date,points:[...byAt.values()].sort((a,b)=>a.at-b.at)};
  },[holding.intraday,holding.intradayDate]);

  const innerWidth=Math.max(44,width-8);
  const renderLimit=Math.max(48,Math.min(MAX_MINI_RENDER_POINTS,Math.round(innerWidth*.7)));
  const sampled=useMemo(()=>downsampleIntradayPoints(session.points,renderLimit),[session.points,renderLimit]);
  const baseline=(holding.intradayPreviousClose??0)>0
    ?holding.intradayPreviousClose!
    :holding.previousClose>0?holding.previousClose:(sampled[0]?.price??holding.price);
  const values=sampled.map(item=>item.price);
  const pool=style==='cost'&&holding.costAvg>0?[...values,baseline,holding.costAvg]:[...values,baseline];
  const max=Math.max(...pool),min=Math.min(...pool),range=Math.max(.001,max-min);
  const x=(at:number)=>{
    const minute=taipeiDateMinute(at).minute;
    const ratio=Math.max(0,Math.min(1,(minute-SESSION_START_MINUTE)/SESSION_MINUTES));
    return ratio*innerWidth;
  };
  const y=(value:number)=>5+(max-value)/range*(HEIGHT-12);
  const points:Point[]=sampled.map(item=>({x:x(item.at),y:y(item.price),value:item.price,at:item.at}));
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
      at:prior.at+(point.at-prior.at)*ratio,
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

  const latest=points[points.length-1]??null;
  const latestTone=latest&&latest.value>=baseline?gainColor:lossColor;
  const enough=points.length>=2;

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${holding.symbol} 當日分時 ${LABELS[style]}圖，${session.date??'日期待取得'}，${session.points.length} 個實際分時點，畫面採樣 ${points.length} 點，昨收基準 ${baseline}，單點開啟完整圖表，連點切換樣式`}
    onPress={onPress}
    onLayout={event=>{const next=Math.round(event.nativeEvent.layout.width);if(next>0)setWidth(current=>current===next?current:next);}}
    style={[styles.root,narrow&&styles.narrow]}
  >
    <View pointerEvents="none" style={styles.plot}>
      <View style={[styles.gridLine,{top:HEIGHT*.25}]}/>
      <View style={[styles.gridLine,{top:HEIGHT*.75}]}/>
      <View style={[styles.baseline,{top:baselineY}]}/>

      {enough&&(style==='area'||style==='bars')?points.map((point,index)=>{
        const columnWidth=style==='bars'?Math.max(2,innerWidth/90):Math.max(2,innerWidth/120);
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

      {enough&&(style==='line'||style==='area'||style==='cost')?lineParts:null}

      {enough&&style==='cost'&&holding.costAvg>0?<View style={{
        position:'absolute',
        left:4,
        right:4,
        top:y(holding.costAvg),
        borderTopWidth:1,
        borderStyle:'dashed',
        borderColor:'#CBD5E1',
        opacity:.58,
      }}/>:null}

      {latest?<View style={[styles.lastDot,{left:4+latest.x-2.5,top:latest.y-2.5,backgroundColor:latestTone}]}/>:null}
      {!enough?<View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>{points.length===1?'分時資料累積中':'分時走勢待取得'}</Text>
      </View>:null}
      <Text style={styles.openLabel}>09:00</Text>
      <Text style={styles.closeLabel}>13:30</Text>
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
  emptyWrap:{position:'absolute',left:0,right:0,top:0,bottom:0,alignItems:'center',justifyContent:'center'},
  emptyText:{fontSize:9,fontWeight:'800',color:'#718096'},
  openLabel:{position:'absolute',left:4,bottom:0,fontSize:7,color:'#64748B'},
  closeLabel:{position:'absolute',right:4,bottom:0,fontSize:7,color:'#64748B'},
});
