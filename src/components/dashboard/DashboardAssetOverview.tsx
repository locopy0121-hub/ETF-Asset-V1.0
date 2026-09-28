import {StyleSheet,Text,View} from 'react-native';
import type {DashboardLayoutConfig} from '../../domain/dashboardLayout';
import {colors,radius} from '../../theme/tokens';

export function DashboardAssetOverview({amount,caption,complete=true,layout}:{
  amount:string;caption:string;complete?:boolean;layout:DashboardLayoutConfig['overview'];
}){
  return <View style={[styles.root,{minHeight:layout.minHeight,padding:layout.padding}]}>
    <View style={styles.content}>
      <Text style={styles.label}>總資產（持股市值）</Text>
      {complete?<View style={styles.moneyShell}>
        <View style={styles.moneyRow} accessible accessibilityLabel={'目前持股總市值 NT$ '+amount}>
          {layout.prefixVisible?<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.prefix}>NT$</Text>:null}
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.42} style={styles.value}>{amount}</Text>
        </View>
      </View>:<Text style={styles.pending}>估值待核對</Text>}
      {layout.captionVisible?<Text numberOfLines={2} style={styles.caption}>{caption}</Text>:null}
    </View>
    {layout.decorationVisible?<View pointerEvents="none" style={styles.decoration}>
      <View style={[styles.bar,{height:22}]}/><View style={[styles.bar,{height:35}]}/><View style={[styles.bar,{height:50}]}/><View style={[styles.bar,{height:64}]}/>
    </View>:null}
  </View>;
}

const styles=StyleSheet.create({
  root:{position:'relative',overflow:'hidden',borderRadius:radius.lg,backgroundColor:colors.surfaceMuted,justifyContent:'center'},
  content:{minWidth:0,zIndex:2,paddingRight:54},
  label:{fontSize:12,fontWeight:'900',color:colors.textSecondary,marginBottom:4},
  moneyShell:{width:'100%',minWidth:0,overflow:'hidden'},
  moneyRow:{flexDirection:'row',alignItems:'flex-end',width:'100%',minWidth:0,overflow:'hidden'},
  prefix:{fontSize:18,lineHeight:42,fontWeight:'900',color:colors.primary,marginRight:8,flexShrink:1,maxWidth:'30%'},
  value:{fontSize:42,lineHeight:46,fontWeight:'900',fontVariant:['tabular-nums'],color:colors.text,flex:1,minWidth:0,flexShrink:1},
  pending:{fontSize:24,lineHeight:34,fontWeight:'900',color:colors.text},
  caption:{fontSize:11,lineHeight:16,color:colors.textSecondary,marginTop:3},
  decoration:{position:'absolute',right:12,bottom:10,height:72,width:60,flexDirection:'row',alignItems:'flex-end',gap:4,opacity:.16},
  bar:{flex:1,borderRadius:4,backgroundColor:colors.primary},
});
