import {useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {StyleSheet,View,type StyleProp,type TextStyle} from 'react-native';
import Svg,{Circle,Line,Polyline,Polygon} from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Pressable,Text} from './EditableNative';
import {useLayoutRuntime} from '../editor/LayoutSelectionContext';
import {taiexAxisWidth,taiexChartHeight,taiexPlotLeftInset,taiexTimeAxisLeft} from '../editor/taiexIndexChartLayout';
import {getTaiexPreviewSnapshot,subscribeTaiexPreviewSnapshot,publishTaiexPreviewSnapshot,subscribeNoTaiexPreview,noTaiexPreviewSnapshot} from '../editor/taiexPreviewSnapshot';
import {MarketEditableSurface} from './MarketEditableContent';
import {usePageEditor} from '../editor/pageEditor';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useSystemColors} from '../theme/useSystemColors';
import {colorWithAlpha} from '../maintenance/frameEffects';
import {fetchTaiexHistory,fetchTaiexMis,fetchTaiexRecentOhlc,fetchTaiexIntraday} from '../market/taiexIndexSource';
import {TAIEX_EXPLANATIONS} from './taiexExplanations';
import {indexThreeGates,indexFiveGateLevels,taiexSessionX,pickTaiexDisplay,selectTaiexHistory,taiex52WeekCloseRange,taipeiIndexDate,taiexStatusLabel,
  type TaiexDailyOhlc,type TaiexIntraday,type IndexThreeGates,type IndexClose,type IndexPoint,type IndexRange,type IndexSnapshot} from '../market/taiexIndex';

const CACHE='@tf-asset/market-taiex-index-v1';
const HISTORY='@tf-asset/market-taiex-history-v1';
const POINTS='@tf-asset/market-taiex-points-v1';
const OHLC='@tf-asset/market-taiex-daily-ohlc-v1';
const TAPE='@tf-asset/market-taiex-intraday-tape-v1';
const format=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)?
  n.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const signed=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)?(n>0?'+':'')+format(n):'—';
