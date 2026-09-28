import {StyleSheet,Text,View} from 'react-native';
import type {DashboardLayoutConfig} from '../../domain/dashboardLayout';
import {colors,radius} from '../../theme/tokens';

export function DashboardLayoutPreview({layout}:{layout:DashboardLayoutConfig}){
  return <View style={[styles.preview,{gap:Math.max(4,Math.min(12,layout.sectionGap/2))}]}>
    <View style={[styles.overview,{minHeight:Math.max(72,layout.overview.minHeight*.55),padding:Math.max(8,layout.overview.padding*.55)}]}>
      <Text style={styles.small}>資產總覽</Text>
      <View style={styles.money}><Text style={styles.prefix}>{layout.overview.prefixVisible?'NT$ ':''}</Text><Text style={styles.amount}>102,035</Text></View>
      {layout.overview.captionVisible?<Text style={styles.caption}>持股市值＋股數</Text>:null}
    </View>
    <View style={[styles.kpiGrid,{gap:Math.max(4,layout.profitAnalysis.cardGap*.5)}]}>
      {['已實現 25','含息 67,814','未實現 67,681','市值 102,035'].map(text=><View key={text} style={[styles.kpi,{minHeight:Math.max(44,layout.profitAnalysis.cardHeight*.48)}]}><Text numberOfLines={1} style={styles.kpiText}>{text}</Text></View>)}
    </View>
    <View style={styles.detail}>
      <Text style={styles.small}>損益明細</Text>
      {Array.from({length:layout.profitDetail.itemCount}).map((_,index)=><View key={index} style={[styles.detailRow,{minHeight:Math.max(22,layout.profitDetail.rowHeight*.5)}]}><View style={styles.line}/><View style={[styles.line,{width:'28%'}]}/></View>)}
    </View>
    <View style={styles.actions}>{Array.from({length:layout.quickActions.columns}).map((_,index)=><View key={index} style={styles.action}/>)}</View>
  </View>;
}

const styles=StyleSheet.create({
  preview:{borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:10,backgroundColor:colors.background},
  overview:{borderRadius:radius.md,backgroundColor:colors.surfaceMuted,justifyContent:'center'},
  small:{fontSize:9,fontWeight:'900',color:colors.textSecondary},
  money:{flexDirection:'row',alignItems:'flex-end',minWidth:0},
  prefix:{fontSize:10,fontWeight:'900',color:colors.primary},
  amount:{fontSize:22,lineHeight:25,fontWeight:'900',color:colors.text},
  caption:{fontSize:8,color:colors.textSecondary},
  kpiGrid:{flexDirection:'row',flexWrap:'wrap'},
  kpi:{flexBasis:'47%',flexGrow:1,borderRadius:radius.sm,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center',padding:4},
  kpiText:{fontSize:8,fontWeight:'800',color:colors.text},
  detail:{borderRadius:radius.md,backgroundColor:colors.surface,padding:8,borderWidth:1,borderColor:colors.border},
  detailRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  line:{height:5,borderRadius:3,width:'48%',backgroundColor:colors.surfaceMuted},
  actions:{flexDirection:'row',gap:5},
  action:{flex:1,height:32,borderRadius:radius.sm,backgroundColor:colors.surfaceMuted},
});
