import {useEffect,useRef} from 'react';
import {Animated,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {DEFAULT_ETF_BADGES,type EtfBadgeConfig} from '../domain/etfBadges';
import {DEFAULT_PORTFOLIO_LIST,portfolioColumnValue,type PortfolioColumnConfig,type PortfolioListConfig} from '../domain/portfolioList';
import type {HoldingQuote} from '../domain/uiModels';
import {colors,radius} from '../theme/tokens';
import {EtfBadgeRow} from './EtfBadgeRow';

/** Fixed identity column, independently scrollable user-configured snapshot columns. */
export function PortfolioHoldingTable({rows,onOpenHolding,config=DEFAULT_PORTFOLIO_LIST,badges=DEFAULT_ETF_BADGES,refreshToken}:{
  rows:readonly HoldingQuote[];onOpenHolding?:(row:HoldingQuote)=>void;
  config?:PortfolioListConfig;badges?:EtfBadgeConfig;refreshToken?:string|number|null|undefined;
}){
  const columns=config.columns.filter(column=>column.enabled);
  const onOpen=(row:HoldingQuote)=>()=>onOpenHolding?.(row);
  return <View style={styles.tableOuter}>
    <View style={styles.split}>
      <View style={[styles.fixedColumn,{width:config.fixedWidth}]}>
        <View style={[styles.header,{height:38}]}><Text style={styles.headerText}>ETF 代號｜名稱</Text></View>
        {rows.map(row=><Pressable key={row.symbol} accessibilityRole="button" accessibilityLabel={'查看持股 '+row.symbol}
          onPress={onOpen(row)} style={[styles.fixedRow,{height:config.rowHeight}]}>
          <View style={styles.identity}>
            <Text numberOfLines={1} style={styles.symbol}>{row.symbol}{row.pinned?' • PIN':''}</Text>
            <EtfBadgeRow etfType={row.etfType} dividendType={row.dividendType} reminder={row.reminderEvent} config={badges} narrow refreshToken={refreshToken}/>
          </View>
          {config.showName?<Text numberOfLines={1} style={styles.name}>{row.name}</Text>:null}
        </Pressable>)}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.scroll}>
        <View>
          <View style={[styles.rightHeader,{height:38}]}>
            {columns.map(field=><View key={field.key} style={{width:field.width,paddingHorizontal:2,backgroundColor:field.backgroundColor??'transparent'}}>
              <Text numberOfLines={1} style={[styles.headerText,{textAlign:field.align,color:field.textColor??colors.textSecondary}]}>{field.label}</Text>
            </View>)}
          </View>
          {rows.map(row=><Pressable key={row.symbol} onPress={onOpen(row)} style={[styles.rightRow,{height:config.rowHeight}]}>
            {columns.map(field=><PortfolioNumberCell key={field.key} row={row} config={field} refreshToken={refreshToken}/>)}
          </Pressable>)}
        </View>
      </ScrollView>
    </View>
    <Text style={styles.hint}>第一欄固定；數值欄可水平滑動及自訂顯示。純均價與含費均價獨立顯示，不重新計算帳務。</Text>
  </View>;
}
function PortfolioNumberCell({row,config,refreshToken}:{row:HoldingQuote;config:PortfolioColumnConfig;refreshToken?:string|number|null|undefined}){
  const shown=portfolioColumnValue(row,config.key),effect=config.effect;
  const opacity=useRef(new Animated.Value(1)).current;
  const shift=useRef(new Animated.Value(0)).current;
  const active=effect.trigger==='always'||effect.trigger==='refresh'||effect.trigger==='change'||
    (effect.trigger==='gain'&&shown.numeric>0)||(effect.trigger==='loss'&&shown.numeric<0);
  useEffect(()=>{
    opacity.stopAnimation();shift.stopAnimation();opacity.setValue(1);shift.setValue(0);
    if(effect.kind==='none'||!active)return;
    const duration=effect.speed==='slow'?1100:effect.speed==='fast'?350:650;
    const low=effect.intensity==='soft'?.85:effect.intensity==='strong'?.4:.6;
    let action:Animated.CompositeAnimation;
    if(effect.kind==='bounce'){
      action=Animated.sequence([
        Animated.timing(shift,{toValue:-4,duration:duration/2,useNativeDriver:true}),
        Animated.timing(shift,{toValue:0,duration:duration/2,useNativeDriver:true}),
      ]);
    }else{
      if(effect.kind==='fade')opacity.setValue(low);
      action=effect.kind==='fade'
        ?Animated.timing(opacity,{toValue:1,duration,useNativeDriver:true})
        :Animated.sequence([
          Animated.timing(opacity,{toValue:low,duration:duration/2,useNativeDriver:true}),
          Animated.timing(opacity,{toValue:1,duration:duration/2,useNativeDriver:true}),
        ]);
    }
    const runner=effect.trigger==='always'?Animated.loop(action):action;
    runner.start();return()=>runner.stop();
  },[opacity,shift,effect.kind,effect.trigger,effect.speed,effect.intensity,shown.numeric,refreshToken,active]);
  const color=config.textColor??(shown.tone==='gain'?colors.gain:shown.tone==='loss'?colors.loss:shown.tone==='flat'?colors.flat:colors.text);
  return <View style={{width:config.width,justifyContent:'center',paddingHorizontal:2,backgroundColor:config.backgroundColor??'transparent'}}>
    <Animated.Text numberOfLines={1} adjustsFontSizeToFit style={[styles.value,{fontSize:11*config.fontScale,color,textAlign:config.align,opacity,transform:[{translateY:shift}]}]}>{shown.value}</Animated.Text>
  </View>;
}
const styles=StyleSheet.create({
  tableOuter:{gap:8},split:{flexDirection:'row',borderWidth:1,borderColor:colors.border,borderRadius:radius.md,overflow:'hidden'},
  fixedColumn:{backgroundColor:colors.surface,zIndex:2,borderRightWidth:1,borderRightColor:colors.border},
  header:{justifyContent:'center',paddingHorizontal:8,backgroundColor:colors.surfaceMuted},
  fixedRow:{justifyContent:'center',paddingHorizontal:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border,gap:4},
  identity:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:2,minWidth:0},
  symbol:{fontSize:12,fontWeight:'900',color:colors.text,flexShrink:0},
  name:{fontSize:10,color:colors.textSecondary},
  scroll:{minWidth:140},rightHeader:{flexDirection:'row',alignItems:'center',paddingHorizontal:6,backgroundColor:colors.surfaceMuted},
  rightRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:6,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  headerText:{fontSize:10,fontWeight:'900',color:colors.textSecondary},
  value:{fontSize:11,fontWeight:'800',fontVariant:['tabular-nums']},
  hint:{fontSize:10,lineHeight:16,color:colors.textSecondary},
});