const ranges:readonly {id:IndexRange;label:string;months:number}[]=[
  {id:'d1',label:'1日',months:2},{id:'d5',label:'5日',months:2},{id:'m1',label:'1月',months:2},
  {id:'m6',label:'6月',months:7},{id:'ytd',label:'今年',months:13},{id:'y1',label:'1年',months:13},
];
function GateAxisValue({gate,position}:{gate:ReturnType<typeof indexFiveGateLevels>[number];position:number}){
  const [height,setHeight]=useState(12);
  return <View onLayout={event=>{
    const next=event.nativeEvent.layout.height;
    if(Math.abs(next-height)>.5)setHeight(next);
  }} style={{position:'absolute',left:0,right:0,top:position-height/2,alignItems:'flex-end'}}>
    <IndexEditableText id={'market:index:gates:'+gate.id+':left'} label={gate.name+'圖表左側數值'}
      kind="value" style={{fontSize:10,lineHeight:12,fontWeight:'800',color:gate.color,
        includeFontPadding:false,textAlign:'right'}}>{format(gate.value)}</IndexEditableText>
  </View>;
}
function PriceLine({values,color,levels,intraday,date}:{
  values:readonly IndexPoint[];color:string;levels:IndexThreeGates|null;intraday:boolean;date:string|null
}){
  const theme=useThemeRuntime();
  const runtime=useLayoutRuntime(),editor=usePageEditor('market');
  const targetOverrides=runtime.active?runtime.targets:editor.displayConfig.layoutTargets;
  const axisWidth=taiexAxisWidth(targetOverrides?.['market:index:axis:left']?.width);
  const chartHeight=taiexChartHeight(targetOverrides?.['market:index:chart']?.height);
  const plotInset=taiexPlotLeftInset(targetOverrides?.['market:index:plot:left-inset']?.width);
  const sorted=[...values].filter(x=>Number.isFinite(x.at)&&Number.isFinite(x.value)&&x.value>0)
    .sort((a,b)=>a.at-b.at);
  // Keep the actual editable chart surface mounted even when preview has no cache.
  // Do not fabricate missing market values.
  const gates=levels?indexFiveGateLevels(levels):[];
  const pricePool=[...sorted.map(p=>p.value),...gates.map(g=>g.value)];
  const high=pricePool.length?Math.max(...pricePool):1,low=pricePool.length?Math.min(...pricePool):0;
  const pad=Math.max(0.5,(high-low)*.055),bottom=chartHeight-28,top=16;
  const y=(v:number)=>top+(high+pad-v)/(high-low+pad*2)*(bottom-top);
  const at0=sorted[0]?.at??0,atEnd=sorted[sorted.length-1]?.at??0;
  const x=(at:number)=>intraday&&date?taiexSessionX(at,date,5,310):
    atEnd<=at0?160:5+310*(at-at0)/(atEnd-at0);
  const segments:IndexPoint[][]=[];
  for(const sample of sorted){
    const previous=segments[segments.length-1];
    if(!previous||(intraday&&sample.at-previous[previous.length-1]!.at>10*60*1000))
      segments.push([sample]);
    else previous.push(sample);
  }
  const timeLabels=['09:00','10:00','11:00','12:00','13:00','13:30'];
  return <View style={{gap:4}}>
    <View style={{flexDirection:'row',gap:0}}>
      <View style={{width:axisWidth,height:chartHeight,position:'relative'}}>
        {runtime.active?<Pressable accessibilityRole="button" accessibilityLabel="編輯左側數值欄寬度"
          onPress={()=>runtime.onSelect?.({id:'market:index:axis:left',kind:'card',label:'圖表左側數值欄',width:axisWidth})}
          style={{position:'absolute',top:0,right:0,zIndex:2,padding:2}}>
          <Text style={{fontSize:10,color:theme.palette.primary}}>↔</Text>
        </Pressable>:null}
        {gates.map(g=><GateAxisValue key={g.id} gate={g} position={y(g.value)}/>)}
        {!gates.length?<Text style={{fontSize:9,color:theme.palette.textSecondary}}>指數點位</Text>:null}
      </View>
      <View style={{flex:1,minWidth:0,paddingLeft:plotInset}}>
        <IndexEditableChart>
          <Svg width="100%" height={chartHeight} viewBox={'0 0 320 '+chartHeight} preserveAspectRatio="none">
            {[top,top+(bottom-top)/3,top+(bottom-top)*2/3,bottom].map(gy=><Line key={'grid'+gy} x1={5} x2={315} y1={gy} y2={gy}
              stroke={theme.palette.border} strokeWidth={0.8}/>)}
            {gates.map(g=><Line key={g.id} x1={0} x2={320} y1={y(g.value)} y2={y(g.value)}
              stroke={g.color} strokeWidth={1.3} strokeDasharray="5 4"/>)}
            {segments.filter(segment=>segment.length>=2).map((segment,i)=>{
              const poly=segment.map(p=>x(p.at).toFixed(2)+','+y(p.value).toFixed(2)).join(' ');
              const fill=segment.length>2?
                x(segment[0]!.at).toFixed(2)+','+bottom+' '+poly+' '+
                x(segment[segment.length-1]!.at).toFixed(2)+','+bottom:null;
              return <>{fill?<Polygon key={'fill'+i} points={fill} fill={color} opacity={.13}/>:null}
                <Polyline key={'line'+i} points={poly} stroke={color} strokeWidth={1.55}
                  strokeLinejoin="round" strokeLinecap="round" fill="none"/></>;

            })}
            {sorted.length>0?<Circle cx={x(sorted[sorted.length-1]!.at)}
              cy={y(sorted[sorted.length-1]!.value)} r={2.8} fill={color}/>:null}
          </Svg>
        </IndexEditableChart>
      </View>
    </View>
    {!pricePool.length?<Text style={{color:theme.palette.textSecondary,fontSize:12,paddingVertical:6}}>
      尚無可核實的日內走勢或三關價，不以模擬點填補。</Text>:null}
    {intraday?<MarketEditableSurface id="market:index:time-axis" label="圖表時間軸">
      <View style={{marginLeft:taiexTimeAxisLeft(axisWidth,plotInset),flexDirection:'row',justifyContent:'space-between'}}>
        {timeLabels.map(s=><Text key={s} style={{fontSize:8,color:theme.palette.textSecondary}}>{s}</Text>)}
      </View>
    </MarketEditableSurface>:null}
    {sorted.length?<View style={{flexDirection:'row',justifyContent:'space-between'}}>
      <Text style={{fontSize:9,color:theme.palette.textSecondary}}>當日已核實低點 {format(Math.min(...sorted.map(x=>x.value)))}</Text>
      <Text style={{fontSize:9,color:theme.palette.textSecondary}}>當日已核實高點 {format(Math.max(...sorted.map(x=>x.value)))}</Text>
    </View>:null}
    {intraday&&sorted.length<2?<Text style={{fontSize:10,color:theme.palette.textSecondary}}>
      當日資料不足，僅顯示實際點位與前一交易日關價。</Text>:null}
  </View>;
}
/** Named targets share the page editor's persisted visual overrides.
 * Values remain read-only; editing only changes appearance, never market data.
 */
