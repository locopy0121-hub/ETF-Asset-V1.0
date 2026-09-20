import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HoldingQuote, QuoteModuleStyle } from '../domain/uiModels';
import { colors, radius, spacing } from '../theme/tokens';

const money=(value:number)=>Math.round(value).toLocaleString('zh-TW');
const pct=(value:number)=>`${value>=0?'+':''}${value.toFixed(2)}%`;

export function HoldingQuoteModule({item,style='quote',onPress}:{item:HoldingQuote;style?:QuoteModuleStyle;onPress?:()=>void}){
  const change=item.price-item.previousClose;
  const changePct=item.previousClose>0?(change/item.previousClose)*100:0;
  const marketTone=change>0?colors.gain:change<0?colors.loss:colors.flat;
  const pnlTone=item.pnl>=0?colors.gain:colors.loss;
  const compact=style==='compact';
  const showChart=style==='chart'||style==='advanced';
  return <Pressable onPress={onPress} style={[styles.card,compact&&styles.compact]}>
    {showChart?<Sparkline values={item.sparkline} positive={change>=0}/>:null}
    <View style={styles.body}>
      <View style={styles.head}>
        <View style={styles.nameWrap}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.symbol}>{item.symbol}{item.pinned?'  • PIN':''}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
      <View style={styles.quoteRow}>
        <Text style={[styles.price,{color:marketTone}]}>{item.price.toFixed(2)}</Text>
        <View style={styles.changeWrap}>
          <Text style={[styles.change,{color:marketTone}]}>{change>=0?'▲':'▼'} {change>=0?'+':''}{change.toFixed(2)}</Text>
          <Text style={[styles.change,{color:marketTone}]}>{pct(changePct)}</Text>
        </View>
      </View>
      {!compact?<View style={styles.footer}>
        <View><Text style={styles.footerLabel}>持股損益</Text><Text style={[styles.footerValue,{color:pnlTone}]}>NT$ {money(item.pnl)}</Text></View>
        {style==='advanced'?<View style={styles.rightMetric}><Text style={styles.footerLabel}>市值 / 報酬率</Text><Text style={styles.footerValue}>NT$ {money(item.marketValue)} · {pct(item.roi)}</Text></View>:<Text style={[styles.roi,{color:pnlTone}]}>{pct(item.roi)}</Text>}
      </View>:null}
    </View>
  </Pressable>;
}

function Sparkline({values,positive}:{values:number[];positive:boolean}){
  const max=Math.max(...values),min=Math.min(...values),range=Math.max(0.001,max-min);
  return <View style={styles.spark}>
    {values.map((value,index)=>{
      const height=12+((value-min)/range)*44;
      return <View key={index} style={[styles.sparkBar,{height,backgroundColor:positive?colors.gain:colors.loss}]} />;
    })}
  </View>;
}

const styles=StyleSheet.create({
  card:{flexDirection:'row',backgroundColor:'#0C121B',borderRadius:radius.lg,overflow:'hidden',minHeight:132,borderWidth:1,borderColor:'#263343'},
  compact:{minHeight:86},
  spark:{width:104,padding:spacing.md,flexDirection:'row',alignItems:'flex-end',gap:3,backgroundColor:'#090E15'},
  sparkBar:{flex:1,borderRadius:3,opacity:0.9},
  body:{flex:1,padding:spacing.md,gap:8},
  head:{flexDirection:'row',alignItems:'flex-start'},
  nameWrap:{flex:1},
  name:{fontSize:15,fontWeight:'800',color:'#FFFFFF'},
  symbol:{fontSize:11,color:'#91A0B5',marginTop:2},
  chevron:{fontSize:25,color:'#8292A8',lineHeight:26},
  quoteRow:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:spacing.sm},
  price:{fontSize:29,fontWeight:'900',fontVariant:['tabular-nums']},
  changeWrap:{alignItems:'flex-end'},
  change:{fontSize:11,fontWeight:'800',fontVariant:['tabular-nums']},
  footer:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#2C394A',paddingTop:8,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},
  footerLabel:{fontSize:10,color:'#91A0B5'},
  footerValue:{fontSize:12,fontWeight:'800',color:'#FFFFFF',marginTop:2},
  roi:{fontSize:13,fontWeight:'900'},
  rightMetric:{alignItems:'flex-end'},
});
