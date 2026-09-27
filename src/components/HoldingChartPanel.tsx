import {useMemo} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {DailyCandle} from '../market/twseDailyHistory';
import type {HoldingQuote} from '../domain/uiModels';
import {OfficialCandleChart} from './OfficialCandleChart';
import {colors,radius,spacing} from '../theme/tokens';

export const CHART_DATA_FIELDS=[
 {id:'ohlc',label:'官方日 K',source:'TWSE OHLCV',unit:'元'},
 {id:'close',label:'歷史收盤價',source:'TWSE',unit:'元'},
 {id:'volume',label:'歷史成交量',source:'TWSE',unit:'股'},
 {id:'cost',label:'含費成本均價',source:'正式持股',unit:'元'},
 {id:'marketValue',label:'目前市值',source:'正式持股',unit:'NT$'},
 {id:'pnl',label:'未實現損益',source:'正式持股',unit:'NT$'},
 {id:'dividend',label:'累積淨股息',source:'正式帳務',unit:'NT$'},
] as const;
export type ChartDataField=typeof CHART_DATA_FIELDS[number]['id'];
export type ChartRender='candles'|'line'|'bars';
export const DEFAULT_CHART_DATA:readonly ChartDataField[]=['ohlc'];
export function validChartFields(raw:unknown):ChartDataField[]{
 if(!Array.isArray(raw))return [...DEFAULT_CHART_DATA];
 const all=new Set<string>(CHART_DATA_FIELDS.map(field=>field.id));
 const unique=[...new Set(raw.filter((item):item is ChartDataField=>typeof item==='string'&&all.has(item)))];
 return unique.length?unique:[...DEFAULT_CHART_DATA];
}
export function officialChartValues(field:ChartDataField,candles:readonly DailyCandle[]){
 const rows=[...candles].filter(c=>[c.open,c.high,c.low,c.close,c.volume].every(Number.isFinite))
  .sort((a,b)=>a.date.localeCompare(b.date));
 return field==='close'?rows.map(row=>({label:row.date.slice(5),value:row.close})):
  field==='volume'?rows.map(row=>({label:row.date.slice(5),value:row.volume})):[];
}
export function holdingChartValue(field:ChartDataField,holding:HoldingQuote):number|null{
 const value=field==='cost'?holding.costAvg:field==='marketValue'?holding.marketValue:
  field==='pnl'?holding.pnl:field==='dividend'?holding.cumulativeDividend:null;
 if(value===null||!Number.isFinite(value))return null;
 if((field==='marketValue'||field==='pnl')&&holding.quoteVerified===false)return null;
 return value;
}
function NumericChart({points,kind,unit}:{points:readonly {label:string;value:number}[];kind:'line'|'bars';unit:string}){
 const valid=points.filter(point=>Number.isFinite(point.value));
 const min=Math.min(...valid.map(x=>x.value)),max=Math.max(...valid.map(x=>x.value));
 const low=Math.min(min,max-0.001),range=Math.max(0.001,max-low);
 const height=154,step=18;
 const chartWidth=Math.max(260,valid.length*step+8);
 const y=(value:number)=>10+(max-value)/range*(height-20);
 return <View style={styles.chartBox}>
  <Text style={styles.chartMeta}>實際資料 {valid.length} 筆｜{unit}｜最高 {max.toLocaleString('zh-TW')}｜最低 {min.toLocaleString('zh-TW')}</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator>
   <View style={{width:chartWidth,height:height+20,position:'relative'}}>
    {[0,.25,.5,.75,1].map((fraction,index)=><View key={index}
      style={{position:'absolute',left:0,right:0,top:10+fraction*(height-20),borderTopWidth:StyleSheet.hairlineWidth,borderColor:colors.border}}/>)}
    {valid.map((point,index)=>{
     const left=index*step+4;
     if(kind==='bars')return <View key={point.label+'-'+index}
       style={{position:'absolute',left,top:y(Math.max(0,point.value)),width:10,
        height:Math.max(1,Math.abs(y(point.value)-y(0))),backgroundColor:point.value>=0?colors.gain:colors.loss}}/>;
     const next=valid[index+1];
     const dy=next?y(next.value)-y(point.value):0;
     const length=Math.sqrt(step*step+dy*dy);
     return <View key={point.label+'-'+index}>
      <View style={{position:'absolute',left:left+2,top:y(point.value)-2,width:4,height:4,borderRadius:2,backgroundColor:colors.primary}}/>
      {next?<View style={{position:'absolute',left:left+4,top:y(point.value),width:length,height:2,
       backgroundColor:colors.primary,transform:[{translateX:(length-step)/2},{translateY:dy/2},{rotate:Math.atan2(dy,step)+'rad'}]}}/>:null}
     </View>;
    })}
    <Text style={{position:'absolute',left:4,bottom:1,fontSize:9,color:colors.textSecondary}}>{valid[0]?.label??''}</Text>
    <Text style={{position:'absolute',right:4,bottom:1,fontSize:9,color:colors.textSecondary}}>{valid[valid.length-1]?.label??''}</Text>
   </View>
  </ScrollView>
 </View>;
}
export function HoldingChartPanel({holding,candles,loading,error,rangeLabel,selected,onSelected,renderMode,onRenderMode}:{
 holding:HoldingQuote;candles:readonly DailyCandle[];loading:boolean;error:string|null;rangeLabel:string;
 selected:readonly ChartDataField[];onSelected:(next:ChartDataField[])=>void;
 renderMode:ChartRender;onRenderMode:(next:ChartRender)=>void;
}){
 const series=validChartFields(selected);
 const historical=useMemo(()=>new Map(CHART_DATA_FIELDS.map(field=>
  [field.id,officialChartValues(field.id,candles)] as const)),[candles]);
 return <View style={styles.root}>
  <Text style={styles.title}>圖表資料選擇（可複選）</Text>
  <View style={styles.options}>
   {CHART_DATA_FIELDS.map(field=><Pressable key={field.id} accessibilityRole="checkbox"
    accessibilityState={{checked:series.includes(field.id)}}
    onPress={()=>{const next=series.includes(field.id)?series.filter(x=>x!==field.id):[...series,field.id];if(next.length)onSelected(next);}}
    style={[styles.chip,series.includes(field.id)&&styles.active]}>
     <Text style={[styles.chipText,series.includes(field.id)&&styles.activeText]}>{series.includes(field.id)?'✓ ':''}{field.label}</Text>
   </Pressable>)}
  </View>
  <View style={styles.options}>
   {(['candles','line','bars'] as const).map(mode=><Pressable key={mode} accessibilityRole="button"
    accessibilityState={{selected:renderMode===mode}} onPress={()=>onRenderMode(mode)}
    style={[styles.chip,renderMode===mode&&styles.active]}>
    <Text style={[styles.chipText,renderMode===mode&&styles.activeText]}>{mode==='candles'?'K 線':mode==='line'?'折線':'柱狀'}</Text>
   </Pressable>)}
  </View>
  <Text style={styles.disclaimer}>只使用官方歷史行情及正式持股資料；無資料時不建立假走勢。日 K 必須使用完整 OHLC，其他資料依可用圖型呈現。</Text>
  {series.map(field=>{
   const item=CHART_DATA_FIELDS.find(entry=>entry.id===field)!;
   const isHistorical=field==='ohlc'||field==='close'||field==='volume';
   const values=historical.get(field)??[];
   const current=holdingChartValue(field,holding);
   return <View key={field} style={styles.panel}>
    <Text style={styles.seriesName}>{item.label}｜{item.source}</Text>
    {isHistorical?(loading?<Text style={styles.notice}>官方資料讀取中…</Text>:
     error?<Text style={styles.notice}>官方資料失敗：{error}</Text>:
     field==='ohlc'||renderMode==='candles'&&field==='close'?
      field==='ohlc'?<OfficialCandleChart candles={candles} loading={false} error={null} rangeLabel={rangeLabel}/>:
      values.length?<NumericChart points={values} kind="line" unit={item.unit}/>:<Text style={styles.notice}>尚無官方歷史資料</Text>:
      values.length?<NumericChart points={values} kind={renderMode==='line'?'line':'bars'} unit={item.unit}/>:<Text style={styles.notice}>尚無官方歷史資料</Text>):
     current===null?<Text style={styles.notice}>目前缺少可信資料，無法繪製此項目。</Text>:
     <View style={styles.current}>
      <Text style={styles.currentValue}>{current.toLocaleString('zh-TW',{maximumFractionDigits:2})} {item.unit}</Text>
      <Text style={styles.notice}>目前有效數值（單一時間點，不虛構歷史序列）</Text>
      <View style={{height:9,width:'100%',backgroundColor:colors.surfaceMuted,borderRadius:6}}>
       <View style={{height:9,width:'100%',backgroundColor:current>=0?colors.gain:colors.loss,borderRadius:6}}/>
      </View>
     </View>}
   </View>;
  })}
 </View>;
}
const styles=StyleSheet.create({
 root:{gap:10},title:{fontSize:14,fontWeight:'800',color:colors.text},
 options:{flexDirection:'row',flexWrap:'wrap',gap:6},
 chip:{paddingHorizontal:9,paddingVertical:7,borderWidth:1,borderColor:colors.border,borderRadius:radius.md},
 active:{backgroundColor:colors.primary,borderColor:colors.primary},
 chipText:{fontSize:11,fontWeight:'700',color:colors.textSecondary},
 activeText:{color:'#FFFFFF'},disclaimer:{fontSize:10,lineHeight:17,color:colors.textSecondary},
 panel:{gap:6,paddingVertical:8,borderTopWidth:StyleSheet.hairlineWidth,borderColor:colors.border},
 seriesName:{fontSize:12,fontWeight:'800',color:colors.text},
 notice:{fontSize:11,color:colors.textSecondary,lineHeight:19},
 current:{gap:5},currentValue:{fontSize:18,fontWeight:'900',color:colors.text},chartBox:{gap:5},
 chartMeta:{fontSize:10,color:colors.textSecondary}
});