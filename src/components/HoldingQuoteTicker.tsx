import {useEffect,useRef,useState} from 'react';
import {Animated,StyleSheet,Text,View} from 'react-native';
import type {HoldingQuote,WallTickerConfig} from '../domain/uiModels';
import {quoteTickerCell} from '../domain/quoteTicker';

/** A-layer presentation-only ticker. It NEVER polls, changes a source clock or writes finance data. */
export function HoldingQuoteTicker({rows,config}:{rows:readonly HoldingQuote[];config:WallTickerConfig}){
  const [viewportWidth,setViewportWidth]=useState(0);
  const [contentWidth,setContentWidth]=useState(0);
  const position=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    position.stopAnimation();
    if(!config.enabled||!viewportWidth||!contentWidth)return;
    const start=config.direction==='left'?viewportWidth:-contentWidth;
    const finish=config.direction==='left'?-contentWidth:viewportWidth;
    position.setValue(start);
    const distance=viewportWidth+contentWidth;
    const animation=Animated.loop(Animated.timing(position,{
      toValue:finish,duration:Math.max(1500,Math.round(distance/Math.max(15,config.speed)*1000)),
      useNativeDriver:true,isInteraction:false,
    }));
    animation.start();
    return ()=>animation.stop();
  },[position,config.enabled,config.direction,config.speed,viewportWidth,contentWidth]);
  if(!config.enabled||rows.length===0)return null;
  const cells=rows.slice(0,40).map(row=>quoteTickerCell(row,config));
  return <View style={[styles.viewport,{backgroundColor:config.backgroundColor}]}
    onLayout={e=>setViewportWidth(e.nativeEvent.layout.width)} accessible accessibilityLabel={cells.join('；')}>
    <Animated.View onLayout={e=>setContentWidth(e.nativeEvent.layout.width)}
      style={[styles.track,{gap:config.itemGap,transform:[{translateX:position}]}]}>
      {cells.map((cell,index)=><Text key={rows[index]!.symbol+'-'+index} numberOfLines={1}
        style={[styles.cell,{color:config.textColor}]}>{cell}</Text>)}
    </Animated.View>
  </View>;
}
const styles=StyleSheet.create({
  viewport:{height:30,overflow:'hidden',justifyContent:'center',borderRadius:8,marginBottom:6},
  track:{position:'absolute',left:0,top:7,alignItems:'center',flexDirection:'row',alignSelf:'flex-start'},
  cell:{fontSize:11,fontWeight:'700',lineHeight:16},
});
