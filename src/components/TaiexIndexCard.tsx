import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {StyleSheet,View,type StyleProp,type TextStyle} from 'react-native';
import Svg,{Circle,Line,Polyline} from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Pressable,Text} from './EditableNative';
import {useLayoutRuntime} from '../editor/LayoutSelectionContext';
import {usePageEditor} from '../editor/pageEditor';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useSystemColors} from '../theme/useSystemColors';
import {colorWithAlpha} from '../maintenance/frameEffects';
import {fetchTaiexHistory,fetchTaiexMis,fetchTaiexRecentOhlc} from '../market/taiexIndexSource';
import {TAIEX_EXPLANATIONS} from './taiexExplanations';
import {indexThreeGates,pickTaiexDisplay,selectTaiexHistory,taiex52WeekCloseRange,taipeiIndexDate,taiexStatusLabel,
  type TaiexDailyOhlc,type IndexThreeGates,type IndexClose,type IndexPoint,type IndexRange,type IndexSnapshot} from '../market/taiexIndex';

const CACHE='@tf-asset/market-taiex-index-v1';
const HISTORY='@tf-asset/market-taiex-history-v1';
const POINTS='@tf-asset/market-taiex-points-v1';
const OHLC='@tf-asset/market-taiex-daily-ohlc-v1';
const format=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)?
  n.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const signed=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)?(n>0?'+':'')+format(n):'—';
