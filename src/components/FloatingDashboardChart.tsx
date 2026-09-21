import { useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DashboardChartConfig } from '../editor/editorModel';
import { radius } from '../theme/tokens';

const blocks='▁▂▃▄▅▆▇█';
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

export function FloatingDashboardChart({
  config,
  values,
  labels,
  bounds,
  onMove,
}:{
  config:DashboardChartConfig;
  values:readonly number[];
  labels:readonly string[];
  bounds:{width:number;height:number};
  onMove:(x:number,y:number)=>void;
}){
  const maxX=Math.max(0,bounds.width-config.width);
  const maxY=Math.max(0,bounds.height-config.height);
  const effectiveX=config.x<0?maxX:clamp(config.x,0,maxX);
  const effectiveY=clamp(config.y,0,maxY);
  const start=useRef({x:effectiveX,y:effectiveY});
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>!config.locked,
    onMoveShouldSetPanResponder:(_,g)=>!config.locked&&(Math.abs(g.dx)>3||Math.abs(g.dy)>3),
    onPanResponderGrant:()=>{start.current={x:effectiveX,y:effectiveY};},
    onPanResponderRelease:(_,g)=>{
      if(config.locked)return;
      onMove(clamp(start.current.x+g.dx,0,maxX),clamp(start.current.y+g.dy,0,maxY));
    },
  }),[config.locked,effectiveX,effectiveY,maxX,maxY,onMove]);

  if(!config.visible)return null;
  const safe=values.length?values:[0];
  const max=Math.max(1,...safe.map(v=>Math.abs(v)));
  const spark=safe.map(value=>blocks[Math.round(clamp(Math.abs(value)/max,0,1)*(blocks.length-1))]).join('');
  const styleLabel:Record<string,string>={
    line:'折線圖',area:'面積圖',bar:'長條圖',horizontalBar:'水平長條',stackedBar:'堆疊長條',pie:'圓餅圖',donut:'甜甜圈',
    allocation:'資產配置',pnlTrend:'損益趨勢',dividendTrend:'股息趨勢',investVsValue:'投入 vs 市值',holdingWeight:'持股占比',
    costVsPrice:'成本 vs 市價',roiTrend:'報酬率趨勢',priceK:'價格／K 線',volume:'成交量',
  };

  return <View
    {...responder.panHandlers}
    style={[styles.card,{
      left:effectiveX,top:effectiveY,width:config.width,height:config.height,zIndex:config.zIndex,
      backgroundColor:config.backgroundColor,opacity:config.opacity,borderColor:config.accentColor,
    }]}
  >
    <View style={styles.header}>
      <View style={{flex:1}}>
        <Text numberOfLines={1} style={[styles.title,{color:config.textColor}]}>{config.title}</Text>
        <Text style={[styles.sub,{color:config.textColor}]}>{styleLabel[config.style]??config.style}{config.locked?' · 已鎖定':' · 可自由拖移'}</Text>
      </View>
      <Text style={[styles.drag,{color:config.accentColor}]}>{config.locked?'🔒':'↕'}</Text>
    </View>
    {(config.style==='line'||config.style==='area'||config.style==='pnlTrend'||config.style==='dividendTrend'||config.style==='roiTrend'||config.style==='priceK')
      ?<View style={styles.sparkWrap}><Text adjustsFontSizeToFit numberOfLines={1} style={[styles.spark,{color:config.accentColor}]}>{spark}</Text></View>
      :config.style==='pie'||config.style==='donut'||config.style==='allocation'||config.style==='holdingWeight'
        ?<View style={styles.pieWrap}><View style={[styles.ring,{borderColor:config.accentColor}]}><Text style={[styles.ringText,{color:config.textColor}]}>{safe.length}</Text></View><View style={styles.legend}>{safe.slice(0,4).map((value,index)=><Text key={index} numberOfLines={1} style={[styles.legendText,{color:config.textColor}]}>{labels[index]??String(index+1)} {Math.round(value).toLocaleString('zh-TW')}</Text>)}</View></View>
        :<View style={styles.bars}>{safe.slice(0,8).map((value,index)=><View key={index} style={styles.barCol}><View style={[styles.bar,{height:Math.max(6,Math.round(Math.abs(value)/max*74)),backgroundColor:config.accentColor}]}/><Text numberOfLines={1} style={[styles.barLabel,{color:config.textColor}]}>{labels[index]??index+1}</Text></View>)}</View>
    }
  </View>;
}

const styles=StyleSheet.create({
  card:{position:'absolute',borderWidth:1,borderRadius:radius.lg,padding:10,overflow:'hidden'},
  header:{flexDirection:'row',alignItems:'center',gap:8},
  title:{fontSize:12,fontWeight:'900'},
  sub:{fontSize:8,opacity:.65,marginTop:2},
  drag:{fontSize:16,fontWeight:'900'},
  sparkWrap:{flex:1,justifyContent:'center'},
  spark:{fontSize:28,fontWeight:'900',letterSpacing:1},
  pieWrap:{flex:1,flexDirection:'row',alignItems:'center',gap:12},
  ring:{width:68,height:68,borderRadius:34,borderWidth:12,alignItems:'center',justifyContent:'center'},
  ringText:{fontSize:12,fontWeight:'900'},
  legend:{flex:1,gap:4},
  legendText:{fontSize:8,fontWeight:'700'},
  bars:{flex:1,flexDirection:'row',alignItems:'flex-end',gap:4,paddingTop:10},
  barCol:{flex:1,height:'100%',justifyContent:'flex-end',alignItems:'center'},
  bar:{width:'80%',minHeight:6,borderRadius:4},
  barLabel:{fontSize:7,marginTop:3,maxWidth:42},
});
