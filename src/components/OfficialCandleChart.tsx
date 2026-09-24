import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {DailyCandle} from '../market/twseDailyHistory';
import {colors} from '../theme/tokens';

const PLOT_HEIGHT=160;
const VOLUME_HEIGHT=50;
const PRICE_AXIS_WIDTH=58;
const CANDLE_WIDTH=13;
const GAP=5;
const price=(n:number)=>n.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2});

/** Strict OHLC candles and volume. No derived/mock candles from one last price. */
export function OfficialCandleChart({candles,loading,error,rangeLabel}:{candles:readonly DailyCandle[];loading:boolean;error:string|null;rangeLabel:string}){
  const [selectedDate,setSelectedDate]=useState<string|null>(null);
  const ordered=useMemo(()=>[...candles].sort((a,b)=>a.date.localeCompare(b.date)),[candles]);
  const highest=Math.max(...ordered.map(x=>x.high),1);
  const lowest=Math.min(...ordered.map(x=>x.low),highest);
  const margin=Math.max((highest-lowest)*.08,.01);
  const axisHigh=highest+margin,axisLow=lowest-margin,span=axisHigh-axisLow;
  const biggestVolume=Math.max(...ordered.map(x=>x.volume),1);
  const selected=ordered.find(x=>x.date===selectedDate)??ordered[ordered.length-1];
  const y=(value:number)=>(axisHigh-value)/span*PLOT_HEIGHT;

  if(loading)return <Text style={styles.notice}>正在讀取臺灣證交所歷史行情…</Text>;
  if(error)return <Text style={styles.notice}>歷史行情讀取失敗：{error}</Text>;
  if(!ordered.length)return <Text style={styles.notice}>此區間沒有取得官方 OHLC 資料，不顯示示意 K 線。</Text>;

  return <View style={styles.root}>
    <Text style={styles.caption}>TWSE 官方日 K · {rangeLabel} · {ordered.length} 個交易日</Text>
    {selected?<View style={styles.detail}><Text style={styles.date}>{selected.date}</Text><Text style={styles.number}>開 {price(selected.open)}　高 {price(selected.high)}　低 {price(selected.low)}　收 {price(selected.close)}</Text><Text style={styles.volumeText}>成交量 {selected.volume.toLocaleString('zh-TW')} 股</Text></View>:null}
    <View style={styles.plotRow}>
      <ScrollView horizontal contentContainerStyle={styles.scroll} showsHorizontalScrollIndicator>
        {ordered.map(candle=>{
          const positive=candle.close>=candle.open;
          const tone=positive?colors.gain:colors.loss;
          const candleTop=y(Math.max(candle.open,candle.close));
          const candleBottom=y(Math.min(candle.open,candle.close));
          const wickTop=y(candle.high),wickBottom=y(candle.low);
          const bodyHeight=Math.max(2,candleBottom-candleTop);
          return <Pressable accessibilityRole="button" accessibilityLabel={candle.date+'，開'+price(candle.open)+'，高'+price(candle.high)+'，低'+price(candle.low)+'，收'+price(candle.close)}
            key={candle.date} onPress={()=>setSelectedDate(candle.date)}
            style={[styles.candleColumn,{width:CANDLE_WIDTH+GAP,backgroundColor:selected?.date===candle.date?'rgba(148,163,184,.14)':'transparent'}]}>
            <View style={styles.pricePlot}>
              <View style={[styles.wick,{top:wickTop,height:Math.max(1,wickBottom-wickTop),backgroundColor:tone}]}/>
              <View style={[styles.body,{top:candleTop,height:bodyHeight,backgroundColor:positive?'transparent':tone,borderColor:tone}]}/>
            </View>
            <View style={styles.volumePlot}>
              <View style={{height:Math.max(1,candle.volume/biggestVolume*(VOLUME_HEIGHT-6)),backgroundColor:tone,width:7}}/>
            </View>
            <Text style={styles.tick}>{candle.date.slice(5).replace('-','/')}</Text>
          </Pressable>;
        })}
      </ScrollView>
      <View style={styles.axis}><Text style={styles.axisText}>{price(axisHigh)}</Text><Text style={styles.axisText}>{price((axisHigh+axisLow)/2)}</Text><Text style={styles.axisText}>{price(axisLow)}</Text><Text style={styles.axisTitle}>價格</Text></View>
    </View>
    <Text style={styles.caption}>下方柱狀圖為成交股數 · 點選 K 棒查看完整 OHLCV</Text>
  </View>;
}
const styles=StyleSheet.create({
  root:{gap:7,minHeight:285},notice:{fontSize:11,lineHeight:20,color:colors.textSecondary,padding:14},
  caption:{fontSize:10,color:colors.textSecondary},detail:{padding:8,backgroundColor:colors.surfaceMuted,borderRadius:8,gap:3},
  date:{fontSize:11,color:colors.text,fontWeight:'800'},number:{fontSize:10,color:colors.text,fontWeight:'700'},volumeText:{fontSize:10,color:colors.textSecondary},
  plotRow:{flexDirection:'row',alignItems:'flex-start'},scroll:{paddingLeft:3,paddingRight:4},candleColumn:{alignItems:'center'},pricePlot:{height:PLOT_HEIGHT,width:CANDLE_WIDTH,position:'relative'},
  wick:{position:'absolute',left:6,width:1},body:{position:'absolute',left:2,width:10,borderWidth:1},
  volumePlot:{height:VOLUME_HEIGHT,justifyContent:'flex-end',borderBottomWidth:1,borderBottomColor:colors.border},
  tick:{fontSize:7,color:colors.textSecondary,height:20,width:22,textAlign:'center'},
  axis:{width:PRICE_AXIS_WIDTH,height:PLOT_HEIGHT,justifyContent:'space-between',paddingLeft:3},axisText:{fontSize:9,color:colors.textSecondary},axisTitle:{fontSize:9,color:colors.textSecondary}
});