const ranges:readonly {id:IndexRange;label:string;months:number}[]=[
  {id:'d1',label:'1日',months:2},{id:'d5',label:'5日',months:2},{id:'m1',label:'1月',months:2},
  {id:'m6',label:'6月',months:7},{id:'ytd',label:'今年',months:13},{id:'y1',label:'1年',months:13},
];
function PriceLine({values,color,levels,intraday}:{values:readonly IndexPoint[];color:string;levels:IndexThreeGates|null;intraday:boolean}){
  const theme=useThemeRuntime();
  const sorted=[...values].filter(x=>Number.isFinite(x.at)&&Number.isFinite(x.value)&&x.value>0)
    .sort((a,b)=>a.at-b.at);
  if(!sorted.length&&!levels)return <Text style={{color:theme.palette.textSecondary,fontSize:12,paddingVertical:20}}>
    尚無可核實的當日走勢或三關價資料，不以模擬點填補。</Text>;
  const prices=sorted.map(x=>x.value);
  const all=[...prices,...(levels?[levels.upper,levels.middle,levels.lower]:[])];
  const rawMin=Math.min(...all),rawMax=Math.max(...all);
  const padding=Math.max(1,(rawMax-rawMin)*.07);
  const min=rawMin-padding,max=rawMax+padding;
  const y=(v:number)=>118-101*(v-min)/(max-min);
  const at0=sorted[0]?.at??0;
  const chartEnd=sorted[sorted.length-1]?.at??at0;
  // Isolated or sparse app snapshots are points, never a fabricated all-day trend.
  // Disconnected segments must not be bridged across a sampling gap > ten minutes.
  const segments:IndexPoint[][]=[];
  for(const sample of sorted){
    const latest=segments[segments.length-1];
    if(!latest||(intraday&&sample.at-latest[latest.length-1]!.at>10*60*1000))segments.push([sample]);
    else latest.push(sample);
  }
  const x=(at:number)=>sorted.length<2||chartEnd===at0?160:8+304*(at-at0)/(chartEnd-at0);
  const gates=levels?[
    {name:'上關',value:levels.upper,color:'#DA3A40'},
    {name:'中關',value:levels.middle,color:'#B68A21'},
    {name:'下關',value:levels.lower,color:'#169C64'},
  ]:[];
  return <View style={{gap:5}}>
    <Svg width="100%" height={134} viewBox="0 0 320 134">
      {[17,67,118].map(gy=><Line key={'grid'+gy} x1={6} x2={314} y1={gy} y2={gy} stroke={theme.palette.border}/>)}
      {gates.map(g=><Line key={g.name} x1={6} x2={314} y1={y(g.value)} y2={y(g.value)}
        stroke={g.color} strokeWidth={1.4} strokeDasharray="5 4"/>)}
      {segments.filter(segment=>segment.length>1).map((segment,i)=><Polyline key={'segment'+i}
        points={segment.map(p=>x(p.at).toFixed(1)+','+y(p.value).toFixed(1)).join(' ')}
        stroke={color} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round"/>)}
      {sorted.map((p,i)=><Circle key={'quote'+i} cx={x(p.at)} cy={y(p.value)}
        r={sorted.length<4?3:1.25} fill={color}/>)}
    </Svg>
    {prices.length?<View style={{flexDirection:'row',justifyContent:'space-between'}}>
      <Text style={{fontSize:10,color:theme.palette.textSecondary}}>已蒐集點位低 {format(Math.min(...prices))}</Text>
      <Text style={{fontSize:10,color:theme.palette.textSecondary}}>已蒐集點位高 {format(Math.max(...prices))}</Text>
    </View>:null}
    {sorted.length<2?<Text style={{fontSize:10,color:theme.palette.textSecondary}}>
      走勢快照不足，僅顯示可核實參考關卡，不連接不存在的行情。</Text>:null}
  </View>;
}
/** Named targets share the page editor's persisted visual overrides.
 * Values remain read-only; editing only changes appearance, never market data.
 */
function IndexEditableText({id,label,kind,style,children,profitTone='neutral',editableContent=false'}:{
  id:string;label:string;kind:'text'|'value';style:StyleProp<TextStyle>;children:ReactNode;
  profitTone?:'gain'|'loss'|'neutral';editableContent?:boolean;
}){
  const runtime=useLayoutRuntime();
  const editor=usePageEditor('market');
  const profitColors=useSystemColors();
  const override=(runtime.active?runtime.targets:editor.displayConfig.layoutTargets)?.[id];
  const toneColor=profitTone==='gain'?profitColors.gain:profitTone==='loss'?profitColors.loss:profitColors.flat;
  const selectedColor=override?.textProfitColor===true?toneColor:override?.textColor;
  const resolvedColor=selectedColor&&override?.textOpacity!==undefined?
    colorWithAlpha(selectedColor,override.textOpacity):selectedColor;
  const visual:TextStyle={
    ...(override?.fontSize!==undefined?{fontSize:override.fontSize}:{}),
    ...(resolvedColor!==undefined?{color:resolvedColor}:{}),
    ...(override?.fontWeight!==undefined?{fontWeight:override.fontWeight}:{}),
    ...(override?.fontStyle!==undefined?{fontStyle:override.fontStyle}:{}),
    ...(override?.fontFamily!==undefined?{fontFamily:override.fontFamily==='system'?undefined:override.fontFamily}:{}),
    ...(override?.textDecorationLine!==undefined?{textDecorationLine:override.textDecorationLine}:{}),
    ...(override?.letterSpacing!==undefined?{letterSpacing:override.letterSpacing}:{}),
    ...(override?.lineHeight!==undefined&&override.lineHeight>0?{lineHeight:override.lineHeight}:{}),
    ...(override?.align!==undefined?{textAlign:override.align}:{}),
    ...(override?.width!==undefined?{width:override.width}:{}),
    ...(override?.height!==undefined?{height:override.height}:{}),
    ...(override?.backgroundColor!==undefined?{backgroundColor:colorWithAlpha(override.backgroundColor,override.backgroundOpacity??1)}:{}),
    ...(override?.borderColor!==undefined?{borderColor:colorWithAlpha(override.borderColor,override.borderOpacity??1)}:{}),
    ...(override?.borderWidth!==undefined?{borderWidth:override.borderWidth}:{}),
    ...(override?.borderRadius!==undefined?{borderRadius:override.borderRadius}:{}),
    ...(override?.padding!==undefined?{padding:override.padding}:{}),
    ...(override?.opacity!==undefined?{opacity:override.opacity}:{}),
  };
  const content=<Text editorId={id} editorReadOnly style={[StyleSheet.flatten(style),visual]}>{editableContent&&override?.labelText!==undefined?override.labelText:children}</Text>;
  if(!runtime.active)return content;
  return <Pressable accessibilityRole="button" accessibilityLabel={'編輯'+label}
    onPress={()=>runtime.onSelect?.({id,label,kind})}
    style={[{borderRadius:5,alignSelf:'flex-start',maxWidth:'100%'},
      runtime.selectedId===id?{borderWidth:2,borderColor:'#0969DA'}:undefined]}>
    <View pointerEvents="none">{content}</View>
  </Pressable>;
}
/** The control and its caption are independent persisted editor targets. */
function IndexEditableButton({id,label,active=false,onPress,children}:{
  id:string;label:string;active?:boolean;onPress:()=>void;children:ReactNode;
}){
  const runtime=useLayoutRuntime();
  const editor=usePageEditor('market');
  const theme=useThemeRuntime();
  const override=(runtime.active?runtime.targets:editor.displayConfig.layoutTargets)?.[id];
  const style={
    borderRadius:override?.borderRadius??18,
    paddingHorizontal:override?.padding??10,
    paddingVertical:override?.padding??7,
    backgroundColor:override?.backgroundColor??(active?theme.palette.primary:theme.palette.surfaceMuted),
    ...(override?.borderColor?{borderColor:override.borderColor}:{}),
    ...(override?.borderWidth!==undefined?{borderWidth:override.borderWidth}:{}),
    ...(override?.width!==undefined?{width:override.width}:{}),
    ...(override?.height!==undefined?{height:override.height}:{}),
    ...(override?.opacity!==undefined?{opacity:override.opacity}:{}),
    ...(override?.marginVertical!==undefined?{marginVertical:override.marginVertical}:{}),
    ...(override?.marginHorizontal!==undefined?{marginHorizontal:override.marginHorizontal}:{}),
  };
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    onPress={()=>runtime.active?runtime.onSelect?.({id,kind:'button',label}):onPress()}
    style={[style,runtime.active&&runtime.selectedId===id?{borderWidth:2,borderColor:'#0969DA'}:undefined]}>
    <IndexEditableText id={id+':label'} label={label+'文字'} kind="text" editableContent
      style={{fontSize:11,fontWeight:'700',color:active?'#FFFFFF':theme.palette.text}}>
      {children}
    </IndexEditableText>
  </Pressable>;
}
function IndexEditableChart({children}:{children:ReactNode}){
  const runtime=useLayoutRuntime();
  const editor=usePageEditor('market');
  const id='market:index:chart';
  const override=(runtime.active?runtime.targets:editor.displayConfig.layoutTargets)?.[id];
  const body=<View style={[
    override?.width!==undefined?{width:override.width}:undefined,
    override?.height!==undefined?{height:override.height,overflow:'hidden'}:undefined,
    override?.backgroundColor!==undefined?{backgroundColor:colorWithAlpha(override.backgroundColor,override.backgroundOpacity??1)}:undefined,
    override?.borderWidth!==undefined?{borderWidth:override.borderWidth}:undefined,
    override?.borderColor!==undefined?{borderColor:colorWithAlpha(override.borderColor,override.borderOpacity??1)}:undefined,
    override?.borderRadius!==undefined?{borderRadius:override.borderRadius}:undefined,
    override?.padding!==undefined?{padding:override.padding}:undefined,
    override?.opacity!==undefined?{opacity:override.opacity}:undefined,
  ]}>{children}</View>;
  if(!runtime.active)return body;
  return <Pressable accessibilityRole="button" accessibilityLabel="編輯加權指數走勢圖"
    onPress={()=>runtime.onSelect?.({id,kind:'card',label:'加權指數走勢圖'})}
    style={runtime.selectedId===id?{borderWidth:2,borderColor:'#0969DA',borderRadius:8}:undefined}>
      <View pointerEvents="none">{body}</View>
  </Pressable>;
}
function IndexMetric({id,label,value}:{id:string;label:string;value:string}){
  const theme=useThemeRuntime();
  return <View style={{width:'47%',gap:2,flexGrow:1}}>
    <IndexEditableText id={'market:index:'+id+':label'} label={label+'標題'} kind="text"
      style={{color:theme.palette.textSecondary,fontSize:11}}>{label}</IndexEditableText>
    <IndexEditableText id={'market:index:'+id+':value'} label={label+'數值'} kind="value"
      style={{color:theme.palette.text,fontSize:14,fontWeight:'700'}}>{value}</IndexEditableText>
  </View>;
}
/** Market page only: UI adapter, no edits to holdings, native SaiETF or system settings. */
export function TaiexIndexCard({marketVersion,phase}:{
  marketVersion:number;phase:'live'|'afterHours'|'offline'
}){
  const theme=useThemeRuntime(),system=useSystemColors();
  const layoutPreview=useLayoutRuntime();
  const [range,setRange]=useState<IndexRange>('d1');
  const [mis,setMis]=useState<IndexSnapshot|null>(null);
  const [history,setHistory]=useState<IndexClose[]>([]);
  const [points,setPoints]=useState<IndexPoint[]>([]);
  const [ohlc,setOhlc]=useState<TaiexDailyOhlc[]>([]);
  const [gatesOn,setGatesOn]=useState(true);
  const [busy,setBusy]=useState(false),[historyBusy,setHistoryBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const lastReq=useRef(0),inFlight=useRef(false);
  const today=taipeiIndexDate();
  const display=useMemo(()=>pickTaiexDisplay(mis,history,today,phase),[mis,history,today,phase]);
  const chartData=useMemo<IndexPoint[]>(()=>range==='d1'?points:
    selectTaiexHistory(history,range,today).map(row=>({at:Date.parse(row.date+'T12:00:00Z'),value:row.close})),[range,history,points,today]);
  const oneYearRange=useMemo(()=>taiex52WeekCloseRange(history,today),[history,today]);
  const expectedPreviousDate=useMemo(()=>display?.date?
    [...history].filter(x=>x.date<display.date).sort((a,b)=>a.date.localeCompare(b.date)).at(-1)?.date:null,
    [history,display?.date]);
  const gates=useMemo(()=>{
    const calculated=display?.date?indexThreeGates(ohlc,display.date):null;
    return calculated&&expectedPreviousDate===calculated.referenceDate?calculated:null;
  },[ohlc,display?.date,expectedPreviousDate]);
  const dailyOhlc=useMemo(()=>ohlc.find(x=>x.date===display?.date&&
    Math.abs(x.close-(display?.value??0))<0.1)??null,[ohlc,display?.date,display?.value]);
  const plotPoints=useMemo(()=>range==='d1'?
    chartData.filter(p=>display?.date===taipeiIndexDate(new Date(p.at))):chartData,
    [range,chartData,display?.date]);

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

  // Preview is strictly offline; the live card loads verified TWSE OHLC for three gates.
  useEffect(()=>{
    let alive=true;
    void AsyncStorage.getItem(OHLC).then(raw=>{
      if(!alive||!raw)return;
      const cached=JSON.parse(raw) as TaiexDailyOhlc[];
      if(Array.isArray(cached))setOhlc(cached.filter(x=>x?.source==='TWSE MI_5MINS_HIST'&&
        typeof x.high==='number'&&typeof x.low==='number'&&x.high>=x.low).slice(-55));
    }).catch(()=>{});
    return()=>{alive=false;};
  },[]);
  useEffect(()=>{
    if(layoutPreview.active)return;
    const abort=new AbortController();let alive=true;
    void fetchTaiexRecentOhlc(new Date(),abort.signal).then(data=>{
      if(!alive||!data.length)return;
      setOhlc(data);
      void AsyncStorage.setItem(OHLC,JSON.stringify(data)).catch(()=>{});
    }).catch(()=>{});
    return()=>{alive=false;abort.abort();};
  },[layoutPreview.active,today]);
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
  useEffect(()=>{if(!layoutPreview.active)void refresh();},[marketVersion,refresh,layoutPreview.active]);
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
    // A settings preview reads the saved official snapshot; it never initiates another network request.
    if(layoutPreview.active)return;
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
  },[range,layoutPreview.active]);
  const change=display?.change??null;
  const tone=change===null?theme.palette.text:change>0?system.gain:change<0?system.loss:system.flat;
  const status=display?.live?'盤中即時快照':display?.fromClose?'官方最後收盤':'最後有效行情快照';

  return <View style={{gap:10}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:6}}>
      <View style={{flex:1}}>
        <IndexEditableText id="market:index:title" label="加權指數標題" kind="text" style={{color:theme.palette.text,fontSize:16,fontWeight:'900'}}>臺灣加權股價指數（TAIEX）</IndexEditableText>
        <IndexEditableText id="market:index:subtitle" label="指數副標題" kind="text" style={{color:theme.palette.textSecondary,fontSize:11}}>TWSE TAIEX｜非交易標的</IndexEditableText>
      </View>
      <IndexEditableButton id="market:index:refresh:button" label="更新加權指數" onPress={()=>{if(!layoutPreview.active)void refresh(true);}}>
        {busy?'更新中…':'更新'}
      </IndexEditableButton>
    </View>
    <View style={{flexDirection:'row',alignItems:'flex-end',flexWrap:'wrap',gap:8}}>
      <IndexEditableText id="market:index:value" label="加權指數數值" kind="value" profitTone={change===null?'neutral':change>0?'gain':change<0?'loss':'neutral'} style={{color:tone,fontSize:33,fontWeight:'900'}}>{format(display?.value)}</IndexEditableText>
      <IndexEditableText id="market:index:change" label="加權指數漲跌" kind="value" profitTone={change===null?'neutral':change>0?'gain':change<0?'loss':'neutral'} style={{color:tone,fontSize:14,fontWeight:'800',paddingBottom:5}}>
        {signed(change)} ({display?.percent!==null&&display?.percent!==undefined?signed(display.percent)+'%':'—'})
      </IndexEditableText>
    </View>
    <IndexEditableText id="market:index:status" label="指數行情狀態" kind="text" style={{fontSize:11,color:theme.palette.textSecondary}}>
      {taiexStatusLabel(status,display)}
    </IndexEditableText>
    <IndexEditableText id="market:index:source-list" label="指數資料來源總覽" kind="text"
      style={{fontSize:10,color:theme.palette.textSecondary}}>
      官方行情來源：TWSE MIS／FMTQIK；三關價：TWSE MI_5MINS_HIST
    </IndexEditableText>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:5}}>
      {ranges.map(item=><IndexEditableButton key={item.id} id={'market:index:range:'+item.id+':button'}
        label={'指數區間 '+item.label} active={range===item.id} onPress={()=>{if(!layoutPreview.active)setRange(item.id);}}>
        {item.label}
      </IndexEditableButton>)}
      <IndexEditableButton id="market:index:three-gates:button" label="顯示或隱藏三關價"
        active={gatesOn} onPress={()=>{if(!layoutPreview.active)setGatesOn(v=>!v);}}>
        三關價{gatesOn?' ✓':''}
      </IndexEditableButton>
    </View>
    {historyBusy?<IndexEditableText id="market:index:note:loading" label="讀取進度說明" kind="text" style={{color:theme.palette.textSecondary,fontSize:10}}>讀取官方歷史收盤指數中…</IndexEditableText>:null}
    <IndexEditableChart><PriceLine values={plotPoints} color={tone}
      levels={range==='d1'&&gatesOn?gates:null} intraday={range==='d1'}/></IndexEditableChart>
    {range==='d1'&&gatesOn?<View style={{gap:3}}>
      <IndexEditableText id="market:index:gates:title" label="三關價標題" kind="text"
        style={{color:theme.palette.text,fontWeight:'800',fontSize:12}}>三關價（前一交易日高低推算）</IndexEditableText>
      {gates?<View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:6}}>
        {[{id:'upper',title:'上關價',value:gates.upper,color:'#DA3A40'},
          {id:'middle',title:'中關價',value:gates.middle,color:'#B68A21'},
          {id:'lower',title:'下關價',value:gates.lower,color:'#169C64'}].map(g=><View key={g.id} style={{gap:2}}>
          <IndexEditableText id={'market:index:gates:'+g.id+':label'} label={g.title+'標籤'} kind="text"
            style={{fontSize:10,color:g.color}}>{g.title}</IndexEditableText>
          <IndexEditableText id={'market:index:gates:'+g.id+':value'} label={g.title+'數值'} kind="value"
            style={{fontSize:13,fontWeight:'800',color:g.color}}>{format(g.value)}</IndexEditableText>
        </View>)}
      </View>:<IndexEditableText id="market:index:gates:unavailable" label="三關價資料不足訊息" kind="text"
        style={{fontSize:11,color:theme.palette.textSecondary}}>上一交易日官方高低指數尚未核實，不顯示假設關卡。</IndexEditableText>}
      <IndexEditableText id="market:index:gates:reference" label="三關價計算基準日期" kind="text"
        style={{fontSize:10,color:theme.palette.textSecondary}}>基準交易日：{gates?.referenceDate??'待核實'}｜來源 TWSE MI_5MINS_HIST</IndexEditableText>
    </View>:null}
    <IndexEditableText id="market:index:note:gates" label="三關價公式說明" kind="text" editableContent
      style={{color:theme.palette.textSecondary,fontSize:10}}>{TAIEX_EXPLANATIONS['market:index:note:gates']}</IndexEditableText>
    {range==='d1'?<IndexEditableText id="market:index:note:live" label="盤中走勢說明" kind="text" editableContent
      style={{color:theme.palette.textSecondary,fontSize:10}}>{TAIEX_EXPLANATIONS['market:index:note:live']}</IndexEditableText>:
      <IndexEditableText id="market:index:note:history" label="歷史走勢說明" kind="text" editableContent
        style={{color:theme.palette.textSecondary,fontSize:10}}>{TAIEX_EXPLANATIONS['market:index:note:history']}</IndexEditableText>}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:11}}>
      <IndexMetric id="open" label="開盤指數（MIS）" value={format(display?.open)}/>
      <IndexMetric id="previous" label="前收指數" value={format(display?.previousClose)}/>
      <IndexMetric id="high" label={dailyOhlc?'當日最高（TWSE）':'當日最高（MIS）'} value={format(dailyOhlc?.high??display?.high)}/>
      <IndexMetric id="low" label={dailyOhlc?'當日最低（TWSE）':'當日最低（MIS）'} value={format(dailyOhlc?.low??display?.low)}/>
      <IndexMetric id="year-high" label="52週收盤高點" value={oneYearRange?format(oneYearRange.high):'切換「1年」核實'}/>
      <IndexMetric id="year-low" label="52週收盤低點" value={oneYearRange?format(oneYearRange.low):'切換「1年」核實'}/>
    </View>
    {error?<IndexEditableText id="market:index:note:error" label="指數錯誤提示" kind="text"
      style={{fontSize:11,color:theme.palette.textSecondary}}>{error}</IndexEditableText>:null}
    <IndexEditableText id="market:index:note:source" label="官方來源及資料定義說明" kind="text" editableContent
      style={{fontSize:10,color:theme.palette.textSecondary}}>{TAIEX_EXPLANATIONS['market:index:note:source']}</IndexEditableText>
  </View>;
}
