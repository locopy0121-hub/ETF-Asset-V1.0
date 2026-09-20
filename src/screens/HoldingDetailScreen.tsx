import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { MetricTile } from '../components/MetricTile';
import { PageShell } from '../components/PageShell';
import type { HoldingQuote } from '../domain/uiModels';
import { colors, radius, spacing } from '../theme/tokens';

const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');

export function HoldingDetailScreen({holding,onBack}:{holding:HoldingQuote;onBack:()=>void}){
  const change=holding.price-holding.previousClose;
  const changePct=holding.previousClose>0?change/holding.previousClose*100:0;
  return <PageShell
    title={holding.name}
    subtitle={holding.symbol}
    actions={<Pressable style={styles.backButton} onPress={onBack}><Text style={styles.backText}>返回</Text></Pressable>}
  >
    <FrameCard title="即時行情">
      <Text style={[styles.price,{color:change>=0?colors.gain:colors.loss}]}>{holding.price.toFixed(2)}</Text>
      <Text style={[styles.change,{color:change>=0?colors.gain:colors.loss}]}>{change>=0?'▲':'▼'} {change>=0?'+':''}{change.toFixed(2)}　{changePct>=0?'+':''}{changePct.toFixed(2)}%</Text>
      <View style={styles.sparkline}>{holding.sparkline.map((v,i)=>{
        const min=Math.min(...holding.sparkline),max=Math.max(...holding.sparkline),range=Math.max(0.01,max-min);
        return <View key={i} style={[styles.sparkBar,{height:18+(v-min)/range*72,backgroundColor:change>=0?colors.gain:colors.loss}]}/>;
      })}</View>
    </FrameCard>
    <FrameCard title="持股資訊">
      <View style={styles.metrics}>
        <MetricTile label="持有股數" value={money(holding.shares)} caption="股"/>
        <MetricTile label="平均成本" value={holding.avgCost.toFixed(2)} caption="每股"/>
        <MetricTile label="目前市值" value={money(holding.marketValue)} caption="NT$"/>
        <MetricTile label="持股損益" value={money(holding.pnl)} caption={`${holding.roi>=0?'+':''}${holding.roi.toFixed(2)}%`} tone={holding.pnl>=0?'gain':'loss'}/>
      </View>
    </FrameCard>
    <FrameCard title="含息表現">
      <View style={styles.metrics}>
        <MetricTile label="累積股息" value={money(holding.cumulativeDividend)} caption="NT$" tone="gain"/>
        <MetricTile label="持股占比" value={`${holding.weight.toFixed(1)}%`} caption="目前組合"/>
      </View>
    </FrameCard>
    <FrameCard title="交易與股息紀錄">
      <Text style={styles.muted}>此區將讀取正式 Ledger 與 Dividend 事件，依日期整合呈現；不在詳情頁重新計算帳務。</Text>
    </FrameCard>
    <FrameCard title="試算入口">
      <Text style={styles.muted}>加碼、減碼、目標價與報酬試算會使用獨立試算資料，不回寫正式帳務，除非使用者明確建立紀錄。</Text>
    </FrameCard>
  </PageShell>;
}

const styles=StyleSheet.create({
  backButton:{paddingHorizontal:13,paddingVertical:9,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  backText:{fontWeight:'800',color:colors.primary},
  price:{fontSize:42,fontWeight:'900',fontVariant:['tabular-nums']},
  change:{fontSize:14,fontWeight:'800'},
  sparkline:{height:110,flexDirection:'row',alignItems:'flex-end',gap:5,paddingTop:8},
  sparkBar:{flex:1,borderRadius:5,opacity:0.85},
  metrics:{flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},
  muted:{fontSize:12,lineHeight:20,color:colors.textSecondary},
});
