import {StyleSheet,View} from 'react-native';
import type {DashboardLayoutConfig} from '../../domain/dashboardLayout';
import type {FrameMaintenanceContext,TargetOverride} from '../../maintenance/inspectionModel';
import {DashboardEditableMetric} from './DashboardEditableContent';

export type DashboardKpi=Readonly<{
  key:string;label:string;value:string;caption:string;tone?:'gain'|'loss';
  glyph:string;
}>;

export function DashboardProfitAnalysis({items,layout,maintenance}:{
  items:readonly DashboardKpi[];layout:DashboardLayoutConfig['profitAnalysis'];maintenance?:FrameMaintenanceContext;
}){
  const byKey=new Map(items.map(item=>[item.key,item]));
  const ordered=layout.order.map(key=>byKey.get(key)).filter((item):item is DashboardKpi=>Boolean(item));
  const pageStyle:TargetOverride={
    padding:layout.cardPadding,align:layout.align,
    labelFontSize:layout.labelFontSize,fontSize:layout.valueFontSize,captionFontSize:layout.captionFontSize,
    labelColor:layout.labelColor,textColor:layout.valueColor,captionColor:layout.captionColor,
  };
  return <View style={[styles.grid,{gap:layout.cardGap}]}>
    {ordered.slice(0,4).map(item=><View key={item.key} style={[styles.cell,{minHeight:layout.cardHeight}]}>
      <DashboardEditableMetric id={'kpi-'+item.key} frame={maintenance}
        label={(layout.iconVisible?item.glyph+' ':'')+item.label}
        value={item.value}
        {...(layout.captionVisible?{caption:item.caption}:{})}
        {...(item.tone?{tone:item.tone}:{})}
        pageStyle={pageStyle}
      />
    </View>)}
  </View>;
}

const styles=StyleSheet.create({
  grid:{flexDirection:'row',flexWrap:'wrap',alignItems:'stretch'},
  cell:{flexGrow:1,flexShrink:0,flexBasis:'46%',minWidth:136,maxWidth:'100%'},
});
