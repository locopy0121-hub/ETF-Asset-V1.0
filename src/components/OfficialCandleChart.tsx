import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {DailyCandle} from '../market/twseDailyHistory';
import {colors} from '../theme/tokens';

const PLOT_HEIGHT=160;
const VOLUME_HEIGHT=50;
const PRICE_AXIS_WIDTH=58;
const CANDLE_WIDTH=13;
const GAP=5;
const STEP=CANDLE_WIDTH+GAP;
const LEFT_PAD=3;
const price=(n:number)=>n.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2});
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
/** A crosshair is tied to a verified candle, never an interpolated OHLC record. */
export const candleIndexAtX=(x:number,scrollX:number,length:number)=>
  length?clamp(Math.floor((x+scrollX-LEFT_PAD)/STEP),0,length-1):-1;

/** TWSE official OHLCV renderer; inspect any candle using the optional crosshair. */
export function OfficialCandleChart({candles,loading,error,rangeLabel}:{candles:readonly DailyCandle[];loading:boolean;error:string|null;rangeLabel:string}){
  const [selectedDate,setSelectedDate]=useState<string|null>(null);
  const [crosshairEnabled,setCrosshairEnabled]=useState(false);
  const [scrollX,setScrollX]=useState(0);
  const ordered=useMemo(()=>[...candles].sort((a,b)=>a.date.localeCompare(b.date)),[candles]);
  const highest=Math.max(...ordered.map(x=>x.high),1);
  const lowest=Math.min(...ordered.map(x=>x.low),highest);
  const margin=Math.max((highest-lowest)*.08,.01);
  const axisHigh=highest+margin,axisLow=lowest-margin,span=axisHigh-axisLow;
  const biggestVolume=Math.max(...ordered.map(x=>x.volume),1);
  const selectedIndex=Math.max(0,ordered.findIndex(x=>x.date===selectedDate));
  const selected=ordered.find(x=>x.date===selectedDate)??ordered[ordered.length-1];
  const y=(value:number)=>(axisHigh-value)/span*PLOT_HEIGHT;
  const fullWidth=LEFT_PAD+ordered.length*STEP+4;
  const chooseAt=(touchX:number)=>{
    const index=candleIndexAtX(touchX,scrollX,ordered.length);
    if(index>=0)setSelectedDate(ordered[index]!.date);
  };

  if(loading)return <Text style={styles.notice}>正在讀取臺灣證交所歷史行情…</Text>;
  if(error)return <Text style={styles.notice}>歷史行情讀取失敗：{error}</Text>;
  if(!ordered.length)return <Text style={styles.notice}>此區間沒有取得官方 OHLC 資料，不顯示示意 K 線。</Text>;

  return <View style={styles.root}>
    <View style={styles.toolbar}>
      <Text style={styles.caption}>TWSE 官方日 K · {rangeLabel} · {ordered.length} 個交易日</Text>
      <Pressable accessibilityRole="switch" accessibilityState={{checked:crosshairEnabled}}
        onPress={()=>{setCrosshairEnabled(value=>!value);setSelectedDate(selected?.date??null);}}
        style={[styles.crosshairToggle,crosshairEnabled&&styles.crosshairActive]}>
        <Text style={[styles.toggleText,crosshairEnabled&&styles.toggleActiveText]}>{crosshairEnabled?'十字線 ON':'十字線 OFF'}</Text>
      </Pressable>
    </View>
    {selected?<View style={styles.detail}><Text style={styles.date}>{selected.date}</Text><Text style={styles.number}>開 {price(selected.open)}　高 {price(selected.high)}　低 {price(selected.low)}　收 {price(selected.close)}</Text><Text style={styles.volumeText}>成交量 {selected.volume.toLocaleString('zh-TW')} 股</Text></View>:null}
    <View style={styles.plotRow}>
      <View style={styles.viewport}>
        <ScrollView horizontal scrollEnabled={!crosshairEnabled} showsHorizontalScrollIndicator
          scrollEventThrottle={16} onScroll={event=>setScrollX(event.nativeEvent.contentOffset.x)}
          contentContainerStyle={[styles.scroll,{width:fullWidth}]}>
          {ordered.map((candle,index)=>{
            const positive=candle.close>=candle.open;
            const tone=positive?colors.gain:colors.loss;
            const candleTop=y(Math.max(candle.open,candle.close));
            const candleBottom=y(Math.min(candle.open,candle.close));
            const wickTop=y(candle.high),wickBottom=y(candle.low);
            const bodyHeight=Math.max(2,candleBottom-candleTop);
            const showTick=index===0||index===ordered.length-1||candle.date.slice(0,7)!==ordered[index-1]?.date.slice(0,7)||index%Math.max(1,Math.ceil(ordered.length/5))===0;
            return <Pressable accessibilityRole="button" accessibilityLabel={candle.date+'，開'+price(candle.open)+'，高'+price(candle.high)+'，低'+price(candle.low)+'，收'+price(candle.close)}
              key={candle.date} onPress={()=>setSelectedDate(candle.date)}
              style={[styles.candleColumn,{width:STEP,backgroundColor:selected?.date===candle.date&&crosshairEnabled?'rgba(148,163,184,.12)':'transparent'}]}>
              <View style={styles.pricePlot}>
                <View style={[styles.wick,{top:wickTop,height:Math.max(1,wickBottom-wickTop),backgroundColor:tone}]}/>
                <View style={[styles.body,{top:candleTop,height:bodyHeight,backgroundColor:positive?'transparent':tone,borderColor:tone}]}/>
              </View>
              <View style={styles.volumePlot}><View style={{height:Math.max(1,candle.volume/biggestVolume*(VOLUME_HEIGHT-6)),backgroundColor:tone,width:7}}/></View>
              <Text style={styles.tick}>{showTick?candle.date.slice(5).replace('-','/'):''}</Text>
            </Pressable>;
          })}
          {crosshairEnabled&&selected?<View pointerEvents="none" style={styles.crosshairLayer}>
            <View style={[styles.verticalCrosshair,{left:LEFT_PAD+selectedIndex*STEP+STEP/2}]}/>
            <View style={[styles.horizontalCrosshair,{top:y(selected.close)}]}/>
            <View style={[styles.volumeCrosshair,{left:LEFT_PAD+selectedIndex*STEP+STEP/2}]}/>
            <View style={[styles.crosshairDateTag,{left:clamp(LEFT_PAD+selectedIndex*STEP-19,0,Math.max(0,fullWidth-50))}]}><Text style={styles.crosshairTagText}>{selected.date.slice(5)}</Text></View>
          </View>:null}
        </ScrollView>
        {crosshairEnabled?<View style={styles.touchOverlay}
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
    <Text style={styles.caption}>下方柱狀圖為成交股數 · {crosshairEnabled?'左右拖動十字線檢視 OHLCV；關閉後可橫向捲動':'點選 K 棒查看完整 OHLCV；開啟十字線後可拖動'}</Text>
  </View>;
}
const styles=StyleSheet.create({
  root:{gap:7,minHeight:285},notice:{fontSize:11,lineHeight:20,color:colors.textSecondary,padding:14},
  toolbar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:6},
  caption:{fontSize:10,color:colors.textSecondary,flexShrink:1},
  crosshairToggle:{paddingHorizontal:9,paddingVertical:6,borderRadius:9,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  crosshairActive:{backgroundColor:colors.primary,borderColor:colors.primary},toggleText:{color:colors.primary,fontSize:10,fontWeight:'800'},toggleActiveText:{color:'#FFFFFF'},
  detail:{padding:8,backgroundColor:colors.surfaceMuted,borderRadius:8,gap:3},
  date:{fontSize:11,color:colors.text,fontWeight:'800'},number:{fontSize:10,color:colors.text,fontWeight:'700'},volumeText:{fontSize:10,color:colors.textSecondary},
  plotRow:{flexDirection:'row',alignItems:'flex-start'},viewport:{flex:1,position:'relative'},scroll:{paddingLeft:LEFT_PAD,paddingRight:4,position:'relative'},
  candleColumn:{alignItems:'center'},pricePlot:{height:PLOT_HEIGHT,width:CANDLE_WIDTH,position:'relative'},
  wick:{position:'absolute',left:6,width:1},body:{position:'absolute',left:2,width:10,borderWidth:1},
  volumePlot:{height:VOLUME_HEIGHT,justifyContent:'flex-end',borderBottomWidth:1,borderBottomColor:colors.border},
  tick:{fontSize:7,color:colors.textSecondary,height:20,textAlign:'center',width:STEP,overflow:'visible'},
  axis:{width:PRICE_AXIS_WIDTH,height:PLOT_HEIGHT,justifyContent:'space-between',paddingLeft:3,position:'relative'},
  axisText:{fontSize:9,color:colors.textSecondary},axisTitle:{fontSize:9,color:colors.textSecondary},
  crosshairLayer:{position:'absolute',top:0,left:0,width:'100%',height:PLOT_HEIGHT+VOLUME_HEIGHT+20},
  verticalCrosshair:{position:'absolute',top:0,height:PLOT_HEIGHT,borderLeftWidth:1,borderStyle:'dashed',borderColor:colors.primary},
  horizontalCrosshair:{position:'absolute',left:0,right:0,borderTopWidth:1,borderStyle:'dashed',borderColor:colors.primary},
  volumeCrosshair:{position:'absolute',top:PLOT_HEIGHT,height:VOLUME_HEIGHT,borderLeftWidth:1,borderStyle:'dashed',borderColor:colors.primary},
  crosshairPrice:{position:'absolute',right:0,color:'#FFFFFF',backgroundColor:colors.primary,fontSize:9,fontWeight:'800',paddingHorizontal:3,paddingVertical:2,zIndex:2},
  crosshairDateTag:{position:'absolute',bottom:0,backgroundColor:colors.primary,paddingHorizontal:2,minWidth:45,alignItems:'center'},
  crosshairTagText:{color:'#FFFFFF',fontSize:8,fontWeight:'800'},
  touchOverlay:{position:'absolute',top:0,left:0,right:0,height:PLOT_HEIGHT+VOLUME_HEIGHT}
});