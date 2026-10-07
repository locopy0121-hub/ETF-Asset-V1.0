import {useSystemColors} from '../theme/useSystemColors';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {HoldingQuote} from '../domain/uiModels';
import {colors,radius} from '../theme/tokens';

/** Independent simple-list renderer, shared by the first shortcut and automatic table fallback. */
export function PortfolioSafeList({rows,onOpenHolding}:{
  rows:readonly HoldingQuote[];onOpenHolding:(row:HoldingQuote)=>void;
}){
  const colors=useSystemColors();
  return <View style={styles.root}>
    {rows.length===0?<Text style={styles.empty}>目前沒有持股</Text>:rows.map(row=>{
      const hasQuote=row.quoteVerified!==false&&Number.isFinite(row.price);
      const pnl=hasQuote&&Number.isFinite(row.pnl)?row.pnl:null;
      return <Pressable key={row.symbol} accessibilityRole="button"
        accessibilityLabel={'查看 '+row.symbol} onPress={()=>onOpenHolding(row)} style={styles.item}>
        <View style={styles.identity}>
          <Text style={styles.symbol}>{row.symbol}</Text>
          <Text numberOfLines={1} style={styles.name}>{row.name}</Text>
        </View>
        <View style={styles.numbers}>
          <Text style={styles.price}>{hasQuote?row.price.toFixed(2):'行情待取得'}</Text>
          <Text style={[styles.pnl,pnl!==null&&{color:pnl>0?colors.gain:pnl<0?colors.loss:colors.flat}]}>
            {pnl===null?'損益待核對':'損益 NT$ '+Math.round(pnl).toLocaleString('zh-TW')}
          </Text>
        </View>
      </Pressable>;
    })}
  </View>;
}
const styles=StyleSheet.create({
  root:{gap:9},hint:{fontSize:11,lineHeight:17,color:colors.textSecondary},
  empty:{fontSize:12,color:colors.textSecondary,padding:14},
  item:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,
    backgroundColor:colors.surface,padding:12,gap:8,minHeight:68},
  identity:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
  symbol:{fontSize:13,fontWeight:'900',color:colors.text},
  name:{fontSize:11,color:colors.textSecondary,flexShrink:1},
  numbers:{flexDirection:'row',justifyContent:'space-between',gap:12,alignItems:'center'},
  price:{fontSize:12,fontWeight:'800',color:colors.text},
  pnl:{fontSize:11,fontWeight:'800',color:colors.textSecondary},
});
