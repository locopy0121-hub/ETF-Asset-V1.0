import {useMemo,useRef,useState} from 'react';
import {Modal,PanResponder,Pressable,StyleSheet,Text,View} from 'react-native';

import type {DashboardChartConfig} from '../editor/editorModel';

const blocks='▁▂▃▄▅▆▇█';
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const rgba=(hex:string,alpha:number)=>{
  const m=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if(!m)return hex;
  return 'rgba('+parseInt(m[1]!,16)+','+parseInt(m[2]!,16)+','+parseInt(m[3]!,16)+','+clamp(alpha,0,1)+')';
};
const distance=(touches:readonly {pageX:number;pageY:number}[])=>{
  if(touches.length<2)return 0;
  const a=touches[0],b=touches[1];
  return Math.hypot((a?.pageX??0)-(b?.pageX??0),(a?.pageY??0)-(b?.pageY??0));
};

export function FloatingDashboardChart({
  config,values,labels,bounds,onMove,onResize,
}:{
  config:DashboardChartConfig;
  values:readonly number[];
  labels:readonly string[];
  bounds:{width:number;height:number};
  onMove:(x:number,y:number)=>void;
  onResize:(width:number,height:number)=>void;
}){
  const [zoom,setZoom]=useState(1);
  const [panIndex,setPanIndex]=useState(0);
  const [selected,setSelected]=useState<number|null>(null);
  const [fullScreen,setFullScreen]=useState(false);
  const maxX=Math.max(0,bounds.width-config.width),maxY=Math.max(0,bounds.height-config.height);
  const effectiveX=config.x<0?maxX:clamp(config.x,0,maxX),effectiveY=clamp(config.y,0,maxY);
  const moveStart=useRef({x:effectiveX,y:effectiveY});
  const resizeStart=useRef({width:config.width,height:config.height});
  const gestureStart=useRef({zoom:1,pan:0,distance:0,tapAt:0});

  const safeValues=values.length?values:[0];
  const view=useMemo(()=>{
    const nextZoom=clamp(zoom,config.zoomMin,config.zoomMax);
    const count=Math.max(1,Math.min(safeValues.length,Math.ceil(safeValues.length/nextZoom)));
    const maxStart=Math.max(0,safeValues.length-count);
    const start=clamp(Math.round(panIndex),0,maxStart);
    return {values:safeValues.slice(start,start+count),labels:labels.slice(start,start+count),start,count};
  },[safeValues,labels,zoom,panIndex,config.zoomMin,config.zoomMax]);

  const resetZoom=()=>{setZoom(1);setPanIndex(0);setSelected(null);};

  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>!config.touchThrough,
    onMoveShouldSetPanResponder:(_,g)=>!config.touchThrough&&(g.numberActiveTouches>1||Math.abs(g.dx)>3||Math.abs(g.dy)>3),
    onPanResponderGrant:event=>{
      moveStart.current={x:effectiveX,y:effectiveY};
      gestureStart.current={zoom,pan:panIndex,distance:distance(event.nativeEvent.touches as {pageX:number;pageY:number}[]),tapAt:gestureStart.current.tapAt};
    },
    onPanResponderMove:(event,g)=>{
      if(config.touchThrough)return;
      const touches=event.nativeEvent.touches as {pageX:number;pageY:number}[];
      if(config.locked&&config.pinchZoomEnabled&&touches.length>=2){
        const current=distance(touches),base=Math.max(1,gestureStart.current.distance);
        setZoom(clamp(gestureStart.current.zoom*(current/base),config.zoomMin,config.zoomMax));
        return;
      }
      if(config.locked&&config.panEnabled&&touches.length<=1){
        const step=Math.max(1,config.width/Math.max(1,view.count));
        setPanIndex(gestureStart.current.pan-g.dx/step);
      }
    },
    onPanResponderRelease:(_,g)=>{
      if(config.touchThrough)return;
      if(!config.locked){
        const nextX=Math.round(clamp(moveStart.current.x+g.dx,0,maxX)/8)*8;
        const nextY=Math.round(clamp(moveStart.current.y+g.dy,0,maxY)/8)*8;
        onMove(nextX,nextY);
        return;
      }
      const small=Math.abs(g.dx)<5&&Math.abs(g.dy)<5;
      if(small&&config.doubleTapReset){
        const now=Date.now();
        if(now-gestureStart.current.tapAt<320)resetZoom();
        gestureStart.current.tapAt=now;
      }
    },
  }),[config.touchThrough,config.locked,config.pinchZoomEnabled,config.panEnabled,config.doubleTapReset,config.zoomMin,config.zoomMax,config.width,effectiveX,effectiveY,maxX,maxY,onMove,zoom,panIndex,view.count]);

  const resizeResponder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>!config.locked,
    onMoveShouldSetPanResponder:()=>!config.locked,
    onPanResponderGrant:()=>{resizeStart.current={width:config.width,height:config.height};},
    onPanResponderRelease:(_,g)=>{
      if(config.locked)return;
      const maxWidth=Math.max(140,bounds.width-effectiveX);
      const maxHeight=Math.max(120,bounds.height-effectiveY);
      let width=clamp(resizeStart.current.width+g.dx,140,maxWidth);
      let height=clamp(resizeStart.current.height+g.dy,120,maxHeight);
      if(config.aspectLocked){
        const ratio=Math.max(.1,resizeStart.current.width/Math.max(1,resizeStart.current.height));
        height=clamp(width/ratio,120,maxHeight);
        width=clamp(height*ratio,140,maxWidth);
      }
      onResize(Math.round(width/8)*8,Math.round(height/8)*8);
    },
  }),[config.locked,config.width,config.height,config.aspectLocked,bounds.width,bounds.height,effectiveX,effectiveY,onResize]);

  if(!config.visible)return null;
  const styleLabel:Record<string,string>={
    line:'折線圖',area:'面積圖',bar:'長條圖',horizontalBar:'水平長條',stackedBar:'堆疊長條',pie:'圓餅圖',donut:'甜甜圈',
    allocation:'資產配置',pnlTrend:'損益趨勢',dividendTrend:'股息趨勢',investVsValue:'投入 vs 市值',holdingWeight:'持股占比',
    costVsPrice:'成本 vs 市價',roiTrend:'報酬率趨勢',priceK:'價格／K 線',volume:'成交量',
  };

  const plot=(large=false)=>{
    const local=view.values.length?view.values:[0];
    const max=Math.max(1,...local.map(v=>Math.abs(v)));
    const spark=local.map(value=>blocks[Math.round(clamp(Math.abs(value)/max,0,1)*(blocks.length-1))]).join('');
    const selectedIndex=selected==null?null:clamp(selected,0,local.length-1);
    return <View style={[styles.plot,{opacity:config.contentOpacity}]}>
      {config.gridVisible?<View pointerEvents="none" style={styles.grid}><View style={[styles.gridLine,{borderColor:rgba(config.textColor,.12)}]}/><View style={[styles.gridLine,{borderColor:rgba(config.textColor,.12)}]}/><View style={[styles.gridLine,{borderColor:rgba(config.textColor,.12)}]}/></View>:null}
      {(config.style==='line'||config.style==='area'||config.style==='pnlTrend'||config.style==='dividendTrend'||config.style==='roiTrend'||config.style==='priceK')
        ?<View style={styles.sparkWrap}><Text adjustsFontSizeToFit numberOfLines={1} style={[styles.spark,{color:config.accentColor,fontSize:large?44:28}]}>{spark}</Text></View>
        :config.style==='pie'||config.style==='donut'||config.style==='allocation'||config.style==='holdingWeight'
          ?<View style={styles.pieWrap}><View style={[styles.ring,{borderColor:config.accentColor,width:large?120:68,height:large?120:68,borderRadius:large?60:34,borderWidth:large?20:12}]}><Text style={[styles.ringText,{color:config.textColor}]}>{local.length}</Text></View>{config.legendVisible?<View style={styles.legend}>{local.slice(0,6).map((value,index)=><Pressable key={index} onPress={()=>setSelected(index)}><Text numberOfLines={1} style={[styles.legendText,{color:config.textColor}]}>{(view.labels[index]??String(index+1))+' '+Math.round(value).toLocaleString('zh-TW')}</Text></Pressable>)}</View>:null}</View>
          :<View style={styles.bars}>{local.slice(0,12).map((value,index)=><Pressable key={index} onPress={()=>setSelected(index)} style={styles.barCol}><View style={[styles.bar,{height:Math.max(6,Math.round(Math.abs(value)/max*(large?150:74))),backgroundColor:value>0?config.gainColor:value<0?config.lossColor:config.flatColor,borderRadius:config.borderRadius>0?Math.min(6,config.borderRadius):0}]}/>{config.xAxisVisible?<Text numberOfLines={1} style={[styles.barLabel,{color:config.textColor}]}>{view.labels[index]??index+1}</Text>:null}</Pressable>)}</View>}
      {config.tooltipEnabled&&selectedIndex!=null?<View style={[styles.tooltip,{backgroundColor:rgba(config.backgroundColor,.94),borderColor:config.borderColor}]}><Text style={[styles.tooltipText,{color:config.textColor}]}>{(view.labels[selectedIndex]??String(view.start+selectedIndex+1))+'：'+Number(local[selectedIndex]??0).toLocaleString('zh-TW')}</Text></View>:null}
      {config.dataLabels&&local.length<=8?<View style={styles.dataLabels}>{local.map((value,index)=><Text key={index} style={[styles.dataLabel,{color:config.textColor}]}>{Math.round(value).toLocaleString('zh-TW')}</Text>)}</View>:null}
      {config.locked&&zoom>1?<Text style={[styles.zoomBadge,{color:config.textColor}]}>{zoom.toFixed(1)+'×'}</Text>:null}
    </View>;
  };

  const cardStyle={
    left:effectiveX,top:effectiveY,width:config.width,height:config.height,zIndex:config.zIndex,
    backgroundColor:rgba(config.backgroundColor,config.backgroundOpacity),opacity:config.opacity,borderColor:config.borderColor,
    borderWidth:config.borderWidth,borderStyle:config.borderStyle,borderRadius:config.borderRadius,padding:config.padding,
    ...(config.shadowEnabled?{elevation:6,shadowOpacity:config.shadowOpacity,shadowRadius:10,shadowOffset:{width:0,height:3}}:{}),
  } as const;

  return <>
    <View pointerEvents={config.touchThrough?'none':'auto'} {...responder.panHandlers} style={[styles.card,cardStyle]}>
      <View style={styles.header}>
        <View style={{flex:1}}>
          <Text numberOfLines={1} style={[styles.title,{color:config.textColor,fontSize:config.titleFontSize,textAlign:config.titleAlign}]}>{config.title}</Text>
          <Text style={[styles.sub,{color:config.textColor}]}>{(styleLabel[config.style]??config.style)+(config.locked?' · 檢視手勢':' · 編輯拖移')}</Text>
        </View>
        <Pressable onPress={()=>setFullScreen(true)} style={styles.iconButton}><Text style={[styles.drag,{color:config.accentColor}]}>⛶</Text></Pressable>
        <Text style={[styles.drag,{color:config.accentColor}]}>{config.locked?'🔒':'↕'}</Text>
      </View>
      {plot(false)}
      {!config.locked?<View {...resizeResponder.panHandlers} style={[styles.resizeHandle,{borderColor:config.accentColor}]}><Text style={[styles.resizeGlyph,{color:config.accentColor}]}>↘</Text></View>:null}
    </View>
    <Modal visible={fullScreen} animationType="fade" onRequestClose={()=>setFullScreen(false)}>
      <View style={[styles.fullScreen,{backgroundColor:config.backgroundColor}]}>
        <View style={styles.fullHeader}><Text style={[styles.fullTitle,{color:config.textColor}]}>{config.title}</Text><Pressable onPress={()=>setFullScreen(false)} style={styles.fullClose}><Text style={[styles.fullCloseText,{color:config.textColor}]}>×</Text></Pressable></View>
        <View style={styles.fullPlot}>{plot(true)}</View>
        <View style={styles.fullActions}><Pressable onPress={resetZoom} style={[styles.resetButton,{borderColor:config.borderColor}]}><Text style={[styles.resetText,{color:config.accentColor}]}>重設縮放</Text></Pressable><Text style={[styles.fullHint,{color:config.textColor}]}>鎖定圖表後：兩指縮放 · 單指平移 · 雙擊重設</Text></View>
      </View>
    </Modal>
  </>;
}

