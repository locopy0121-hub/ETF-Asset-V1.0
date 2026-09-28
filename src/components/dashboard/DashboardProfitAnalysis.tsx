import {StyleSheet,View} from 'react-native';
import type {DashboardLayoutConfig} from '../../domain/dashboardLayout';
import {MetricTile} from '../MetricTile';

export type DashboardKpi=Readonly<{
  key:string;label:string;value:string;caption:string;tone?:'gain'|'loss';
  glyph:string;
}>;

export function DashboardProfitAnalysis({items,layout}:{items:readonly DashboardKpi[];layout:DashboardLayoutConfig['profitAnalysis']}){
  return <View style={[styles.grid,{gap:layout.cardGap}]}>
    {items.slice(0,4).map(item=><View key={item.key} style={[styles.cell,{minHeight:layout.cardHeight}]}>
      <MetricTile
        label={(layout.iconVisible?item.glyph+' ':'')+item.label}
        value={item.value}
        {...(layout.captionVisible?{caption:item.caption}:{})}
        {...(item.tone?{tone:item.tone}:{})}
      />
    </View>)}
  </View>;
}

const styles=StyleSheet.create({
  grid:{flexDirection:'row',flexWrap:'wrap',alignItems:'stretch'},
  cell:{flexGrow:1,flexShrink:0,flexBasis:'46%',minWidth:136,maxWidth:'100%'},
});
