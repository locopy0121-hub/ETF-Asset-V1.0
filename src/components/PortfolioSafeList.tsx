import {useSystemColors} from '../theme/useSystemColors';
import {StyleSheet,View} from 'react-native';
import {Pressable,Text} from './EditableNative';
import type {HoldingQuote} from '../domain/uiModels';
import {colors,radius} from '../theme/tokens';

/** Independent simple-list renderer, shared by the first shortcut and automatic table fallback. */
export function PortfolioSafeList({rows,onOpenHolding}:{
  rows:readonly HoldingQuote[];onOpenHolding:(row:HoldingQuote)=>void;
}){
  const colors=useSystemColors();
  return <View style={styles.root}>
    {rows.length===0?<Text editorId="native:PortfolioSafeList:empty:1" editorReadOnly={false} style={styles.empty}>目前沒有持股</Text>:rows.map(row=>{
      const hasQuote=row.quoteVerified!==false&&Number.isFinite(row.price);
      const pnl=hasQuote&&Number.isFinite(row.pnl)?row.pnl:null;
      return <Pressable editorId="native:PortfolioSafeList:item:2" key={row.symbol} accessibilityRole="button"
        accessibilityLabel={'查看 '+row.symbol} onPress={()=>onOpenHolding(row)} style={styles.item}>
        <View style={styles.identity}>
          <Text editorId="native:PortfolioSafeList:symbol:3" editorReadOnly={true} style={styles.symbol}>{row.symbol}</Text>
          <Text editorId="native:PortfolioSafeList:name:4" editorReadOnly={true} numberOfLines={1} style={styles.name}>{row.name}</Text>
        </View>
        <View style={styles.numbers}>
          <Text editorId="native:PortfolioSafeList:price:5" editorReadOnly={true} style={styles.price}>{hasQuote?row.price.toFixed(2):'行情待取得'}</Text>
          <Text editorId="native:PortfolioSafeList:pnl:6" editorReadOnly={true} style={[styles.pnl,pnl!==null&&{color:pnl>0?colors.gain:pnl<0?colors.loss:colors.flat}]}>
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
