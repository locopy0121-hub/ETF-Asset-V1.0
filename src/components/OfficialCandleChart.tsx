import {useSystemColors} from '../theme/useSystemColors';
import {useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,View} from 'react-native';
import Svg,{Polygon,Polyline} from 'react-native-svg';
import {Text} from './EditableNative';
import type {DailyCandle} from '../market/twseDailyHistory';
import type {ChartDataKey,NativeChartStyle} from '../domain/chartEditor';
import {colors} from '../theme/tokens';
import {candleIndexAtX} from '../domain/chartCrosshair';
import {marketPricePath} from '../domain/marketChartGeometry';
import {solidCandleAppearance} from '../domain/candleAppearance';
import {anchoredChartOffset,chartCandleMetrics,nearestChartZoom,stepChartZoom,DEFAULT_CHART_ZOOM} from '../domain/chartZoom';

const PLOT_HEIGHT=160;
const VOLUME_HEIGHT=50;
const SECONDARY_HEIGHT=54;
const PRICE_AXIS_WIDTH=58;
const CANDLE_WIDTH=13;
const GAP=5;
const STEP=CANDLE_WIDTH+GAP;
const LEFT_PAD=3;
const price=(n:number)=>n.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2});
const number=(n:number)=>n.toLocaleString('zh-TW',{maximumFractionDigits:2});
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export type HoldingChartContext=Readonly<{
  shares:number;
  costAvg:number;
  cumulativeDividend:number;
  canonicalPnl:number;
  canonicalComprehensivePnl:number;
  canonicalRoi:number;
}>;

const secondaryLabel:Partial<Record<ChartDataKey,string>>={
  change:'漲跌額',changePct:'漲跌幅',pnl:'持股損益',comprehensivePnl:'含息總損益',roi:'報酬率',marketValue:'市值',
};

