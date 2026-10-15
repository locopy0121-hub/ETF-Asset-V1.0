import {useMemo} from 'react';
import {View} from 'react-native';
import Svg,{Line,Polyline,Rect} from 'react-native-svg';
import {Text} from './EditableNative';
import type {DailyCandle} from '../market/twseDailyHistory';
import {computeTechnicalSignals} from '../market/marketTechnicalSignals';
import {useThemeRuntime} from '../theme/ThemeRuntime';

const W=320,H=92;
const point=(v:number,min:number,max:number)=>H-8-(v-min)/(Math.max(max-min,.00001))*(H-18);
const n=(v:number|null)=>v===null?'—':v.toFixed(2);
export function MarketTechnicalSignals({candles,selectedDate}:{candles:readonly DailyCandle[];selectedDate?:string|null}){
  const theme=useThemeRuntime();
  const signals=useMemo(()=>computeTechnicalSignals(candles).slice(-65),[candles]);
  const last=(selectedDate?signals.find(s=>s.date===selectedDate):null)??signals[signals.length-1];
  const colors={k:'#27B4AD',d:'#E25766',hist:'#D97851'};
  const kd=signals.filter(s=>s.k!==null&&s.d!==null);
  const macd=signals.filter(s=>s.dif!==null&&s.dea!==null&&s.histogram!==null);
  const draw=(rows:typeof signals,key:'k'|'d'|'dif'|'dea',min:number,max:number)=>{
    if(rows.length<2)return '';
    return rows.map((s,i)=>{
      const val=s[key];
      return val===null?'':((6+308*i/Math.max(rows.length-1,1)).toFixed(2)+','+point(val,min,max).toFixed(2));
    }).filter(Boolean).join(' ');
  };
  const spans=macd.flatMap(x=>[x.dif!,x.dea!,x.histogram!]);
  const max=Math.max(0,...spans,1e-6),min=Math.min(0,...spans,-1e-6);
  return <View style={{gap:8}}>
    <Text style={{color:theme.palette.textSecondary,fontSize:11}}>選取 K 棒：{last?.date??'尚無資料'}；副圖數值同步該日</Text>
    <Text style={{fontWeight:'800',fontSize:13,color:theme.palette.text}}>KD(9)｜K {n(last?.k??null)}　D {n(last?.d??null)}</Text>
    {kd.length<2?<Text style={{color:theme.palette.textSecondary,fontSize:11}}>KD 資料不足，至少需要 10 根 K 線。</Text>:
      <Svg width="100%" height={H} viewBox={'0 0 '+W+' '+H}>
        <Line x1={4} x2={316} y1={point(80,0,100)} y2={point(80,0,100)} stroke={theme.palette.border}/>
        <Line x1={4} x2={316} y1={point(20,0,100)} y2={point(20,0,100)} stroke={theme.palette.border}/>
        <Polyline points={draw(kd,'k',0,100)} fill="none" stroke={colors.k} strokeWidth={1.8}/>
        <Polyline points={draw(kd,'d',0,100)} fill="none" stroke={colors.d} strokeWidth={1.8}/>
      </Svg>}
    <Text style={{fontWeight:'800',fontSize:13,color:theme.palette.text}}>MACD(12,26,9)｜DIF {n(last?.dif??null)}　DEA {n(last?.dea??null)}</Text>
    {macd.length<2?<Text style={{color:theme.palette.textSecondary,fontSize:11}}>MACD 資料不足，至少需要 35 根 K 線。</Text>:
      <Svg width="100%" height={H} viewBox={'0 0 '+W+' '+H}>
        <Line x1={4} x2={316} y1={point(0,min,max)} y2={point(0,min,max)} stroke={theme.palette.border}/>
        {macd.map((s,i)=>{
          const x=6+308*i/Math.max(macd.length-1,1),zero=point(0,min,max),v=point(s.histogram!,min,max);
          return <Rect key={s.date} x={x-1.8} y={Math.min(zero,v)} width={3.6} height={Math.max(1,Math.abs(zero-v))}
            fill={s.histogram!>=0?colors.hist:colors.k}/>;
        })}
        <Polyline points={draw(macd,'dif',min,max)} fill="none" stroke={colors.k} strokeWidth={1.8}/>
        <Polyline points={draw(macd,'dea',min,max)} fill="none" stroke={colors.d} strokeWidth={1.8}/>
      </Svg>}
    <Text style={{fontSize:10,color:theme.palette.textSecondary}}>指標僅根據目前區間的官方日／週／月 K 線，不能視為預測；短期資料不足時不補造。</Text>
  </View>;
}
