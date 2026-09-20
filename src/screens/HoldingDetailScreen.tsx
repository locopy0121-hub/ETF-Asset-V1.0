import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { MetricTile } from '../components/MetricTile';
import { PageShell } from '../components/PageShell';
import type { HoldingQuote } from '../domain/uiModels';
import { ledgerDisplayAmount, useFinance } from '../finance/FinanceRuntime';
import { colors, radius, spacing } from '../theme/tokens';

const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');
const ranges=['1日','1週','1月','3月','1年','全部'] as const;

export function HoldingDetailScreen({holding,onBack}:{holding:HoldingQuote;onBack:()=>void}){
  const finance=useFinance();
  const [range,setRange]=useState<(typeof ranges)[number]>('1日');
  const change=holding.price-holding.previousClose;
  const changePct=holding.previousClose>0?change/holding.previousClose*100:0;
  const history=[...finance.entries].filter(entry=>'symbol' in entry&&entry.symbol===holding.symbol).sort((a,b)=>b.date.localeCompare(a.date));
  const updatedAt=new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'});

  return <PageShell
    title={holding.name}
    subtitle={holding.symbol}
    actions={<Pressable style={styles.backButton} onPress={onBack}><Text style={styles.backText}>返回</Text></Pressable>}
  >
    <FrameCard title="即時行情">
      <Text style={[styles.price,{color:change>0?colors.gain:change<0?colors.loss:colors.flat}]}>{holding.price.toFixed(2)}</Text>
      <Text style={[styles.change,{color:change>0?colors.gain:change<0?colors.loss:colors.flat}]}>{change>0?'▲':change<0?'▼':'●'} {change>=0?'+':''}{change.toFixed(2)}　{changePct>=0?'+':''}{changePct.toFixed(2)}%</Text>
      <View style={styles.marketMeta}><Text style={styles.meta}>昨收 {holding.previousClose.toFixed(2)}</Text><Text style={styles.meta}>更新 {updatedAt}</Text></View>
      <View style={styles.rangeRow}>{ranges.map(item=><Pressable key={item} onPress={()=>setRange(item)} style={[styles.rangeChip,range===item&&styles.rangeActive]}><Text style={[styles.rangeText,range===item&&styles.rangeTextActive]}>{item}</Text></Pressable>)}</View>
      <View style={styles.sparkline}>{holding.sparkline.map((v,i)=>{
        const min=Math.min(...holding.sparkline),max=Math.max(...holding.sparkline),rangeValue=Math.max(0.01,max-min);
        return <View key={i} style={[styles.sparkBar,{height:18+(v-min)/rangeValue*72,backgroundColor:change>=0?colors.gain:colors.loss}]}/>;
      })}</View>
      {range!=='1日'?<Text style={styles.rangeHint}>目前種子行情只有 1 日資料；其他區間已建立切換介面，接入歷史行情後直接沿用。</Text>:null}
    </FrameCard>

    <FrameCard title="持股資訊">
      <View style={styles.metrics}>
        <MetricTile label="持有股數" value={money(holding.shares)} caption="股"/>
        <MetricTile label="純成交均價" value={holding.tradeAvg.toFixed(2)} caption="不含費"/>
        <MetricTile label="含費成本均價" value={holding.costAvg.toFixed(2)} caption="V3.7.8"/>
        <MetricTile label="目前市值" value={money(holding.marketValue)} caption="NT$"/>
      </View>
    </FrameCard>

    <FrameCard title="損益拆解">
      <View style={styles.metrics}>
        <MetricTile label="純價差損益" value={money(holding.pricePnl)} caption="毛市值－純成交成本" tone={holding.pricePnl>=0?'gain':'loss'}/>
        <MetricTile label="淨清算未實現" value={money(holding.pnl)} caption={(holding.roi>=0?'+':'')+holding.roi.toFixed(2)+'%'} tone={holding.pnl>=0?'gain':'loss'}/>
        <MetricTile label="已實現" value={money(holding.realizedPnl)} caption="歷史賣出" tone={holding.realizedPnl>=0?'gain':'loss'}/>
        <MetricTile label="含息總損益" value={money(holding.comprehensivePnl)} caption="Canonical" tone={holding.comprehensivePnl>=0?'gain':'loss'}/>
      </View>
    </FrameCard>

    <FrameCard title="股息">
      <View style={styles.metrics}><MetricTile label="累積淨股息" value={money(holding.cumulativeDividend)} caption="NT$" tone="gain"/><MetricTile label="持股占比" value={holding.weight.toFixed(1)+'%'} caption="目前組合"/></View>
    </FrameCard>

    <FrameCard title="交易與股息紀錄">
      {history.length?history.slice(0,12).map(entry=><View key={entry.id} style={styles.historyRow}>
        <Text style={styles.historyDate}>{entry.date.slice(5)}</Text>
        <Text style={styles.historyKind}>{entry.kind==='buy'?'買進':entry.kind==='sell'?'賣出':entry.kind==='dividend'?'股息':'其他'}</Text>
        <Text style={styles.historyAmount}>NT$ {money(ledgerDisplayAmount(entry))}</Text>
      </View>):<Text style={styles.muted}>尚無紀錄</Text>}
    </FrameCard>

    <FrameCard title="試算入口">
      <Text style={styles.muted}>庫存頁右上角「🧮」已接入 V3.7.8 試算核心；試算資料不回寫正式 Ledger。</Text>
    </FrameCard>
  </PageShell>;
}

const styles=StyleSheet.create({
  backButton:{paddingHorizontal:13,paddingVertical:9,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  backText:{fontWeight:'800',color:colors.primary},
  price:{fontSize:42,fontWeight:'900',fontVariant:['tabular-nums']},
  change:{fontSize:14,fontWeight:'800'},
  marketMeta:{flexDirection:'row',justifyContent:'space-between'},
  meta:{fontSize:10,color:colors.textSecondary},
  rangeRow:{flexDirection:'row',gap:5,flexWrap:'wrap'},
  rangeChip:{paddingHorizontal:9,paddingVertical:6,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  rangeActive:{backgroundColor:colors.primary},
  rangeText:{fontSize:9,fontWeight:'800',color:colors.textSecondary},
  rangeTextActive:{color:'#FFF'},
  sparkline:{height:110,flexDirection:'row',alignItems:'flex-end',gap:5,paddingTop:8},
  sparkBar:{flex:1,borderRadius:5,opacity:0.85},
  rangeHint:{fontSize:9,lineHeight:14,color:colors.textSecondary},
  metrics:{flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},
  historyRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  historyDate:{width:48,fontSize:10,color:colors.textSecondary},
  historyKind:{width:38,fontSize:10,fontWeight:'900',color:colors.primary},
  historyAmount:{flex:1,textAlign:'right',fontSize:11,fontWeight:'900',color:colors.text},
  muted:{fontSize:12,lineHeight:20,color:colors.textSecondary},
});
