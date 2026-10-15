import {Pressable,StyleSheet,View} from 'react-native';
import type {DashboardLayoutConfig} from '../../domain/dashboardLayout';
import type {FrameMaintenanceContext} from '../../maintenance/inspectionModel';
import {colors,radius} from '../../theme/tokens';
import {DashboardEditableText} from './DashboardEditableContent';

export type DashboardQuickAction=Readonly<{key:string;label:string;glyph:string;onPress:()=>void}>;

export function DashboardQuickActions({actions,layout,maintenance}:{
  actions:readonly DashboardQuickAction[];layout:DashboardLayoutConfig['quickActions'];maintenance?:FrameMaintenanceContext;
}){
  const basis=layout.columns===2?'46%':'21%';
  const byKey=new Map(actions.map(action=>[action.key,action]));
  const ordered=layout.order.map(key=>byKey.get(key)).filter((action):action is DashboardQuickAction=>Boolean(action));
  const alignItems=layout.align==='left'?'flex-start':layout.align==='right'?'flex-end':'center';
  return <View style={styles.grid}>
    {ordered.slice(0,4).map(action=><Pressable key={action.key} accessibilityRole="button" accessibilityLabel={action.label}
      onPress={action.onPress} style={({pressed})=>[styles.action,{flexBasis:basis,padding:layout.itemPadding,gap:layout.itemGap,alignItems},pressed&&styles.pressed]}>
      <DashboardEditableText id={'quick-icon-'+action.key} label={action.label+' 圖示'} frame={maintenance}
        style={[styles.glyph,{fontSize:layout.iconSize,color:layout.iconColor,textAlign:layout.align}]}>{action.glyph}</DashboardEditableText>
      {layout.titleVisible?<DashboardEditableText id={'quick-label-'+action.key} label={action.label+' 名稱'} frame={maintenance}
        numberOfLines={1} style={[styles.label,{fontSize:layout.labelFontSize,color:layout.labelColor,textAlign:layout.align}]}>{action.label}</DashboardEditableText>:null}
    </Pressable>)}
  </View>;
}

const styles=StyleSheet.create({
  grid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  action:{flexGrow:1,minWidth:72,minHeight:68,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center',paddingHorizontal:8,paddingVertical:10,gap:5},
  glyph:{fontWeight:'900',color:colors.primary},
  label:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  pressed:{opacity:.62},
});
