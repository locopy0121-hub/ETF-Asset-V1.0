import {useMemo} from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import type {HoldingQuote} from '../domain/uiModels';

// Presentation only: never change Canonical Portfolio values or compute an alternative valuation.
const PALETTE=['#55C6E8','#24D46B','#FA4388','#E3BA4A','#873FF0','#A1B0C3','#FF865B','#38BAAC','#CB79E8','#6592FF'];
const SIZE=210;
const RADIUS=78;
const CIRCUMFERENCE=2*Math.PI*RADIUS;
const amount=(value:number)=>value.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2});

export function PortfolioAllocationDonut({rows,totalMarketValue,valuationComplete}:{
  rows:readonly HoldingQuote[];
  totalMarketValue:number;
  valuationComplete:boolean;
}){
  const {width}=useWindowDimensions();
  const compact=width<380;
  const allocations=useMemo(()=>{
    // Use the same per-holding market values as the existing portfolio; no mock data.
    const positive=rows.filter(item=>Number.isFinite(item.marketValue)&&item.marketValue>0);
    const denominator=positive.reduce((sum,item)=>sum+item.marketValue,0);
    return positive.map((item,index)=>({
      symbol:item.symbol,
      value:item.marketValue,
      ratio:denominator>0?item.marketValue/denominator:0,
      color:PALETTE[index%PALETTE.length],
    }));
  },[rows]);
  let offset=0;
  return <View style={styles.panel}>
    <Text style={styles.count}>{rows.length} 檔 ETF</Text>
    {!valuationComplete?
      <Text style={styles.message}>部分持股尚缺官方行情；資產占比暫不顯示，帳務成本仍保留。</Text>
      :allocations.length===0?
        <Text style={styles.message}>尚無可顯示的持股市值。</Text>
        :<View style={[styles.layout,compact&&styles.compact]}>
          <View style={styles.chart} accessibilityLabel="持股市值資產配置環形圖">
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              <Circle cx={SIZE/2} cy={SIZE/2} r={RADIUS} stroke="#2A3543" strokeWidth={30} fill="none"/>
              {allocations.map(item=>{
                const length=item.ratio*CIRCUMFERENCE;
                const current=offset;
                offset+=length;
                return <Circle key={item.symbol} cx={SIZE/2} cy={SIZE/2} r={RADIUS}
                  stroke={item.color} strokeWidth={30} fill="none"
                  strokeDasharray={`${length} ${CIRCUMFERENCE-length}`}
                  strokeDashoffset={-current}
                  rotation={-90} originX={SIZE/2} originY={SIZE/2}/>;
              })}
            </Svg>
            <View pointerEvents="none" style={styles.center}>
              <Text style={styles.centerCaption}>持股總市值</Text>
              <Text adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.65} style={styles.total}>{amount(totalMarketValue)}</Text>
            </View>
          </View>
          <View style={styles.legend}>
            {allocations.map(item=><View key={item.symbol} style={styles.legendRow}>
              <View style={[styles.dot,{backgroundColor:item.color}]}/>
              <Text style={styles.symbol} numberOfLines={1}>{item.symbol}</Text>
              <Text style={styles.percent}>{(item.ratio*100).toFixed(1)}%</Text>
            </View>)}
          </View>
        </View>}
  </View>;
}

const styles=StyleSheet.create({
  panel:{backgroundColor:'#1C2835',borderRadius:18,padding:14,gap:12},
  count:{color:'#DDBD64',fontWeight:'800',fontSize:12,textAlign:'right'},
  layout:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  compact:{flexDirection:'column',alignItems:'stretch'},
  chart:{width:SIZE,height:SIZE,alignSelf:'center',justifyContent:'center',alignItems:'center'},
  center:{position:'absolute',left:39,right:39,top:65,bottom:65,justifyContent:'center',alignItems:'center',gap:4},
  centerCaption:{color:'#AAB7C6',fontSize:11},
  total:{color:'#FFFFFF',fontWeight:'900',fontSize:20,fontVariant:['tabular-nums'],textAlign:'center',width:'100%'},
  legend:{flex:1,minWidth:0,gap:11},
  legendRow:{flexDirection:'row',alignItems:'center',gap:7},
  dot:{height:10,width:10,borderRadius:5},
  symbol:{color:'#B8C3CF',fontSize:12,flex:1,fontVariant:['tabular-nums']},
  percent:{color:'#FFFFFF',fontSize:13,fontWeight:'900',fontVariant:['tabular-nums'],textAlign:'right'},
  message:{color:'#D7E0EA',fontSize:12,lineHeight:19},
});