function IndexEditableText({id,label,kind,style,children,profitTone='neutral',editableContent=false}:{
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
    style={[{borderRadius:5,alignSelf:id.endsWith(':left')?'flex-end':'flex-start',maxWidth:'100%'},
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
  const [measured,setMeasured]=useState<{width:number;height:number}|null>(null);
  const chartStyle=[
    override?.width!==undefined?{width:override.width}:undefined,
    override?.height!==undefined?{height:override.height,overflow:'hidden' as const}:undefined,
    override?.backgroundColor!==undefined?{backgroundColor:colorWithAlpha(override.backgroundColor,override.backgroundOpacity??1)}:undefined,
    override?.borderWidth!==undefined?{borderWidth:override.borderWidth}:undefined,
    override?.borderColor!==undefined?{borderColor:colorWithAlpha(override.borderColor,override.borderOpacity??1)}:undefined,
    override?.borderRadius!==undefined?{borderRadius:override.borderRadius}:undefined,
    override?.padding!==undefined?{padding:override.padding}:undefined,
    override?.opacity!==undefined?{opacity:override.opacity}:undefined,
  ];
  // The editor and production use an identical native box. Inserting an extra
  // outer Pressable changed the flex width for percentage-based SVG charts.
  if(!runtime.active)return <View style={chartStyle}>{children}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel="編輯加權指數走勢圖"
    style={chartStyle} onLayout={event=>{
      const {width,height}=event.nativeEvent.layout;
      setMeasured(previous=>previous?.width===width&&previous.height===height?previous:{width,height});
    }}
    onPress={()=>runtime.onSelect?.({id,kind:'card',label:'加權指數走勢圖',
      ...(measured?{width:measured.width,height:measured.height}:{})})}>
    <View pointerEvents="none" style={{width:'100%'}}>{children}</View>
    {runtime.selectedId===id?<View pointerEvents="none"
      style={[StyleSheet.absoluteFillObject,{borderWidth:2,borderColor:'#0969DA',borderRadius:8}]}/>:null}
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
  const [localRange,setRange]=useState<IndexRange>('d1');
  const [localMis,setMis]=useState<IndexSnapshot|null>(null);
  const [localHistory,setHistory]=useState<IndexClose[]>([]);
  const [localPoints,setPoints]=useState<IndexPoint[]>([]);
  const [localOfficialTape,setOfficialTape]=useState<TaiexIntraday|null>(null);
  const [tapeReload,setTapeReload]=useState(0);
  const [localOhlc,setOhlc]=useState<TaiexDailyOhlc[]>([]);
  const [localGatesOn,setGatesOn]=useState(true);
  const [localBusy,setBusy]=useState(false),[localHistoryBusy,setHistoryBusy]=useState(false);
  const [localError,setError]=useState<string|null>(null);
  const shared=useSyncExternalStore(
    layoutPreview.active?subscribeTaiexPreviewSnapshot:subscribeNoTaiexPreview,
    layoutPreview.active?getTaiexPreviewSnapshot:noTaiexPreviewSnapshot);
  const preview=layoutPreview.active?shared:null;
  const range=preview?.range??localRange,gatesOn=preview?.gatesOn??localGatesOn;
  const mis=preview?.mis??localMis,history=preview?.history??localHistory;
  const points=preview?.points??localPoints,officialTape=preview?.officialTape??localOfficialTape;
  const ohlc=preview?.ohlc??localOhlc,busy=preview?.busy??localBusy;
  const historyBusy=preview?.historyBusy??localHistoryBusy,error=preview?.error??localError;
  const lastReq=useRef(0),inFlight=useRef(false);
  useEffect(()=>{
    if(layoutPreview.active)return;
    publishTaiexPreviewSnapshot({
      range:localRange,gatesOn:localGatesOn,mis:localMis,history:localHistory,points:localPoints,
      officialTape:localOfficialTape,ohlc:localOhlc,
      busy:localBusy,historyBusy:localHistoryBusy,error:localError,
    });
  },[layoutPreview.active,localRange,localGatesOn,localMis,localHistory,localPoints,
    localOfficialTape,localOhlc,localBusy,localHistoryBusy,localError]);
  useEffect(()=>{
    if(layoutPreview.active)return;
    return()=>publishTaiexPreviewSnapshot(null);
  },[layoutPreview.active]);
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
    (officialTape!==null&&officialTape.date===display?.date?officialTape.points:
      chartData.filter(p=>display?.date===taipeiIndexDate(new Date(p.at)))):chartData,
    [range,chartData,display?.date,officialTape]);

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

  // The exchange's 09:00–13:30 tape is retrieved as a complete official report.
  // During trading hours, before its publication, local MIS snapshots remain an
  // explicitly incomplete fallback. No per-second REST polling or invented ticks.
  useEffect(()=>{
    let mounted=true;
    void AsyncStorage.getItem(TAPE).then(raw=>{
      if(!mounted||!raw)return;
      const record=JSON.parse(raw) as TaiexIntraday;
      if(record?.source==='TWSE MI_5MINS_INDEX'&&record.date===display?.date&&
        Array.isArray(record.points)&&record.points.length)
        setOfficialTape(record);
    }).catch(()=>{});
    return()=>{mounted=false;};
  },[display?.date]);
  useEffect(()=>{
    if(layoutPreview.active||range!=='d1'||!display?.date)return;
    let mounted=true;
    const controller=new AbortController();
    void fetchTaiexIntraday(display.date,controller.signal).then(tape=>{
      if(!mounted||!tape)return;
      setOfficialTape(tape);
      void AsyncStorage.setItem(TAPE,JSON.stringify(tape)).catch(()=>{});
    }).catch(()=>{});
    return()=>{mounted=false;controller.abort();};
  },[display?.date,range,phase,layoutPreview.active,tapeReload]);
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
      <IndexEditableButton id="market:index:refresh:button" label="更新加權指數" onPress={()=>{if(!layoutPreview.active)void refresh(true);if(!layoutPreview.active)setTapeReload(v=>v+1);}}>
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
      官方行情來源：TWSE MIS／FMTQIK；當日走勢：TWSE MI_5MINS_INDEX；關價：MI_5MINS_HIST
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
    <PriceLine values={plotPoints} color={tone} levels={range==='d1'&&gatesOn?gates:null}
      intraday={range==='d1'} date={display?.date??null}/>
    {range==='d1'&&gatesOn?<View style={{gap:3}}>
      <IndexEditableText id="market:index:gates:title" label="三關價標題" kind="text"
        style={{color:theme.palette.text,fontWeight:'800',fontSize:12}}>三關價（前一交易日高低推算）</IndexEditableText>
      {gates?<View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:6}}>
        {indexFiveGateLevels(gates).map(g=><View key={g.id} style={{gap:2}}>
          <IndexEditableText id={'market:index:gates:'+g.id+':label'} label={g.name+'標籤'} kind="text"
            style={{fontSize:10,color:g.color}}>{g.name}</IndexEditableText>
          <IndexEditableText id={'market:index:gates:'+g.id+':value'} label={g.name+'數值'} kind="value"
            style={{fontSize:12,fontWeight:'800',color:g.color}}>{format(g.value)}</IndexEditableText>
        </View>)}
      </View>:<IndexEditableText id="market:index:gates:unavailable" label="三關價資料不足訊息" kind="text"
        style={{fontSize:11,color:theme.palette.textSecondary}}>上一交易日官方高低指數尚未核實，不顯示假設關卡。</IndexEditableText>}
      <IndexEditableText id="market:index:gates:reference" label="三關價計算基準日期" kind="text"
        style={{fontSize:10,color:theme.palette.textSecondary}}>基準交易日：{gates?.referenceDate??'待核實'}｜來源 TWSE MI_5MINS_HIST</IndexEditableText>
    </View>:null}
    <IndexEditableText id="market:index:note:tape" label="指數走勢覆蓋範圍" kind="text"
      style={{fontSize:10,color:theme.palette.textSecondary}}>
      {officialTape!==null&&officialTape.date===display?.date?
        '證交所每 5 秒指數紀錄，'+officialTape.points.length+' 筆（09:00–13:30），已核實官方交易日。':
        '完整盤中報表尚未取得，目前僅顯示 App 實際收集的 MIS 快照，不代表完整日內曲線。'}
    </IndexEditableText>
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
