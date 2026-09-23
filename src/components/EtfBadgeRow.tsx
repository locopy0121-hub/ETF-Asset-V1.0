import {useEffect,useRef} from 'react';
import {Animated,StyleSheet,Text,View} from 'react-native';
import {badgeDisplayText,etfReminderLabel,type EtfBadgeConfig,type EtfBadgeKey,type EtfBadgeStyle,type EtfReminderType} from '../domain/etfBadges';

/** Shared presentation for home cards and portfolio list. Code is rendered separately at left. */
export function EtfBadgeRow({etfType,dividendType,reminder,config,narrow=false,refreshToken}:{
  etfType?:string|null|undefined;dividendType?:string|null|undefined;reminder?:EtfReminderType|null|undefined;
  config:EtfBadgeConfig;narrow?:boolean;refreshToken?:string|number|null|undefined;
}){
  const badges=config.order.filter(key=>config.badges[key].enabled&&(
    key!=='reminder'||(reminder!=null&&config.reminderEvents.includes(reminder))
  ));
  return <View style={[styles.row,narrow&&styles.narrowRow,{gap:narrow?2:4}]}>
    {badges.map(key=>{
      const configItem=config.badges[key];
      const sourceText=badgeDisplayText(key,etfType,dividendType,reminder);
      const text=configItem.customText||(sourceText==='待確認'?(key==='etfType'?'類別待確認':'配息待確認'):sourceText);
      return <EtfBadge key={key} badgeKey={key} title={text} description={key==='reminder'&&reminder?etfReminderLabel(reminder):text} styleConfig={configItem} narrow={narrow} refreshToken={refreshToken}/>;
    })}
  </View>;
}
function EtfBadge({badgeKey,title,description,styleConfig,narrow,refreshToken}:{
  badgeKey:EtfBadgeKey;title:string;description:string;styleConfig:EtfBadgeStyle;narrow:boolean;refreshToken?:string|number|null|undefined;
}){
  const opacity=useRef(new Animated.Value(1)).current;
  const shift=useRef(new Animated.Value(0)).current;
  const effect=styleConfig.effect;
  useEffect(()=>{
    opacity.stopAnimation();shift.stopAnimation();opacity.setValue(1);shift.setValue(0);
    if(effect.kind==='none')return;
    if((effect.trigger==='gain'||effect.trigger==='loss')|| (effect.trigger==='alert'&&badgeKey!=='reminder'))return;
    const duration=effect.speed==='slow'?1200:effect.speed==='fast'?350:700;
    const low=effect.intensity==='soft'?.8:effect.intensity==='strong'?.35:.55;
    let action:Animated.CompositeAnimation;
    if(effect.kind==='bounce'){
      action=Animated.sequence([
        Animated.timing(shift,{toValue:-4,duration:duration/2,useNativeDriver:true}),
        Animated.timing(shift,{toValue:0,duration:duration/2,useNativeDriver:true}),
      ]);
    }else if(effect.kind==='fade'){
      opacity.setValue(low);
      action=Animated.timing(opacity,{toValue:1,duration,useNativeDriver:true});
    }else{
      action=Animated.sequence([
        Animated.timing(opacity,{toValue:low,duration:duration/2,useNativeDriver:true}),
        Animated.timing(opacity,{toValue:1,duration:duration/2,useNativeDriver:true}),
      ]);
    }
    const runner=(effect.trigger==='always'||effect.trigger==='alert')?Animated.loop(action):action;
    runner.start();
    return ()=>runner.stop();
  },[opacity,shift,effect.kind,effect.trigger,effect.speed,effect.intensity,refreshToken,title,badgeKey]);
  return <Animated.View accessible accessibilityLabel={badgeKey==='reminder'?'提醒：'+description:description}
    style={{maxWidth:narrow?45:88,flexShrink:1,backgroundColor:styleConfig.backgroundColor,borderColor:styleConfig.borderColor,
      borderWidth:styleConfig.borderWidth,borderRadius:styleConfig.borderRadius,paddingHorizontal:styleConfig.paddingX,
      paddingVertical:styleConfig.paddingY,opacity:Animated.multiply(opacity,styleConfig.opacity),transform:[{translateY:shift}]}}>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{fontSize:(narrow?8:10)*styleConfig.fontScale,fontWeight:'800',color:styleConfig.textColor,textAlign:'center'}}>{title}</Text>
  </Animated.View>;
}
const styles=StyleSheet.create({
  row:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',flexShrink:1,minWidth:0},
  narrowRow:{flex:1,flexWrap:'wrap',alignContent:'center'},
});
