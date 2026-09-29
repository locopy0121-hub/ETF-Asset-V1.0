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

type Point={x:number;y:number;value:number;at:number};

function taipeiDateMinute(at:number){
  try{
    const parts=new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hourCycle:'h23',
    }).formatToParts(new Date(at));
    const get=(type:string)=>parts.find(part=>part.type===type)?.value??'';
    return {
      date:`${get('year')}-${get('month')}-${get('day')}`,
      minute:(Number(get('hour'))||0)*60+(Number(get('minute'))||0),
    };
  }catch{
    const shifted=new Date(at+8*60*60*1000);
    return {
      date:shifted.toISOString().slice(0,10),
      minute:shifted.getUTCHours()*60+shifted.getUTCMinutes(),
    };
  }
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
  const baseline=holding.previousClose>0
    ?holding.previousClose
    :(session.points[0]?.price??holding.price);
  const values=session.points.map(item=>item.price);
  const pool=style==='cost'&&holding.costAvg>0?[...values,baseline,holding.costAvg]:[...values,baseline];
  const max=Math.max(...pool),min=Math.min(...pool),range=Math.max(.001,max-min);
  const x=(at:number)=>{
    const minute=taipeiDateMinute(at).minute;
    const ratio=Math.max(0,Math.min(1,(minute-SESSION_START_MINUTE)/SESSION_MINUTES));
    return ratio*innerWidth;
  };
  const y=(value:number)=>5+(max-value)/range*(HEIGHT-12);
  const points:Point[]=session.points.map(item=>({x:x(item.at),y:y(item.price),value:item.price,at:item.at}));
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
    accessibilityLabel={`${holding.symbol} 當日分時 ${LABELS[style]}圖，${session.date??'日期待取得'}，${points.length} 個實際分時點，昨收基準 ${baseline}，單點開啟完整圖表，連點切換樣式`}
    onPress={onPress}
    onLayout={event=>{const next=Math.round(event.nativeEvent.layout.width);if(next>0)setWidth(next);}}
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
  emptyWrap:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center'},
  emptyText:{fontSize:9,fontWeight:'800',color:'#718096'},
  openLabel:{position:'absolute',left:4,bottom:0,fontSize:7,color:'#64748B'},
  closeLabel:{position:'absolute',right:4,bottom:0,fontSize:7,color:'#64748B'},
});
