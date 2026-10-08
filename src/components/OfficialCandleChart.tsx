import {useSystemColors} from '../theme/useSystemColors';
import {useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {Text} from './EditableNative';
import type {DailyCandle} from '../market/twseDailyHistory';
import type {ChartDataKey,NativeChartStyle} from '../domain/chartEditor';
import {colors} from '../theme/tokens';
import {candleIndexAtX} from '../domain/chartCrosshair';

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
  holding,crosshairDefault=false,costLineEnabled=true,
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
}){
  const colors=useSystemColors();
  const [selectedDate,setSelectedDate]=useState<string|null>(null);
  const [crosshairEnabled,setCrosshairEnabled]=useState(crosshairDefault);
  const scrollX=useRef(0);
  const ordered=useMemo(()=>[...candles].sort((a,b)=>a.date.localeCompare(b.date)),[candles]);
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

  const pricePool=ordered.flatMap(x=>[x.high,x.low]);
  if(showCost&&holding)pricePool.push(holding.costAvg);
  const highest=Math.max(...pricePool,1);
  const lowest=Math.min(...pricePool,highest);
  const margin=Math.max((highest-lowest)*.08,.01);
  const axisHigh=highest+margin,axisLow=Math.max(0,lowest-margin),span=Math.max(.01,axisHigh-axisLow);
  const biggestVolume=Math.max(...ordered.map(x=>x.volume),1);
  const selectedIndex=Math.max(0,ordered.findIndex(x=>x.date===selectedDate));
  const selected=ordered.find(x=>x.date===selectedDate)??ordered[ordered.length-1];
  const y=(value:number)=>(axisHigh-value)/span*PLOT_HEIGHT;
  const fullWidth=LEFT_PAD+ordered.length*STEP+4;
  const chooseAt=(touchX:number)=>{
    const index=candleIndexAtX(touchX,scrollX.current,ordered.length,STEP,LEFT_PAD);
    if(index>=0)setSelectedDate(ordered[index]!.date);
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
      <Pressable accessibilityRole="switch" accessibilityState={{checked:crosshairEnabled}}
        onPress={()=>{setCrosshairEnabled(value=>!value);setSelectedDate(selected?.date??null);}}
        style={[styles.crosshairToggle,crosshairEnabled&&styles.crosshairActive]}>
        <Text style={[styles.toggleText,crosshairEnabled&&styles.toggleActiveText]}>{crosshairEnabled?'十字線 ON':'十字線 OFF'}</Text>
      </Pressable>
    </View>
    {selected?<View style={styles.detail}>
      <Text style={styles.date}>{selected.date}</Text>
      <Text style={styles.number}>{[
        showOpen?'開 '+price(selected.open):'',showHigh?'高 '+price(selected.high):'',
        showLow?'低 '+price(selected.low):'',showClose?'收 '+price(selected.close):'',
      ].filter(Boolean).join('　')}</Text>
      {showVolume?<Text style={styles.volumeText}>成交量 {selected.volume.toLocaleString('zh-TW')} 股</Text>:null}
      {selectedMetrics.length?<Text style={styles.metricText}>{selectedMetrics.join('　')}</Text>:null}
    </View>:null}
    <View style={styles.plotRow}>
      <View style={styles.viewport}>
        <ScrollView horizontal scrollEnabled={!crosshairEnabled} showsHorizontalScrollIndicator
          scrollEventThrottle={32} onScroll={event=>{scrollX.current=event.nativeEvent.contentOffset.x;}}
          contentContainerStyle={[styles.scroll,{width:fullWidth}]}>
          {ordered.map((candle,index)=>{
            const positive=candle.close>=candle.open;
            const tone=positive?colors.gain:colors.loss;
            const candleTop=y(Math.max(candle.open,candle.close));
            const candleBottom=y(Math.min(candle.open,candle.close));
            const wickTop=y(candle.high),wickBottom=y(candle.low);
            const bodyHeight=Math.max(2,candleBottom-candleTop);
            const showTick=index===0||index===ordered.length-1||candle.date.slice(0,7)!==ordered[index-1]?.date.slice(0,7)||index%Math.max(1,Math.ceil(ordered.length/5))===0;
            const lineMode=chartStyle==='line'||chartStyle==='area'||chartStyle==='cost-price'||chartStyle==='pnl'||chartStyle==='roi'||(!showOpen&&!showHigh&&!showLow&&showClose);
            const columnMode=chartStyle==='column';
            const ohlcMode=chartStyle==='ohlc';
            const sec=secondaryKey?secondaryValues[index]??0:0;
            const zeroY=secondaryKey?secY(0):0;
            const valueY=secondaryKey?secY(sec):0;
            return <Pressable accessibilityRole="button" accessibilityLabel={candle.date+'，開'+price(candle.open)+'，高'+price(candle.high)+'，低'+price(candle.low)+'，收'+price(candle.close)}
              key={candle.date} onPress={()=>setSelectedDate(candle.date)}
              style={[styles.candleColumn,{width:STEP,backgroundColor:selected?.date===candle.date&&crosshairEnabled?'rgba(148,163,184,.12)':'transparent'}]}>
              <View style={styles.pricePlot}>
                {columnMode?<View style={{position:'absolute',left:2,right:2,top:y(candle.close),height:Math.max(2,PLOT_HEIGHT-y(candle.close)),backgroundColor:tone,opacity:.78}}/>:
                lineMode?<View style={{position:'absolute',left:3,right:3,top:y(candle.close),height:Math.max(2,chartStyle==='area'?PLOT_HEIGHT-y(candle.close):3),backgroundColor:tone,opacity:chartStyle==='area'?.28:1}}/>:
                ohlcMode?<><View style={[styles.wick,{top:wickTop,height:Math.max(1,wickBottom-wickTop),backgroundColor:tone}]}/><View style={{position:'absolute',left:2,top:y(candle.open),width:5,height:1,backgroundColor:tone}}/><View style={{position:'absolute',right:1,top:y(candle.close),width:5,height:1,backgroundColor:tone}}/></>:
                <><View style={[styles.wick,{top:wickTop,height:Math.max(1,wickBottom-wickTop),backgroundColor:tone}]}/><View style={[styles.body,{top:candleTop,height:bodyHeight,backgroundColor:positive?'transparent':tone,borderColor:tone}]}/></>}
              </View>
              {showVolume?<View style={styles.volumePlot}><View style={{height:Math.max(1,candle.volume/biggestVolume*(VOLUME_HEIGHT-6)),backgroundColor:tone,width:7}}/></View>:null}
              {secondaryKey?<View style={styles.secondaryPlot}><View style={{position:'absolute',left:3,width:7,top:Math.min(zeroY,valueY),height:Math.max(1,Math.abs(valueY-zeroY)),backgroundColor:sec>=0?colors.gain:colors.loss}}/></View>:null}
              <Text style={styles.tick}>{showTick?candle.date.slice(5).replace('-','/'):''}</Text>
            </Pressable>;
          })}
          {showCost&&holding?<View pointerEvents="none" style={[styles.costLine,{top:y(holding.costAvg),width:fullWidth}]}><Text style={styles.costLabel}>成本 {price(holding.costAvg)}</Text></View>:null}
          {crosshairEnabled&&selected?<View pointerEvents="none" style={[styles.crosshairLayer,{height:PLOT_HEIGHT+(showVolume?VOLUME_HEIGHT:0)+(secondaryKey?SECONDARY_HEIGHT:0)+20}]}>
            <View style={[styles.verticalCrosshair,{left:LEFT_PAD+selectedIndex*STEP+STEP/2}]}/>
            <View style={[styles.horizontalCrosshair,{top:y(selected.close)}]}/>
            {showVolume?<View style={[styles.volumeCrosshair,{top:PLOT_HEIGHT+Math.max(0,VOLUME_HEIGHT-selected.volume/biggestVolume*(VOLUME_HEIGHT-6))}]}/>:null}
            <View style={[styles.crosshairDateTag,{left:clamp(LEFT_PAD+selectedIndex*STEP-19,0,Math.max(0,fullWidth-50))}]}><Text style={styles.crosshairTagText}>{selected.date.slice(5)}</Text></View>
          </View>:null}
        </ScrollView>
        {crosshairEnabled?<View style={[styles.touchOverlay,{height:PLOT_HEIGHT+(showVolume?VOLUME_HEIGHT:0)+(secondaryKey?SECONDARY_HEIGHT:0)}]}
          onStartShouldSetResponder={()=>true} onMoveShouldSetResponder={()=>true}
          onResponderGrant={e=>chooseAt(e.nativeEvent.locationX)}
          onResponderMove={e=>chooseAt(e.nativeEvent.locationX)}
          accessibilityLabel="十字線觸控區：左右滑動選擇交易日"/>:null}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{price(axisHigh)}</Text>
        {crosshairEnabled&&selected?<Text style={[styles.crosshairPrice,{top:clamp(y(selected.close)-9,0,PLOT_HEIGHT-18)}]}>{price(selected.close)}</Text>:null}
        <Text style={styles.axisText}>{price((axisHigh+axisLow)/2)}</Text>
        <Text style={styles.axisText}>{price(axisLow)}</Text>
        <Text style={styles.axisTitle}>價格</Text>
      </View>
    </View>
    {secondaryKey?<Text style={styles.caption}>副圖：{secondaryLabel[secondaryKey]} · {number(secMin)} ～ {number(secMax)}</Text>:null}
    {holding&&(dataKeys.some(key=>['pnl','comprehensivePnl','roi','marketValue'].includes(key))||chartStyle==='pnl'||chartStyle==='roi'||chartStyle==='cost-price')?<Text style={styles.estimateNote}>歷史持股績效使用目前股數與含費成本套入各日歷史收盤價估值；正式當前損益仍取帳務核心。</Text>:null}
    <Text style={styles.caption}>{crosshairEnabled?'左右拖動十字線檢視歷史資料；關閉後可橫向捲動':'點選交易日查看完整資料；開啟十字線後可拖動'}</Text>
  </View>;
}
const styles=StyleSheet.create({
  root:{gap:7,minHeight:285},notice:{fontSize:11,lineHeight:20,color:colors.textSecondary,padding:14},
  toolbar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:6},
  caption:{fontSize:10,color:colors.textSecondary,flexShrink:1},
  estimateNote:{fontSize:9,lineHeight:14,color:colors.textSecondary},
  crosshairToggle:{paddingHorizontal:9,paddingVertical:6,borderRadius:9,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  crosshairActive:{backgroundColor:colors.primary,borderColor:colors.primary},toggleText:{color:colors.primary,fontSize:10,fontWeight:'800'},toggleActiveText:{color:'#FFFFFF'},
  detail:{padding:8,backgroundColor:colors.surfaceMuted,borderRadius:8,gap:3},
  date:{fontSize:11,color:colors.text,fontWeight:'800'},number:{fontSize:10,color:colors.text,fontWeight:'700'},volumeText:{fontSize:10,color:colors.textSecondary},
  metricText:{fontSize:10,lineHeight:16,color:colors.text,fontWeight:'700'},
  plotRow:{flexDirection:'row',alignItems:'flex-start'},viewport:{flex:1,position:'relative'},scroll:{paddingLeft:LEFT_PAD,paddingRight:4,position:'relative'},
  candleColumn:{alignItems:'center'},pricePlot:{height:PLOT_HEIGHT,width:CANDLE_WIDTH,position:'relative'},
  wick:{position:'absolute',left:6,width:1},body:{position:'absolute',left:2,width:10,borderWidth:1},
  volumePlot:{height:VOLUME_HEIGHT,justifyContent:'flex-end',borderBottomWidth:1,borderBottomColor:colors.border},
  secondaryPlot:{height:SECONDARY_HEIGHT,position:'relative',borderBottomWidth:1,borderBottomColor:colors.border,width:CANDLE_WIDTH},
  tick:{fontSize:7,color:colors.textSecondary,height:20,textAlign:'center',width:STEP,overflow:'visible'},
  axis:{width:PRICE_AXIS_WIDTH,height:PLOT_HEIGHT,justifyContent:'space-between',paddingLeft:3,position:'relative'},
  axisText:{fontSize:9,color:colors.textSecondary},axisTitle:{fontSize:9,color:colors.textSecondary},
  costLine:{position:'absolute',left:0,borderTopWidth:1,borderStyle:'dashed',borderColor:colors.primary,zIndex:3},
  costLabel:{position:'absolute',left:4,top:-15,fontSize:8,fontWeight:'800',color:colors.primary,backgroundColor:colors.surface},
  crosshairLayer:{position:'absolute',top:0,left:0,width:'100%'},
  verticalCrosshair:{position:'absolute',top:0,height:PLOT_HEIGHT,borderLeftWidth:1,borderStyle:'dashed',borderColor:colors.primary},
  horizontalCrosshair:{position:'absolute',left:0,right:0,borderTopWidth:1,borderStyle:'dashed',borderColor:colors.primary},
  volumeCrosshair:{position:'absolute',left:0,right:0,borderTopWidth:1,borderStyle:'dotted',borderColor:colors.textSecondary},
  crosshairPrice:{position:'absolute',right:0,color:'#FFFFFF',backgroundColor:colors.primary,fontSize:9,fontWeight:'800',paddingHorizontal:3,paddingVertical:2,zIndex:2},
  crosshairDateTag:{position:'absolute',bottom:0,backgroundColor:colors.primary,paddingHorizontal:2,minWidth:45,alignItems:'center'},
  crosshairTagText:{color:'#FFFFFF',fontSize:8,fontWeight:'800'},
  touchOverlay:{position:'absolute',top:0,left:0,right:0}
});
