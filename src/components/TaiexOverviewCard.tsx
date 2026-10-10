import {useEffect,useMemo,useState} from 'react';
import {View} from 'react-native';
import Svg,{Line,Polyline,Polygon,Circle} from 'react-native-svg';
import {Pressable,Text} from './EditableNative';
import {fetchOfficialTaiexHistory,fetchYahooTaiexIntraday,taiexSnapshot,type TaiexDaily,type TaiexIntraday} from '../market/taiexIndex';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useSystemColors} from '../theme/useSystemColors';

type Range='day'|'five'|'month'|'half'|'year';
const choices:readonly {key:Range;label:string}[]=[
 {key:'day',label:'1日'},{key:'five',label:'5日'},{key:'month',label:'1個月'},
 {key:'half',label:'6個月'},{key:'year',label:'1年'},
];
const fmt=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const signed=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)?(n>0?'+':'')+fmt(n):'—';
function Spark({points,color}:{points:readonly {x:number;y:number}[];color:string}){
 if(points.length<2)return <Text style={{fontSize:12,opacity:.7}}>尚無足夠走勢數據。</Text>;
 const width=318,height=140,pad=6;
 const values=points.map(p=>p.y),min=Math.min(...values),max=Math.max(...values);
 const range=Math.max(max-min,.001);
 const coords=points.map((p,i)=>({x:pad+(width-2*pad)*i/Math.max(points.length-1,1),
  y:height-pad-(p.y-min)/range*(height-2*pad)}));
 const poly=coords.map(p=>p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ');
 const area=coords[0]!.x+','+(height-pad)+' '+poly+' '+coords[coords.length-1]!.x+','+(height-pad);
 const last=coords[coords.length-1]!;
 return <Svg width="100%" height={height} viewBox={'0 0 '+width+' '+height}>
   {[.2,.5,.8].map(y=><Line key={y} x1={pad} x2={width-pad} y1={height*y} y2={height*y} stroke={color} opacity={.17} />)}
   <Polygon points={area} fill={color} opacity={.1}/>
   <Polyline points={poly} fill="none" strokeWidth={2.2} stroke={color} strokeLinejoin="round"/>
   <Circle cx={last.x} cy={last.y} r={3.5} fill={color}/>
 </Svg>;
}
export function TaiexOverviewCard(){
 const theme=useThemeRuntime(),system=useSystemColors();
 const [range,setRange]=useState<Range>('day');
 const [daily,setDaily]=useState<TaiexDaily[]>([]);
 const [intraday,setIntraday]=useState<TaiexIntraday|null>(null);
 const [refreshAt,setRefreshAt]=useState(0);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [intradayError,setIntradayError]=useState(false);
 const months=range==='year'?12:range==='half'?6:2;
 useEffect(()=>{
  let active=true;const controller=new AbortController();
  setLoading(true);setError(null);
  void fetchOfficialTaiexHistory(months,new Date(),controller.signal)
   .then(rows=>{if(active)setDaily(rows);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:'官方指數行情暫不可用');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;controller.abort();};
 },[months,refreshAt]);
 useEffect(()=>{
  let active=true;const controller=new AbortController();
  void fetchYahooTaiexIntraday(controller.signal)
    .then(data=>{if(active){setIntraday(data);setIntradayError(data===null);}})
    .catch(()=>{if(active){setIntraday(null);setIntradayError(true);}});
  return()=>{active=false;controller.abort();};
 },[refreshAt]);
 const overview=useMemo(()=>taiexSnapshot(daily,intraday),[daily,intraday]);
 const records=useMemo(()=>{
  const rows=daily.map(x=>({x:Date.parse(x.date),y:x.close}));
  if(range==='five')return rows.slice(-5);
  if(range==='month')return rows.slice(-23);
  if(range==='half'||range==='year')return rows;
  if(intraday&&intraday.date>=((daily[daily.length-1]?.date)??'')&&intraday.points.length>=2)
    return intraday.points.map(p=>({x:p.at,y:p.price}));
  return rows.slice(-5);
 },[daily,intraday,range]);
 const validIntraday=range==='day'&&intraday&&intraday.date>=((daily[daily.length-1]?.date)??'')&&intraday.points.length>=2;
 const positive=overview?.change!==null&&overview?.change!==undefined?overview.change>0:null;
 const color=positive===null?system.flat:overview!.change!>0?system.gain:overview!.change!<0?system.loss:system.flat;
 return <View style={{gap:10}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
     <View style={{gap:2}}>
       <Text style={{fontSize:18,fontWeight:'900',color:theme.palette.text}}>台股加權指數（TAIEX）</Text>
       <Text style={{fontSize:11,color:theme.palette.textSecondary}}>臺灣證交所發行量加權股價指數｜IX0001</Text>
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel="更新台股加權指數" onPress={()=>setRefreshAt(x=>x+1)}
       style={{padding:8,backgroundColor:theme.palette.surfaceMuted,borderRadius:8}}>
       <Text style={{color:theme.palette.primary,fontWeight:'800'}}>更新</Text>
     </Pressable>
   </View>
   {loading&&!overview?<Text style={{color:theme.palette.textSecondary}}>讀取官方指數資料中…</Text>:
     error&&!overview?<Text style={{color:theme.palette.textSecondary}}>{error}</Text>:
     overview?<View style={{gap:9}}>
       <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'baseline',gap:12}}>
         <Text editorReadOnly style={{fontSize:36,fontWeight:'900',color:color}}>{fmt(overview.value)}</Text>
         <Text editorReadOnly style={{fontSize:15,fontWeight:'800',color:color}}>
           {signed(overview.change)} ({signed(overview.changePct)}%)
         </Text>
       </View>
       <Text style={{fontSize:11,color:theme.palette.textSecondary}}>資料日期 {overview.date}｜{overview.source}{overview.asOf?'｜'+new Date(overview.asOf).toLocaleTimeString('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit'}):''}</Text>
       {error?<Text style={{fontSize:11,color:theme.palette.warning}}>最新官方資料未更新：{error}；顯示先前成功取得的資料。</Text>:null}
       <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
         {choices.map(x=><Pressable key={x.key} onPress={()=>setRange(x.key)}
           accessibilityRole="button" accessibilityState={{selected:range===x.key}}
           style={{paddingHorizontal:9,paddingVertical:6,borderRadius:14,backgroundColor:range===x.key?theme.palette.primary:theme.palette.surfaceMuted}}>
             <Text style={{fontSize:11,fontWeight:'800',color:range===x.key?'white':theme.palette.text}}>{x.label}</Text>
           </Pressable>)}
       </View>
       <Text style={{fontSize:11,color:theme.palette.textSecondary}}>
         {validIntraday?'分時走勢｜'+intraday!.date+'｜Yahoo（可能延遲）':'最近交易日官方收盤走勢｜非當日分時'}
         {intradayError&&range==='day'?'｜分時來源暫不可用':''}
       </Text>
       <Spark points={records} color={color}/>
       <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
         {([{label:'開盤',value:overview.open},{label:'最高',value:overview.high},
          {label:'最低',value:overview.low},{label:'昨收',value:overview.previousClose}] as const).map(row=>
           <View key={row.label} style={{width:'47%',padding:9,borderRadius:9,backgroundColor:theme.palette.surfaceMuted,flexDirection:'row',justifyContent:'space-between'}}>
             <Text style={{color:theme.palette.textSecondary,fontSize:12}}>{row.label}</Text>
             <Text editorReadOnly style={{color:theme.palette.text,fontWeight:'800',fontSize:12}}>{fmt(row.value)}</Text>
           </View>)}
       </View>
       <Text style={{fontSize:10,color:theme.palette.textSecondary}}>
         盤中有經驗證的延遲分時才更新指數；休市保留最後官方收盤資料。52 週高低須具完整年度資料，不以不足的資料估算。
       </Text>
     </View>:null}
 </View>;
}
