import {useRef,useState} from 'react';
import {Animated,PanResponder,Pressable,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import type {HoldingQuote,HoldingWallConfig,QuoteModuleStyle} from '../domain/uiModels';
import {HoldingQuoteModule} from './HoldingQuoteModule';

/** Uses the EXISTING whole ETF card; edits are driven by the parent draft config. */
export function FloatingHoldingCardPreview({item,config,style='quote',onDismiss}:{item:HoldingQuote;config:HoldingWallConfig;style?:QuoteModuleStyle;onDismiss:()=>void}){
  const {width:screenWidth}=useWindowDimensions();
  const [width,setWidth]=useState(250);
  const [collapsed,setCollapsed]=useState(false);
  const translation=useRef(new Animated.ValueXY()).current;
  const pan=useRef(PanResponder.create({
    onStartShouldSetPanResponder:()=>false,
    onMoveShouldSetPanResponder:(_,gesture)=>Math.abs(gesture.dx)>4||Math.abs(gesture.dy)>4,
    onPanResponderMove:Animated.event([null,{dx:translation.x,dy:translation.y}],{useNativeDriver:false}),
    onPanResponderRelease:()=>translation.extractOffset(),
    onPanResponderTerminate:()=>translation.extractOffset(),
  })).current;
  const actualWidth=Math.min(width,Math.max(190,screenWidth-24));
  return <Animated.View accessibilityLabel="單張持股卡浮動預覽" style={[styles.floating,{width:actualWidth,transform:translation.getTranslateTransform()}]}>
    <View style={styles.toolbar}>
      <View {...pan.panHandlers} style={styles.dragHandle}><Text style={styles.toolbarText}>☷  單張小卡即時預覽</Text></View>
      <Pressable accessibilityLabel={collapsed?'展開預覽':'收合預覽'} onPress={()=>setCollapsed(c=>!c)} style={styles.control}><Text style={styles.controlText}>{collapsed?'＋':'－'}</Text></Pressable>
      <Pressable accessibilityLabel="關閉預覽" onPress={onDismiss} style={styles.control}><Text style={styles.controlText}>×</Text></Pressable>
    </View>
    {!collapsed?<View style={styles.body}>
      <HoldingQuoteModule item={item} wallConfig={config} style={style==='compact'?'quote':style} layout="narrow"/>
      <View style={styles.resize}>
        <Pressable accessibilityLabel="縮小預覽" onPress={()=>setWidth(w=>Math.max(200,w-25))} style={styles.control}><Text style={styles.controlText}>－</Text></Pressable>
        <Text style={styles.widthText}>{actualWidth} px · 只影響預覽</Text>
        <Pressable accessibilityLabel="放大預覽" onPress={()=>setWidth(w=>Math.min(340,w+25))} style={styles.control}><Text style={styles.controlText}>＋</Text></Pressable>
      </View>
    </View>:null}
  </Animated.View>;
}
const styles=StyleSheet.create({
  floating:{position:'absolute',top:152,right:12,zIndex:100,elevation:22,backgroundColor:'#FFFFFF',borderRadius:14,borderColor:'#93B4E6',borderWidth:1,shadowColor:'#000000',shadowOpacity:.18,shadowRadius:12,shadowOffset:{width:0,height:5}},
  toolbar:{flexDirection:'row',alignItems:'center',backgroundColor:'#EFF6FF',borderTopLeftRadius:14,borderTopRightRadius:14,paddingHorizontal:5,paddingVertical:5},
  dragHandle:{flex:1,minHeight:34,justifyContent:'center',paddingHorizontal:5},
  toolbarText:{fontSize:10,fontWeight:'900',color:'#1553BA'},
  body:{padding:5,gap:6},
  control:{minWidth:30,minHeight:30,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:'#E5EDFA',marginHorizontal:2},
  controlText:{fontSize:16,color:'#1553BA',fontWeight:'900'},
  resize:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  widthText:{fontSize:9,color:'#64748B'},
});
