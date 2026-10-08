import {useSystemColors} from '../../theme/useSystemColors';
import {Pressable,StyleSheet,View} from 'react-native';
import type {DashboardLayoutConfig} from '../../domain/dashboardLayout';
import type {FrameMaintenanceContext} from '../../maintenance/inspectionModel';
import {colors,radius} from '../../theme/tokens';
import {DashboardEditableText} from './DashboardEditableContent';

export type DashboardProfitRow=Readonly<{
  key:string;label:string;value:string;tone?:'gain'|'loss'|'neutral';
}>;

export function DashboardProfitDetail({rows,layout,onMore,maintenance}:{
  rows:readonly DashboardProfitRow[];layout:DashboardLayoutConfig['profitDetail'];onMore?:()=>void;maintenance?:FrameMaintenanceContext;
}){
  const colors=useSystemColors();
  const byKey=new Map(rows.map(row=>[row.key,row]));
  const ordered=layout.order.map(key=>byKey.get(key)).filter((row):row is DashboardProfitRow=>Boolean(row));
  const shown=ordered.slice(0,layout.itemCount);
  return <View style={styles.root}>
    {shown.map((row,index)=><View key={row.key}
      style={[styles.row,{minHeight:layout.rowHeight,paddingHorizontal:layout.rowPaddingHorizontal,gap:layout.rowGap},index>0&&styles.rowBorder]}>
      <DashboardEditableText tone={row.tone??'neutral'} id={'detail-label-'+row.key} label={row.label+' 標題'} frame={maintenance}
        numberOfLines={1} style={[styles.label,{fontSize:layout.labelFontSize,color:layout.labelColor,textAlign:layout.align}]}>{row.label}</DashboardEditableText>
      <DashboardEditableText id={'detail-value-'+row.key} label={row.label+' 數值'} frame={maintenance} kind="value"
        tone={row.tone??'neutral'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}
        style={[styles.value,{fontSize:layout.valueFontSize,textAlign:layout.align,
          color:row.tone==='gain'?colors.gain:row.tone==='loss'?colors.loss:row.tone==='neutral'?colors.flat:layout.valueColor}]}>{row.value}</DashboardEditableText>
    </View>)}
    {layout.showMore?<Pressable accessibilityRole="button" onPress={onMore} disabled={!onMore} style={styles.more}>
      <DashboardEditableText id="detail-more" label="查看更多" frame={maintenance} style={styles.moreText}>查看更多 ›</DashboardEditableText>
    </Pressable>:null}
  </View>;
}

const styles=StyleSheet.create({
  root:{overflow:'hidden',borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  row:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:12},
  rowBorder:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  label:{flex:1,fontSize:12,fontWeight:'700',color:colors.textSecondary},
  value:{maxWidth:'48%',fontSize:14,fontWeight:'900',fontVariant:['tabular-nums'],color:colors.text},
  more:{alignItems:'center',justifyContent:'center',minHeight:40,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  moreText:{fontSize:11,fontWeight:'900',color:colors.primary},
});
