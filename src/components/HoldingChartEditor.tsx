import {Pressable,StyleSheet,Switch,Text,View} from 'react-native';
import {HOLDING_CHART_DATA_OPTIONS,HOLDING_CHART_RANGES,MARKET_CHART_DATA_OPTIONS,NATIVE_CHART_STYLES,type ChartDataKey,type HoldingChartConfig} from '../domain/chartEditor';
import {colors,radius} from '../theme/tokens';

export function HoldingChartEditor({value,onChange}:{value:HoldingChartConfig;onChange:(next:HoldingChartConfig)=>void}){
  const toggle=(key:ChartDataKey)=>{
    const selected=value.dataKeys.includes(key);
    const dataKeys=selected
      ?(value.dataKeys.length===1?value.dataKeys:value.dataKeys.filter(item=>item!==key))
      :[...value.dataKeys,key];
    onChange({...value,dataKeys});
  };
  return <View style={styles.root}>
    <Text style={styles.hint}>首頁與庫存只顯示 Mini 圖表；完整 K 線／分析工具集中在獨立圖表頁。圖表只讀取資料，不改寫帳務核心或行情原值。</Text>
    <Text style={styles.title}>圖表樣式</Text>
    <View style={styles.wrap}>{NATIVE_CHART_STYLES.map(item=><Chip key={item.id} label={item.label} active={value.style===item.id} onPress={()=>onChange({...value,style:item.id})}/>)}</View>
    <Text style={styles.title}>歷史區間</Text>
    <View style={styles.wrap}>{HOLDING_CHART_RANGES.map(range=><Chip key={range} label={range} active={value.range===range} onPress={()=>onChange({...value,range})}/>)}</View>
    <Text style={styles.title}>資料來源</Text>
    <View style={styles.sourceGroup}>
      <Text style={styles.sourceTitle}>市場數據</Text>
      <View style={styles.wrap}>{MARKET_CHART_DATA_OPTIONS.map(item=><Chip key={item.key} label={item.label} active={value.dataKeys.includes(item.key)} onPress={()=>toggle(item.key)}/>)}</View>
    </View>
    <View style={styles.sourceGroup}>
      <Text style={styles.sourceTitle}>持股相關數據</Text>
      <View style={styles.wrap}>{HOLDING_CHART_DATA_OPTIONS.map(item=><Chip key={item.key} label={item.label} active={value.dataKeys.includes(item.key)} onPress={()=>toggle(item.key)}/>)}</View>
    </View>
    <View style={styles.row}><Text style={styles.label}>預設十字線</Text><Switch value={value.crosshairEnabled} onValueChange={crosshairEnabled=>onChange({...value,crosshairEnabled})} trackColor={{true:colors.primary}}/></View>
    <View style={styles.row}><Text style={styles.label}>持股成本線</Text><Switch value={value.costLineEnabled} onValueChange={costLineEnabled=>onChange({...value,costLineEnabled})} trackColor={{true:colors.primary}}/></View>
    <Text style={styles.hint}>持股損益／含息損益的歷史視圖以目前持股數與含費成本均價套入歷史收盤價估值；當前正式損益仍以 Canonical 帳務核心為準。</Text>
  </View>;
}
function Chip({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress} style={[styles.chip,active&&styles.chipOn]}>
    <Text style={[styles.chipText,active&&styles.chipTextOn]}>{label}</Text>
  </Pressable>;
}
const styles=StyleSheet.create({
  root:{gap:8,marginTop:8},title:{fontSize:11,fontWeight:'900',color:colors.textSecondary},
  hint:{fontSize:10,lineHeight:16,color:colors.textSecondary},wrap:{flexDirection:'row',flexWrap:'wrap',gap:6},
  sourceGroup:{gap:6,padding:9,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  sourceTitle:{fontSize:10,fontWeight:'900',color:colors.text},
  chip:{paddingHorizontal:9,paddingVertical:7,borderRadius:radius.pill,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  chipOn:{backgroundColor:colors.primary,borderColor:colors.primary},chipText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  chipTextOn:{color:'#FFFFFF'},row:{minHeight:42,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  label:{fontSize:11,fontWeight:'800',color:colors.text},
});
