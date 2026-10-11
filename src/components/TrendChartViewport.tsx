import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {DEFAULT_CHART_ZOOM,stepChartZoom} from '../domain/chartZoom';
import {trendCenteredOffset,trendContentWidth} from '../domain/trendViewport';
type Props={pointCount:number;seriesId:string;plotHeight:number;leftHigh:string;leftLow:string;rightValue:string;children:(width:number)=>ReactNode};
/** Reusable scroll-and-zoom viewport for financial history charts with fixed left/reference and right/actual axes. */
export function TrendChartViewport({pointCount,seriesId,plotHeight,leftHigh,leftLow,rightValue,children}:Props){
 const [viewportWidth,setViewportWidth]=useState(240);
 const [zoom,setZoom]=useState(DEFAULT_CHART_ZOOM);
 const scrollRef=useRef<ScrollView|null>(null);
 const offset=useRef(0);
 const lastWidth=useRef(240);
 const pendingCenter=useRef<{offset:number;width:number}|null>(null);
 const plotWidth=trendContentWidth(viewportWidth,pointCount,zoom);
 const requestZoom=(next:number)=>{
   if(next===zoom)return;
   pendingCenter.current={offset:offset.current,width:lastWidth.current||plotWidth};
   setZoom(next);
 };
 useEffect(()=>{
   pendingCenter.current=null;
   offset.current=0;
   scrollRef.current?.scrollToEnd({animated:false});
 },[seriesId]);
 return <View style={styles.root}>
   <View style={styles.controls}>
     <Text style={styles.hint}>左右滑動查看歷史 · 縮放</Text>
     <View style={styles.buttons}>
       <Pressable accessibilityRole="button" accessibilityLabel="縮小統計圖表" disabled={zoom<=.65}
         onPress={()=>requestZoom(stepChartZoom(zoom,-1))} style={[styles.button,zoom<=.65&&styles.disabled]}>
         <Text style={styles.buttonText}>－</Text>
       </Pressable>
       <Pressable accessibilityRole="button" accessibilityLabel="還原統計圖表縮放"
         onPress={()=>requestZoom(DEFAULT_CHART_ZOOM)} style={styles.button}>
         <Text style={styles.percent}>{Math.round(zoom*100)}%</Text>
       </Pressable>
       <Pressable accessibilityRole="button" accessibilityLabel="放大統計圖表" disabled={zoom>=2.5}
         onPress={()=>requestZoom(stepChartZoom(zoom,1))} style={[styles.button,zoom>=2.5&&styles.disabled]}>
         <Text style={styles.buttonText}>＋</Text>
       </Pressable>
     </View>
   </View>
   <View style={styles.plotRow}>
     <View style={[styles.axis,{height:plotHeight}]}>
       <Text style={styles.axisNumber} numberOfLines={2}>{leftHigh}</Text>
       <Text style={styles.axisNumber} numberOfLines={2}>{leftLow}</Text>
       <Text style={styles.axisTitle}>基準</Text>
     </View>
     <View style={styles.viewport} onLayout={event=>{
       const next=Math.floor(event.nativeEvent.layout.width);
       if(next>0)setViewportWidth(previous=>previous===next?previous:next);
     }}>
       <ScrollView ref={scrollRef} horizontal nestedScrollEnabled directionalLockEnabled
         showsHorizontalScrollIndicator scrollEventThrottle={16}
         onScroll={event=>{offset.current=event.nativeEvent.contentOffset.x;}}
         onContentSizeChange={width=>{
           if(pendingCenter.current){
             const previous=pendingCenter.current;
             pendingCenter.current=null;
             const target=trendCenteredOffset(previous.offset,viewportWidth,previous.width,width);
             offset.current=target;
             scrollRef.current?.scrollTo({x:target,animated:false});
           }
           lastWidth.current=width;
         }}
         contentContainerStyle={{width:plotWidth}}>
         {children(plotWidth)}
       </ScrollView>
     </View>
     <View style={[styles.axis,styles.actualAxis,{height:plotHeight}]}>
       <Text style={styles.actualValue} numberOfLines={3}>{rightValue}</Text>
       <Text style={styles.axisTitle}>實際值</Text>
     </View>
   </View>
 </View>;
}
const styles=StyleSheet.create({
 root:{gap:6},controls:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:6},
 hint:{fontSize:9,color:'#94A3B8'},buttons:{flexDirection:'row',alignItems:'center',gap:4},
 button:{minWidth:31,minHeight:30,paddingHorizontal:6,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#64748B',borderRadius:7},
 buttonText:{fontSize:17,fontWeight:'800',color:'#E2E8F0'},percent:{fontSize:10,fontWeight:'800',color:'#E2E8F0'},
 disabled:{opacity:.4},plotRow:{flexDirection:'row',alignItems:'flex-start'},viewport:{flex:1,minWidth:0},
 axis:{width:57,justifyContent:'space-between',paddingRight:3,paddingTop:10,paddingBottom:8},
 axisNumber:{fontSize:9,color:'#94A3B8',fontVariant:['tabular-nums']},
 axisTitle:{position:'absolute',bottom:-16,left:0,fontSize:9,color:'#94A3B8'},
 actualAxis:{alignItems:'flex-end',paddingLeft:3,paddingRight:0},
 actualValue:{fontSize:10,fontWeight:'800',color:'#E2E8F0',textAlign:'right'},
});
