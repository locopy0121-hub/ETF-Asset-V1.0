import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {View} from 'react-native';
import Svg,{Line,Polygon,Polyline} from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Pressable,Text} from './EditableNative';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useSystemColors} from '../theme/useSystemColors';
import {fetchTaiexHistory,fetchTaiexMis} from '../market/taiexIndexSource';
import {pickTaiexDisplay,selectTaiexHistory,taiex52WeekCloseRange,taipeiIndexDate,
  type IndexClose,type IndexPoint,type IndexRange,type IndexSnapshot} from '../market/taiexIndex';

const CACHE='@tf-asset/market-taiex-index-v1';
const HISTORY='@tf-asset/market-taiex-history-v1';
const POINTS='@tf-asset/market-taiex-points-v1';
const format=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)?
  n.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const signed=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)?(n>0?'+':'')+format(n):'—';
const ranges:readonly {id:IndexRange;label:string;months:number}[]=[
  {id:'d1',label:'1日',months:2},{id:'d5',label:'5日',months:2},{id:'m1',label:'1月',months:2},
  {id:'m6',label:'6月',months:7},{id:'ytd',label:'今年',months:13},{id:'y1',label:'1年',months:13},
];
function PriceLine({values,color}:{values:readonly IndexPoint[];color:string}){
  const theme=useThemeRuntime();
  if(values.length<2)return <Text style={{color:theme.palette.textSecondary,fontSize:12,paddingVertical:20}}>
    尚無足夠實際走勢資料；不以模擬數據填補。</Text>;
  const sorted=[...values].sort((a,b)=>a.at-b.at);
  const all=sorted.map(v=>v.value),max=Math.max(...all),min=Math.min(...all);
  const dx=Math.max(1,sorted[sorted.length-1]!.at-sorted[0]!.at);
  const dy=Math.max(.01,max-min),bottom=132;
  const points=sorted.map(v=>({
    x:6+308*(v.at-sorted[0]!.at)/dx,
    y:119-104*(v.value-min)/dy,
  }));
  const poly=points.map(v=>v.x.toFixed(2)+','+v.y.toFixed(2)).join(' ');
  const area=points[0]!.x.toFixed(2)+','+bottom+' '+poly+' '+points[points.length-1]!.x.toFixed(2)+','+bottom;
  return <View style={{gap:4}}>
    <Svg width="100%" height={134} viewBox="0 0 320 134">
      {[15,67,119].map(y=><Line key={y} x1={5} x2={315} y1={y} y2={y} stroke={theme.palette.border}/>)}
      <Polygon points={area} fill={color} opacity={.12}/>
      <Polyline points={poly} stroke={color} strokeWidth={2.1} fill="none" strokeLinejoin="round" strokeLinecap="round"/>
    </Svg>
    <View style={{flexDirection:'row',justifyContent:'space-between'}}>
      <Text style={{fontSize:10,color:theme.palette.textSecondary}}>低 {format(min)}</Text>
      <Text style={{fontSize:10,color:theme.palette.textSecondary}}>高 {format(max)}</Text>
    </View>
  </View>;
}
function IndexMetric({label,value}:{label:string;value:string}){
  const theme=useThemeRuntime();
  return <View style={{width:'47%',gap:2,flexGrow:1}}>
    <Text style={{color:theme.palette.textSecondary,fontSize:11}}>{label}</Text>
    <Text editorReadOnly style={{color:theme.palette.text,fontSize:14,fontWeight:'700'}}>{value}</Text>
  </View>;
}
/** Market page only: UI adapter, no edits to holdings, native SaiETF or system settings. */
export function TaiexIndexCard({marketVersion,phase}:{
  marketVersion:number;phase:'live'|'afterHours'|'offline'
}){
  const theme=useThemeRuntime(),system=useSystemColors();
  const [range,setRange]=useState<IndexRange>('d1');
  const [mis,setMis]=useState<IndexSnapshot|null>(null);
  const [history,setHistory]=useState<IndexClose[]>([]);
  const [points,setPoints]=useState<IndexPoint[]>([]);
  const [busy,setBusy]=useState(false),[historyBusy,setHistoryBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const lastReq=useRef(0),inFlight=useRef(false);
  const today=taipeiIndexDate();
  const display=useMemo(()=>pickTaiexDisplay(mis,history,today,phase),[mis,history,today,phase]);
  const chartData=useMemo<IndexPoint[]>(()=>range==='d1'?points:
    selectTaiexHistory(history,range,today).map(row=>({at:Date.parse(row.date+'T12:00:00Z'),value:row.close})),[range,history,points,today]);
  const oneYearRange=useMemo(()=>taiex52WeekCloseRange(history,today),[history,today]);

  useEffect(()=>{
    let alive=true;
    void Promise.all([AsyncStorage.getItem(CACHE),AsyncStorage.getItem(HISTORY),AsyncStorage.getItem(POINTS)])
      .then(([snapshotRaw,historyRaw,pointsRaw])=>{
        if(!alive)return;
        try{
          if(snapshotRaw){
            const old=JSON.parse(snapshotRaw) as IndexSnapshot;
            if(old?.source==='TWSE MIS'&&typeof old.value==='number'&&old.value>0&&
              /^\d{4}-\d\d-\d\d$/.test(old.date))setMis(current=>!current||current.date<=old.date?old:current);
          }
          if(historyRaw){
            const saved=JSON.parse(historyRaw) as IndexClose[];
            if(Array.isArray(saved)){
              const rows=saved.filter(x=>x?.source==='TWSE FMTQIK'&&x.close>0&&/^\d{4}-\d\d-\d\d$/.test(x.date));
              setHistory(current=>current.length>=rows.length?current:rows);
            }
          }
          if(pointsRaw){
            const data=JSON.parse(pointsRaw) as {date?:string;rows?:IndexPoint[]};
            if(data.date===today&&Array.isArray(data.rows))
              setPoints(current=>current.length?current:data.rows!.filter(x=>Number.isFinite(x.at)&&x.value>0).slice(-500));
          }
        }catch{/* corrupted cache must not block live fetch */}
      }).catch(()=>{});
    return()=>{alive=false;};
  },[]);

  const refresh=useCallback(async(force=false)=>{
    if(inFlight.current||!force&&Date.now()-lastReq.current<20000)return;
    inFlight.current=true;lastReq.current=Date.now();setBusy(true);
    try{
      const snapshot=await fetchTaiexMis();
      if(snapshot){
        setMis(previous=>!previous||snapshot.date>previous.date||
          snapshot.date===previous.date&&snapshot.sourceAt>=previous.sourceAt?snapshot:previous);
        void AsyncStorage.setItem(CACHE,JSON.stringify(snapshot)).catch(()=>{});
        if(snapshot.date===taipeiIndexDate()&&phase==='live'){
          setPoints(before=>{
            const next=[...before.filter(x=>x.at!==snapshot.sourceAt),{at:snapshot.sourceAt,value:snapshot.value}].sort((a,b)=>a.at-b.at).slice(-500);
            return next;
          });
        }
        setError(null);
      }else{
        setError('MIS 目前無有效指數成交快照，改以最後已公告收盤資料顯示。');
      }
    }catch(e){setError('即時指數來源暫不可用：'+(e instanceof Error?e.message:String(e)));}
    finally{inFlight.current=false;setBusy(false);}
  },[phase]);
  // The TAIEX display is read-only and piggybacks on market snapshots, without a new global polling law.
  useEffect(()=>{void refresh();},[marketVersion,refresh]);
  useEffect(()=>{
    if(!points.length)return;
    void AsyncStorage.setItem(POINTS,JSON.stringify({date:today,rows:points})).catch(()=>{});
  },[points,today]);
  useEffect(()=>{
    if(range==='d1')return;
    const abort=new AbortController();
    return ()=>abort.abort();
  },[range]);
  useEffect(()=>{
    const controller=new AbortController();let live=true;
    const months=ranges.find(x=>x.id===range)?.months??2;
    setHistoryBusy(true);
    void fetchTaiexHistory(months,new Date(),controller.signal)
      .then(data=>{
        if(!live)return;
        setHistory(current=>{
          const merged=[...new Map([...current,...data].map(x=>[x.date,x] as const)).values()].sort((a,b)=>a.date.localeCompare(b.date));
          void AsyncStorage.setItem(HISTORY,JSON.stringify(merged.slice(-290))).catch(()=>{});
          return merged;
        });
      })
      .catch(e=>{if(live)setError('歷史指數來源暫時無法取得：'+(e instanceof Error?e.message:String(e)));})
      .finally(()=>{if(live)setHistoryBusy(false);});
    return()=>{live=false;controller.abort();};
  },[range]);
  const change=display?.change??null;
  const tone=change===null?theme.palette.text:change>0?system.gain:change<0?system.loss:system.flat;
  const status=display?.live?'盤中即時快照':display?.fromClose?'官方最後收盤':'最後有效行情快照';
  const sourceTime=display?.sourceAt?new Date(display.sourceAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'—';

  return <View style={{gap:10}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:6}}>
      <View style={{flex:1}}>
        <Text style={{color:theme.palette.text,fontSize:16,fontWeight:'900'}}>臺灣加權股價指數（TAIEX）</Text>
        <Text style={{color:theme.palette.textSecondary,fontSize:11}}>TWSE TAIEX｜非交易標的</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="更新加權指數" onPress={()=>void refresh(true)}
        style={{paddingHorizontal:11,paddingVertical:7,borderRadius:9,backgroundColor:theme.palette.surfaceMuted}}>
        <Text style={{color:theme.palette.primary,fontWeight:'700',fontSize:11}}>{busy?'更新中…':'更新'}</Text>
      </Pressable>
    </View>
    <View style={{flexDirection:'row',alignItems:'flex-end',flexWrap:'wrap',gap:8}}>
      <Text editorReadOnly style={{color:tone,fontSize:33,fontWeight:'900'}}>{format(display?.value)}</Text>
      <Text editorReadOnly style={{color:tone,fontSize:14,fontWeight:'800',paddingBottom:5}}>
        {signed(change)} ({display?.percent!==null&&display?.percent!==undefined?signed(display.percent)+'%':'—'})
      </Text>
    </View>
    <Text style={{fontSize:11,color:theme.palette.textSecondary}}>
      {status}｜{display?.date??'尚無日期'}｜{sourceTime}｜{display?.source??'TWSE'}
    </Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:5}}>
      {ranges.map(item=><Pressable key={item.id} onPress={()=>setRange(item.id)} accessibilityRole="button"
        accessibilityState={{selected:range===item.id}} style={{borderRadius:18,paddingHorizontal:10,paddingVertical:6,backgroundColor:range===item.id?theme.palette.primary:theme.palette.surfaceMuted}}>
        <Text style={{fontSize:11,color:range===item.id?'white':theme.palette.text,fontWeight:'700'}}>{item.label}</Text>
      </Pressable>)}
    </View>
    {historyBusy?<Text style={{color:theme.palette.textSecondary,fontSize:10}}>讀取官方歷史收盤指數中…</Text>:null}
    <PriceLine values={chartData} color={tone}/>
    {range==='d1'?<Text style={{color:theme.palette.textSecondary,fontSize:10}}>日內曲線僅使用本機當日實際取得的官方指數快照；未蒐集到的時段不補造。其他期間使用 TWSE 公告每日收盤指數。</Text>:
      <Text style={{color:theme.palette.textSecondary,fontSize:10}}>期間走勢為 TWSE FMTQIK 逐交易日收盤點位，非盤中逐筆走勢。</Text>}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:11}}>
      <IndexMetric label="開盤指數（MIS）" value={format(display?.open)}/>
      <IndexMetric label="前收指數" value={format(display?.previousClose)}/>
      <IndexMetric label="當日最高（MIS）" value={format(display?.high)}/>
      <IndexMetric label="當日最低（MIS）" value={format(display?.low)}/>
      <IndexMetric label="52週收盤高點" value={oneYearRange?format(oneYearRange.high):'切換「1年」核實'}/>
      <IndexMetric label="52週收盤低點" value={oneYearRange?format(oneYearRange.low):'切換「1年」核實'}/>
    </View>
    {error?<Text style={{fontSize:11,color:theme.palette.textSecondary}}>{error}</Text>:null}
    <Text style={{fontSize:10,color:theme.palette.textSecondary}}>官方來源：TWSE MIS／FMTQIK。休市顯示最後有效收盤，不以「待取得」代替。開高低僅在當日 MIS 核實後顯示，且與 52 週收盤極值定義不同。</Text>
  </View>;
}