/** Historical OHLCV renderer. Market history and private holding estimates remain separate layers. */
export function OfficialCandleChart({
  candles,loading,error,rangeLabel,dataKeys=['open','high','low','close','volume'],chartStyle='candlestick',
  holding,crosshairDefault=false,costLineEnabled=true,onSelectCandle,
}:{
  candles:readonly DailyCandle[];
  loading:boolean;
  error:string|null;
  rangeLabel:string;
  dataKeys?:readonly ChartDataKey[];
  chartStyle?:NativeChartStyle;
  holding?:HoldingChartContext;
  crosshairDefault?:boolean;
  costLineEnabled?:boolean;
  onSelectCandle?:(candle:DailyCandle)=>void;
}){
  const colors=useSystemColors();
  const [selectedDate,setSelectedDate]=useState<string|null>(null);
  const [crosshairEnabled,setCrosshairEnabled]=useState(crosshairDefault);
  // The normal interaction always pans. Cursor drag is opt-in and temporary.
  const [cursorDragMode,setCursorDragMode]=useState(false);
  const [zoom,setZoom]=useState(DEFAULT_CHART_ZOOM);
  const zoomRef=useRef(zoom);
  const viewportWidth=useRef(0);
  const pendingZoom=useRef<{oldOffset:number;oldStep:number;newStep:number}|null>(null);
  // Store the last requested pinch level while React Native recomputes content width.
  // Without this, quick two-finger gestures drop the user's final scale request.
  const queuedZoom=useRef<number|null>(null);
  const pinch=useRef<{distance:number;initialZoom:number}|null>(null);
  const scrollX=useRef(0);
  const scrollViewRef=useRef<ScrollView|null>(null);
  const autoScrollDataset=useRef<string|null>(null);
  const ordered=useMemo(()=>[...candles].sort((a,b)=>a.date.localeCompare(b.date)),[candles]);
  const {step,width:candleWidth,bodyWidth,volumeWidth}=chartCandleMetrics(zoom);
  const showVolume=dataKeys.includes('volume')||chartStyle==='price-volume';
  const showOpen=dataKeys.includes('open'),showHigh=dataKeys.includes('high'),showLow=dataKeys.includes('low');
  const showClose=dataKeys.includes('close')||dataKeys.includes('price');
  const showCost=Boolean(holding&&holding.costAvg>0&&(costLineEnabled||dataKeys.includes('cost')||chartStyle==='cost-price'));
  const secondaryKey=chartStyle==='pnl'?'pnl':chartStyle==='roi'?'roi':(['change','changePct','pnl','comprehensivePnl','roi','marketValue'] as const).find(key=>dataKeys.includes(key));
  const secondaryValue=(candle:DailyCandle,index:number,key:typeof secondaryKey):number=>{
    if(!key)return 0;
    const prior=index>0?ordered[index-1]!.close:candle.open;
    if(key==='change')return candle.close-prior;
    if(key==='changePct')return prior>0?(candle.close-prior)/prior*100:0;
    if(key==='marketValue')return holding?candle.close*holding.shares:0;
    if(key==='pnl')return holding?(candle.close-holding.costAvg)*holding.shares:0;
    if(key==='comprehensivePnl')return holding?(candle.close-holding.costAvg)*holding.shares+holding.cumulativeDividend:0;
    if(key==='roi')return holding&&holding.costAvg>0?(candle.close-holding.costAvg)/holding.costAvg*100:0;
    return 0;
  };
  const secondaryValues=secondaryKey?ordered.map((candle,index)=>secondaryValue(candle,index,secondaryKey)):[];
  const secMax=Math.max(0,...secondaryValues),secMin=Math.min(0,...secondaryValues);
  const secSpan=Math.max(.0001,secMax-secMin);
  const secY=(value:number)=>(secMax-value)/secSpan*SECONDARY_HEIGHT;

  const showThreeGates=chartStyle==='three-gates'||dataKeys.includes('threeGates');
  const refCandle=showThreeGates&&ordered.length>1?ordered[ordered.length-2]:null;
  const gateSpan=refCandle?refCandle.high-refCandle.low:0;
  const gateLevels=refCandle&&gateSpan>=0&&refCandle.low>0?[
    {id:'upper2',name:'上關價2',value:refCandle.low+gateSpan*1.382,color:'#A6323D'},
    {id:'upper1',name:'上關價1',value:refCandle.high,color:'#D9454F'},
    {id:'middle',name:'中關價',value:(refCandle.high+refCandle.low)/2,color:'#2754BE'},
    {id:'lower1',name:'下關價1',value:refCandle.low,color:'#37B84D'},
    {id:'lower2',name:'下關價2',value:refCandle.high-gateSpan*1.382,color:'#198441'},
  ]:[];
  const pricePool=ordered.flatMap(x=>[x.high,x.low]);
  pricePool.push(...gateLevels.map(g=>g.value));
  if(showCost&&holding)pricePool.push(holding.costAvg);
  const highest=Math.max(...pricePool,1);
  const lowest=Math.min(...pricePool,highest);
  const margin=Math.max((highest-lowest)*.08,.01);
  const axisHigh=highest+margin,axisLow=Math.max(0,lowest-margin),span=Math.max(.01,axisHigh-axisLow);
  const biggestVolume=Math.max(...ordered.map(x=>x.volume),1);
  const selected=ordered.find(x=>x.date===selectedDate)??ordered[ordered.length-1];
  const selectedIndex=selected?ordered.findIndex(x=>x.date===selected.date):-1;
  const y=(value:number)=>(axisHigh-value)/span*PLOT_HEIGHT;
  const fullWidth=LEFT_PAD+ordered.length*step+4;
  // Changing symbol or range presents the latest trade; subsequent user panning
  // must never be forcibly snapped back by an ordinary state update.
  const datasetId=ordered.length?ordered[0]!.date+'|'+ordered[ordered.length-1]!.date+'|'+ordered.length:'';
  const lineGeometry=useMemo(()=>marketPricePath(ordered,step,LEFT_PAD,PLOT_HEIGHT),[ordered,step]);
  const lineTrend=ordered.length>1?ordered[ordered.length-1]!.close-ordered[0]!.close:0;
  const lineColor=lineTrend>0?colors.gain:lineTrend<0?colors.loss:colors.flat;
  const chooseCandle=(candle:DailyCandle)=>{
    setSelectedDate(candle.date);
    onSelectCandle?.(candle);
  };
  const chooseAt=(touchX:number)=>{
    const index=candleIndexAtX(touchX,scrollX.current,ordered.length,step,LEFT_PAD);
    if(index>=0)chooseCandle(ordered[index]!);
  };
  const applyZoom=(next:number)=>{
    const target=nearestChartZoom(next),before=zoomRef.current;
    if(pendingZoom.current){
      queuedZoom.current=target===before?null:target;
      return;
    }
    if(target===before)return;
    pendingZoom.current={oldOffset:scrollX.current,oldStep:chartCandleMetrics(before).step,newStep:chartCandleMetrics(target).step};
    zoomRef.current=target;
    setZoom(target);
  };
  const pinchDistance=(touches:readonly {pageX:number;pageY:number}[])=>{
    if(touches.length!==2)return null;
    return Math.hypot(touches[0]!.pageX-touches[1]!.pageX,touches[0]!.pageY-touches[1]!.pageY);
  };
  const selectedIdx=selected?ordered.findIndex(x=>x.date===selected.date):-1;
  const selectedPrior=selectedIdx>0?ordered[selectedIdx-1]!.close:selected?.open??0;
  const selectedChange=selected?(selected.close-selectedPrior):0;
  const selectedChangePct=selectedPrior>0?selectedChange/selectedPrior*100:0;
  const estimatedPnl=selected&&holding?(selected.close-holding.costAvg)*holding.shares:0;
  const estimatedComprehensive=holding?estimatedPnl+holding.cumulativeDividend:0;
  const estimatedRoi=selected&&holding&&holding.costAvg>0?(selected.close-holding.costAvg)/holding.costAvg*100:0;
  const estimatedMarketValue=selected&&holding?selected.close*holding.shares:0;

  if(loading)return <Text style={styles.notice}>正在讀取歷史行情資料…</Text>;
  if(error)return <Text style={styles.notice}>歷史行情讀取失敗：{error}</Text>;
  if(!ordered.length)return <Text style={styles.notice}>此商品在所選區間尚無交易日；請切換較長歷史區間。</Text>;

  const selectedMetrics:Array<string>=[];
  if(dataKeys.includes('change'))selectedMetrics.push('漲跌額 '+(selectedChange>=0?'+':'')+price(selectedChange));
  if(dataKeys.includes('changePct'))selectedMetrics.push('漲跌幅 '+(selectedChangePct>=0?'+':'')+selectedChangePct.toFixed(2)+'%');
  if((dataKeys.includes('cost')||chartStyle==='cost-price')&&holding)selectedMetrics.push('含費成本 '+price(holding.costAvg));
  if((dataKeys.includes('pnl')||chartStyle==='pnl')&&holding)selectedMetrics.push('持股損益估值 NT$ '+Math.round(estimatedPnl).toLocaleString('zh-TW'));
  if(dataKeys.includes('comprehensivePnl')&&holding)selectedMetrics.push('含息損益估值 NT$ '+Math.round(estimatedComprehensive).toLocaleString('zh-TW'));
  if((dataKeys.includes('roi')||chartStyle==='roi')&&holding)selectedMetrics.push('報酬率估值 '+estimatedRoi.toFixed(2)+'%');
  if(dataKeys.includes('marketValue')&&holding)selectedMetrics.push('市值 NT$ '+Math.round(estimatedMarketValue).toLocaleString('zh-TW'));
  if(dataKeys.includes('dividend')&&holding)selectedMetrics.push('累積股息 NT$ '+Math.round(holding.cumulativeDividend).toLocaleString('zh-TW'));

  return <View style={styles.root}>
    <View style={styles.toolbar}>
      <Text style={styles.caption}>TWSE 歷史資料源 · {rangeLabel} · {ordered.length} 個交易日 · {chartStyle}</Text>
      <View style={styles.zoomControls}>
        <Pressable accessibilityRole="button" accessibilityLabel="縮小歷史圖表" disabled={zoom<=0.65}
          onPress={()=>applyZoom(stepChartZoom(zoom,-1))} style={[styles.zoomButton,zoom<=0.65&&styles.zoomDisabled]}>
          <Text style={styles.zoomSign}>－</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="還原圖表縮放百分之百"
          onPress={()=>applyZoom(DEFAULT_CHART_ZOOM)} style={styles.zoomButton}>
          <Text style={styles.zoomPercent}>{Math.round(zoom*100)}%</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="放大歷史圖表" disabled={zoom>=2.5}
          onPress={()=>applyZoom(stepChartZoom(zoom,1))} style={[styles.zoomButton,zoom>=2.5&&styles.zoomDisabled]}>
          <Text style={styles.zoomSign}>＋</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="switch" accessibilityState={{checked:crosshairEnabled}}
        onPress={()=>{setCrosshairEnabled(value=>!value);setCursorDragMode(false);setSelectedDate(selected?.date??null);}}
        style={[styles.crosshairToggle,crosshairEnabled&&styles.crosshairActive]}>
        <Text style={[styles.toggleText,crosshairEnabled&&styles.toggleActiveText]}>{crosshairEnabled?'十字線 ON':'十字線 OFF'}</Text>
      </Pressable>
    </View>
    {crosshairEnabled?<View style={styles.cursorModeRow}>
      <Text style={styles.caption}>操作方式</Text>
      <Pressable accessibilityRole="button" accessibilityState={{selected:!cursorDragMode}}
        onPress={()=>setCursorDragMode(false)} style={[styles.modeButton,!cursorDragMode&&styles.modeSelected]}>
        <Text style={styles.modeButtonText}>左右滑動圖表</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{selected:cursorDragMode}}
        onPress={()=>setCursorDragMode(true)} style={[styles.modeButton,cursorDragMode&&styles.modeSelected]}>
        <Text style={styles.modeButtonText}>拖動十字線</Text>
      </Pressable>
    </View>:null}
    {selected?<View style={styles.detail}>
      <Text style={styles.date}>{selected.date}</Text>
      <Text style={styles.number}>{[
        showOpen?'開 '+price(selected.open):'',showHigh?'高 '+price(selected.high):'',
        showLow?'低 '+price(selected.low):'',showClose?'收 '+price(selected.close):'',
      ].filter(Boolean).join('　')}</Text>
      {showVolume?<Text style={styles.volumeText}>成交量 {selected.volume.toLocaleString('zh-TW')} 股</Text>:null}
      {selectedMetrics.length?<Text style={styles.metricText}>{selectedMetrics.join('　')}</Text>:null}
    </View>:null}
    {showThreeGates?<Text style={styles.caption}>{refCandle?
      '三關價五線基準：'+refCandle.date+'（前一交易日高低）｜以最後一根日K為比較日，非日內逐筆資料':
      '三關價需有前一交易日官方 OHLC 才能計算，不以今日高低冒充'}</Text>:null}
    <View style={styles.plotRow}>
      <View style={[styles.axis,showThreeGates?{width:94}:undefined]}>
        <Text style={[styles.axisText,{top:0}]}>{price(axisHigh)}</Text>
        {!(showCost&&holding&&Math.abs(y(holding.costAvg)-PLOT_HEIGHT/2)<14)?
          <Text style={[styles.axisText,{top:PLOT_HEIGHT/2-6}]}>{price((axisHigh+axisLow)/2)}</Text>:null}
        <Text style={[styles.axisText,{top:PLOT_HEIGHT-14}]}>{price(axisLow)}</Text>
        <Text style={styles.axisTitle}>{showThreeGates?'前日關價':'基準'}</Text>
        {gateLevels.map(g=><View key={'axis:'+g.id} pointerEvents="none" style={{
          position:'absolute',left:0,top:clamp(y(g.value)-11,0,PLOT_HEIGHT-20)}}>
          <Text style={{fontSize:8,fontWeight:'800',color:g.color}}>{g.name}</Text>
          <Text style={{fontSize:8,color:g.color}}>{price(g.value)}</Text>
        </View>)}
        {showCost&&holding?<Text style={[styles.costAxisLabel,{top:clamp(y(holding.costAvg)-11,15,PLOT_HEIGHT-34)}]}>
          成本 {price(holding.costAvg)}
        </Text>:null}
      </View>
      <View style={styles.viewport} onLayout={e=>{viewportWidth.current=e.nativeEvent.layout.width;}}>
        <ScrollView ref={scrollViewRef} horizontal
          scrollEnabled={!(crosshairEnabled&&cursorDragMode)} directionalLockEnabled nestedScrollEnabled
          showsHorizontalScrollIndicator persistentScrollbar scrollEventThrottle={16}
          onTouchStart={event=>{
            const distance=pinchDistance(event.nativeEvent.touches);
            if(distance&&distance>0)pinch.current={distance,initialZoom:zoomRef.current};
          }}
          onTouchMove={event=>{
            const distance=pinchDistance(event.nativeEvent.touches);
            if(distance&&pinch.current?.distance)applyZoom(pinch.current.initialZoom*distance/pinch.current.distance);
          }}
          onTouchEnd={event=>{if(event.nativeEvent.touches.length<2)pinch.current=null;}}
          onTouchCancel={()=>{pinch.current=null;}}
          onScroll={event=>{scrollX.current=event.nativeEvent.contentOffset.x;}}
          onContentSizeChange={()=>{
            if(datasetId&&autoScrollDataset.current!==datasetId){
              pendingZoom.current=null;
              queuedZoom.current=null;
              autoScrollDataset.current=datasetId;
              scrollViewRef.current?.scrollToEnd({animated:false});
              return;
            }
            if(pendingZoom.current){
              const anchor=pendingZoom.current;
              pendingZoom.current=null;
              const target=anchoredChartOffset(anchor.oldOffset,viewportWidth.current,anchor.oldStep,anchor.newStep,fullWidth,LEFT_PAD);
              scrollX.current=target;
              scrollViewRef.current?.scrollTo({x:target,animated:false});
              // Apply the last gesture intent only after the previous width and offset settle.
              // Each new scale receives its own anchored offset on the next layout callback.
              if(queuedZoom.current!==null){
                const requested=queuedZoom.current;
                queuedZoom.current=null;
                applyZoom(requested);
              }
            }
            if(datasetId&&autoScrollDataset.current!==datasetId){autoScrollDataset.current=datasetId;}
          }}
          contentContainerStyle={[styles.scroll,{width:fullWidth}]}>
          {ordered.map((candle,index)=>{
            const candlePaint=solidCandleAppearance(candle.open,candle.close,colors);
            const tone=candlePaint.wick;
            const candleTop=y(Math.max(candle.open,candle.close));
            const candleBottom=y(Math.min(candle.open,candle.close));
            const wickTop=y(candle.high),wickBottom=y(candle.low);
            const bodyHeight=Math.max(2,candleBottom-candleTop);
            const bodyLeft=Math.max(0,(candleWidth-bodyWidth)/2);
            const showTick=index===0||index===ordered.length-1||candle.date.slice(0,7)!==ordered[index-1]?.date.slice(0,7)||index%Math.max(1,Math.ceil(ordered.length/5))===0;
            const lineMode=chartStyle==='line'||chartStyle==='area'||chartStyle==='cost-price'||chartStyle==='pnl'||chartStyle==='roi'||(!showOpen&&!showHigh&&!showLow&&showClose);
            const columnMode=chartStyle==='column';
            const ohlcMode=chartStyle==='ohlc';
            const sec=secondaryKey?secondaryValues[index]??0:0;
            const zeroY=secondaryKey?secY(0):0;
            const valueY=secondaryKey?secY(sec):0;
            return <Pressable accessibilityRole="button" accessibilityLabel={candle.date+'，開'+price(candle.open)+'，高'+price(candle.high)+'，低'+price(candle.low)+'，收'+price(candle.close)}
              key={candle.date} onPress={()=>chooseCandle(candle)}
              style={[styles.candleColumn,{width:step,backgroundColor:selected?.date===candle.date&&crosshairEnabled?'rgba(148,163,184,.12)':'transparent'}]}>
              <View style={[styles.pricePlot,{width:candleWidth}]}>
                {columnMode?<View style={{position:'absolute',left:2,right:2,top:y(candle.close),height:Math.max(2,PLOT_HEIGHT-y(candle.close)),backgroundColor:tone,opacity:.78}}/>:
                lineMode?(chartStyle==='line'||chartStyle==='area'?null:<View style={{position:'absolute',left:3,right:3,top:y(candle.close),height:3,backgroundColor:tone}}/>):
                ohlcMode?<><View style={[styles.wick,{left:candleWidth/2,top:wickTop,height:Math.max(1,wickBottom-wickTop),backgroundColor:tone}]}/><View style={{position:'absolute',left:2,top:y(candle.open),width:5,height:1,backgroundColor:tone}}/><View style={{position:'absolute',right:1,top:y(candle.close),width:5,height:1,backgroundColor:tone}}/></>:
                <><View style={[styles.wick,{left:candleWidth/2,top:wickTop,height:Math.max(1,wickBottom-wickTop),backgroundColor:tone}]}/><View style={[styles.body,{left:bodyLeft,width:bodyWidth,top:candleTop,height:bodyHeight,backgroundColor:candlePaint.bodyFill,borderColor:candlePaint.bodyBorder}]}/></>}
              </View>
              {showVolume?<View style={styles.volumePlot}><View style={{height:Math.max(1,candle.volume/biggestVolume*(VOLUME_HEIGHT-6)),backgroundColor:candlePaint.volume,width:volumeWidth}}/></View>:null}
              {secondaryKey?<View style={[styles.secondaryPlot,{width:candleWidth}]}><View style={{position:'absolute',left:3,width:7,top:Math.min(zeroY,valueY),height:Math.max(1,Math.abs(valueY-zeroY)),backgroundColor:sec>=0?colors.gain:colors.loss}}/></View>:null}
              <Text style={[styles.tick,{width:step}]}>{showTick?candle.date.slice(5).replace('-','/'):''}</Text>
            </Pressable>;
          })}
          {(chartStyle==='line'||chartStyle==='area')&&lineGeometry?
            <Svg pointerEvents="none" style={{position:'absolute',left:0,top:0}} width={fullWidth} height={PLOT_HEIGHT} viewBox={'0 0 '+fullWidth+' '+PLOT_HEIGHT}>
              {chartStyle==='area'?<Polygon points={lineGeometry.area} fill={lineColor} opacity={.15}/>:null}
              <Polyline points={lineGeometry.line} fill="none" stroke={lineColor} strokeWidth={2.1} strokeLinejoin="round" strokeLinecap="round"/>
            </Svg>:null}
          {gateLevels.map(g=><View pointerEvents="none" key={'gate:'+g.id} style={{
            position:'absolute',left:0,width:fullWidth,top:y(g.value),borderTopWidth:1,
            borderStyle:'dashed',borderColor:g.color,zIndex:3}}/>)}
          {showCost&&holding?<View pointerEvents="none" style={[styles.costLine,{top:y(holding.costAvg),width:fullWidth}]}/>:null}
          {crosshairEnabled&&selected?<View pointerEvents="none" style={[styles.crosshairLayer,{height:PLOT_HEIGHT+(showVolume?VOLUME_HEIGHT:0)+(secondaryKey?SECONDARY_HEIGHT:0)+20}]}>
            <View style={[styles.verticalCrosshair,{left:LEFT_PAD+selectedIndex*step+step/2}]}/>
            <View style={[styles.horizontalCrosshair,{top:y(selected.close)}]}/>
            {showVolume?<View style={[styles.volumeCrosshair,{top:PLOT_HEIGHT+Math.max(0,VOLUME_HEIGHT-selected.volume/biggestVolume*(VOLUME_HEIGHT-6))}]}/>:null}
            <View style={[styles.crosshairDateTag,{left:clamp(LEFT_PAD+selectedIndex*step-19,0,Math.max(0,fullWidth-50))}]}><Text style={styles.crosshairTagText}>{selected.date.slice(5)}</Text></View>
          </View>:null}
        </ScrollView>
        {crosshairEnabled&&cursorDragMode?<View style={[styles.touchOverlay,{height:PLOT_HEIGHT+(showVolume?VOLUME_HEIGHT:0)+(secondaryKey?SECONDARY_HEIGHT:0)}]}
          onStartShouldSetResponder={()=>true} onMoveShouldSetResponder={()=>true}
          onResponderGrant={e=>chooseAt(e.nativeEvent.locationX)}
          onResponderMove={e=>chooseAt(e.nativeEvent.locationX)}
          accessibilityLabel="十字線觸控區：左右滑動選擇交易日"/>:null}
      </View>
      <View style={styles.actualAxis}>
        {selected?<Text style={[styles.crosshairPrice,{top:clamp(y(selected.close)-9,0,PLOT_HEIGHT-18)}]}>
          {price(selected.close)}
        </Text>:null}
        <Text style={styles.actualAxisTitle}>{crosshairEnabled?'選取值':'實際值'}</Text>
      </View>
    </View>
    {secondaryKey?<Text style={styles.caption}>副圖：{secondaryLabel[secondaryKey]} · {number(secMin)} ～ {number(secMax)}</Text>:null}
    {holding&&(dataKeys.some(key=>['pnl','comprehensivePnl','roi','marketValue'].includes(key))||chartStyle==='pnl'||chartStyle==='roi'||chartStyle==='cost-price')?<Text style={styles.estimateNote}>歷史持股績效使用目前股數與含費成本套入各日歷史收盤價估值；正式當前損益仍取帳務核心。</Text>:null}
    <Text style={styles.caption}>圖表可用＋／－放大縮小，點擊比例還原，支援雙指縮放。{crosshairEnabled?(cursorDragMode?'拖動十字線選取日期；切回「左右滑動圖表」可查看歷史':'左右滑動可查看全部歷史 K 棒，輕點查看選取日期'):'左右滑動瀏覽所有歷史行情'}</Text>
  </View>;
}
const styles=StyleSheet.create({
  root:{gap:7,minHeight:285},notice:{fontSize:11,lineHeight:20,color:colors.textSecondary,padding:14},
  toolbar:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',gap:6},
  zoomControls:{flexDirection:'row',alignItems:'center',gap:3},
  zoomButton:{minHeight:29,minWidth:29,borderWidth:1,borderRadius:7,borderColor:colors.border,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center',paddingHorizontal:6},
  zoomDisabled:{opacity:.35},zoomSign:{fontSize:18,fontWeight:'900',color:colors.primary},
  zoomPercent:{fontSize:10,fontWeight:'800',color:colors.text},
  cursorModeRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6},
  modeButton:{paddingHorizontal:8,paddingVertical:5,borderWidth:1,borderColor:colors.border,borderRadius:9},
  modeSelected:{borderColor:colors.primary,backgroundColor:colors.surfaceMuted},
  modeButtonText:{fontSize:10,color:colors.text,fontWeight:'700'},
  caption:{fontSize:10,color:colors.textSecondary,flexShrink:1},
  estimateNote:{fontSize:9,lineHeight:14,color:colors.textSecondary},
  crosshairToggle:{paddingHorizontal:9,paddingVertical:6,borderRadius:9,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  crosshairActive:{backgroundColor:colors.primary,borderColor:colors.primary},toggleText:{color:colors.primary,fontSize:10,fontWeight:'800'},toggleActiveText:{color:'#FFFFFF'},
  detail:{padding:8,backgroundColor:colors.surfaceMuted,borderRadius:8,gap:3},
  date:{fontSize:11,color:colors.text,fontWeight:'800'},number:{fontSize:10,color:colors.text,fontWeight:'700'},volumeText:{fontSize:10,color:colors.textSecondary},
  metricText:{fontSize:10,lineHeight:16,color:colors.text,fontWeight:'700'},
  plotRow:{flexDirection:'row',alignItems:'flex-start'},viewport:{flex:1,minWidth:0,position:'relative'},scroll:{paddingLeft:LEFT_PAD,paddingRight:4,position:'relative'},
  candleColumn:{alignItems:'center'},pricePlot:{height:PLOT_HEIGHT,width:CANDLE_WIDTH,position:'relative'},
  wick:{position:'absolute',left:6,width:1},body:{position:'absolute',left:2,width:10,borderWidth:1},
  volumePlot:{height:VOLUME_HEIGHT,justifyContent:'flex-end',borderBottomWidth:1,borderBottomColor:colors.border},
  secondaryPlot:{height:SECONDARY_HEIGHT,position:'relative',borderBottomWidth:1,borderBottomColor:colors.border,width:CANDLE_WIDTH},
  tick:{fontSize:7,color:colors.textSecondary,height:20,textAlign:'center',width:STEP,overflow:'visible'},
  axis:{width:PRICE_AXIS_WIDTH,height:PLOT_HEIGHT,position:'relative',paddingRight:4},
  axisText:{position:'absolute',left:0,fontSize:9,color:colors.textSecondary},
  axisTitle:{position:'absolute',left:0,top:PLOT_HEIGHT+3,fontSize:9,color:colors.textSecondary},
  costAxisLabel:{position:'absolute',left:0,fontSize:8,fontWeight:'800',color:colors.primary,backgroundColor:colors.surface,paddingRight:3},
  actualAxis:{width:PRICE_AXIS_WIDTH,height:PLOT_HEIGHT,position:'relative',alignItems:'flex-end'},
  actualAxisTitle:{position:'absolute',top:PLOT_HEIGHT+3,right:0,fontSize:9,color:colors.textSecondary},
  costLine:{position:'absolute',left:0,borderTopWidth:1,borderStyle:'dashed',borderColor:colors.primary,zIndex:3},
  crosshairLayer:{position:'absolute',top:0,left:0,width:'100%'},
  verticalCrosshair:{position:'absolute',top:0,height:PLOT_HEIGHT,borderLeftWidth:1,borderStyle:'dashed',borderColor:colors.primary},
  horizontalCrosshair:{position:'absolute',left:0,right:0,borderTopWidth:1,borderStyle:'dashed',borderColor:colors.primary},
  volumeCrosshair:{position:'absolute',left:0,right:0,borderTopWidth:1,borderStyle:'dotted',borderColor:colors.textSecondary},
  crosshairPrice:{position:'absolute',right:0,color:'#FFFFFF',backgroundColor:colors.primary,fontSize:9,fontWeight:'800',paddingHorizontal:3,paddingVertical:2,zIndex:2},
  crosshairDateTag:{position:'absolute',bottom:0,backgroundColor:colors.primary,paddingHorizontal:2,minWidth:45,alignItems:'center'},
  crosshairTagText:{color:'#FFFFFF',fontSize:8,fontWeight:'800'},
  touchOverlay:{position:'absolute',top:0,left:0,right:0}
});
