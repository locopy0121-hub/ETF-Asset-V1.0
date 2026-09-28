import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {DashboardLayoutConfig} from '../../domain/dashboardLayout';
import {colors,radius} from '../../theme/tokens';

export type DashboardQuickAction=Readonly<{key:string;label:string;glyph:string;onPress:()=>void}>;

export function DashboardQuickActions({actions,layout}:{actions:readonly DashboardQuickAction[];layout:DashboardLayoutConfig['quickActions']}){
  const basis=layout.columns===2?'46%':'21%';
  return <View style={styles.grid}>
    {actions.slice(0,4).map(action=><Pressable key={action.key} accessibilityRole="button" accessibilityLabel={action.label}
      onPress={action.onPress} style={({pressed})=>[styles.action,{flexBasis:basis},pressed&&styles.pressed]}>
      <Text style={[styles.glyph,{fontSize:layout.iconSize}]}>{action.glyph}</Text>
      {layout.titleVisible?<Text numberOfLines={1} style={styles.label}>{action.label}</Text>:null}
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