const styles=StyleSheet.create({
  card:{position:'absolute',overflow:'hidden'},
  header:{flexDirection:'row',alignItems:'center',gap:8},title:{fontWeight:'900'},sub:{fontSize:8,opacity:.65,marginTop:2},drag:{fontSize:16,fontWeight:'900'},iconButton:{padding:4},
  plot:{flex:1,position:'relative',minHeight:0},grid:{position:'absolute',left:0,right:0,top:0,bottom:0,justifyContent:'space-around'},gridLine:{borderTopWidth:StyleSheet.hairlineWidth,borderStyle:'dashed'},
  sparkWrap:{flex:1,justifyContent:'center'},spark:{fontWeight:'900',letterSpacing:1},
  pieWrap:{flex:1,flexDirection:'row',alignItems:'center',gap:12},ring:{alignItems:'center',justifyContent:'center'},ringText:{fontSize:12,fontWeight:'900'},legend:{flex:1,gap:4},legendText:{fontSize:8,fontWeight:'700'},
  bars:{flex:1,flexDirection:'row',alignItems:'flex-end',gap:4,paddingTop:10},barCol:{flex:1,height:'100%',justifyContent:'flex-end',alignItems:'center'},bar:{width:'80%',minHeight:6},barLabel:{fontSize:7,marginTop:3,maxWidth:42},
  tooltip:{position:'absolute',right:4,top:4,borderWidth:1,borderRadius:8,paddingHorizontal:7,paddingVertical:5},tooltipText:{fontSize:8,fontWeight:'800'},
  dataLabels:{position:'absolute',left:0,right:0,bottom:2,flexDirection:'row',justifyContent:'space-around'},dataLabel:{fontSize:7,fontWeight:'800'},
  zoomBadge:{position:'absolute',left:4,top:4,fontSize:8,fontWeight:'900',opacity:.7},
  resizeHandle:{position:'absolute',right:2,bottom:2,width:28,height:28,borderRightWidth:2,borderBottomWidth:2,alignItems:'center',justifyContent:'center'},resizeGlyph:{fontSize:14,fontWeight:'900'},
  fullScreen:{flex:1,paddingTop:48,paddingHorizontal:16,paddingBottom:24},fullHeader:{flexDirection:'row',alignItems:'center',gap:8},fullTitle:{flex:1,fontSize:20,fontWeight:'900'},fullClose:{width:44,height:44,alignItems:'center',justifyContent:'center'},fullCloseText:{fontSize:28,fontWeight:'900'},
  fullPlot:{flex:1,minHeight:240,paddingVertical:20},fullActions:{gap:10,alignItems:'center'},resetButton:{paddingHorizontal:14,paddingVertical:9,borderRadius:18,borderWidth:1},resetText:{fontSize:11,fontWeight:'900'},fullHint:{fontSize:10,opacity:.7},
});
