import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {DashboardLayoutConfig} from '../../domain/dashboardLayout';
import {colors,radius} from '../../theme/tokens';

export type DashboardProfitRow=Readonly<{
  key:string;label:string;value:string;tone?:'gain'|'loss'|'neutral';
}>;

export function DashboardProfitDetail({rows,layout,onMore}:{rows:readonly DashboardProfitRow[];layout:DashboardLayoutConfig['profitDetail'];onMore?:()=>void}){
  const shown=rows.slice(0,layout.itemCount);
  return <View style={styles.root}>
    {shown.map((row,index)=><View key={row.key} style={[styles.row,{minHeight:layout.rowHeight},index>0&&styles.rowBorder]}>
      <Text numberOfLines={1} style={styles.label}>{row.label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}
        style={[styles.value,row.tone==='gain'?styles.gain:row.tone==='loss'?styles.loss:null]}>{row.value}</Text>
    </View>)}
    {layout.showMore?<Pressable accessibilityRole="button" onPress={onMore} disabled={!onMore} style={styles.more}>
      <Text style={styles.moreText}>查看更多 ›</Text>
    </Pressable>:null}
  </View>;
}

const styles=StyleSheet.create({
  root:{overflow:'hidden',borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  row:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:12},
  rowBorder:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  label:{flex:1,fontSize:12,fontWeight:'700',color:colors.textSecondary},
  value:{maxWidth:'48%',fontSize:14,fontWeight:'900',fontVariant:['tabular-nums'],color:colors.text},
  gain:{color:colors.gain},loss:{color:colors.loss},
  more:{alignItems:'center',justifyContent:'center',minHeight:40,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  moreText:{fontSize:11,fontWeight:'900',color:colors.primary},
});
