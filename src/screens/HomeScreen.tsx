import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { HoldingQuoteModule } from '../components/HoldingQuoteModule';
import { MetricTile } from '../components/MetricTile';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { PageShell } from '../components/PageShell';
import { DEMO_HOLDINGS, DEMO_NEWS } from '../data/demoData';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { sortHoldingQuotes } from '../domain/holdingSort';
import type { HoldingQuote, HoldingSortKey, QuoteModuleStyle } from '../domain/uiModels';
import { colors, radius, spacing } from '../theme/tokens';

const money=(value:number)=>Math.round(value).toLocaleString('zh-TW');

export function HomeScreen({onOpenHolding}:{onOpenHolding:(holding:HoldingQuote)=>void}) {
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [quoteStyle,setQuoteStyle]=useState<QuoteModuleStyle>('quote');
  const [sortKey,setSortKey]=useState<HoldingSortKey>('pnl');
  const sorted=useMemo(()=>sortHoldingQuotes(DEMO_HOLDINGS,sortKey,true).slice(0,4),[sortKey]);
  const totalMarket=DEMO_HOLDINGS.reduce((s,x)=>s+x.marketValue,0);
  const totalPnl=DEMO_HOLDINGS.reduce((s,x)=>s+x.pnl,0);
  const totalDividend=DEMO_HOLDINGS.reduce((s,x)=>s+x.cumulativeDividend,0);

  return <>
    <PageShell title="資產儀表板" subtitle="一眼掌握資產、行情與損益" actions={<PageGearButton onPress={()=>setSettingsOpen(true)}/>}>
      <FrameCard title="資產儀表板">
        <Text style={styles.heroLabel}>持股總市值</Text>
        <Text style={styles.heroValue}>NT$ {money(totalMarket)}</Text>
        <Text style={[styles.heroDelta,{color:totalPnl>=0?colors.gain:colors.loss}]}>含持股損益 NT$ {money(totalPnl)}</Text>
        <View style={styles.metricRow}>
          <MetricTile label="今日損益" value="+8,560" caption="+0.70%" tone="gain"/>
          <MetricTile label="本月股息" value="9,130" caption="預估＋實收"/>
          <MetricTile label="年度股息" value={money(totalDividend)} caption="累積"/>
        </View>
      </FrameCard>

      <FrameCard title="市場新聞">
        {DEMO_NEWS.map(item=><View key={item.id} style={styles.newsRow}>
          <View style={styles.newsDot}/>
          <View style={{flex:1}}><Text style={styles.newsTitle}>{item.title}</Text><Text style={styles.newsMeta}>{item.source}</Text></View>
          <Text style={styles.newsTime}>{item.time}</Text>
        </View>)}
      </FrameCard>

      <FrameCard title="持股行情模塊">
        <SegmentedControl
          items={[{key:'quote',label:'純行情'},{key:'chart',label:'＋圖表'},{key:'compact',label:'精簡'},{key:'advanced',label:'進階'}] as const}
          value={quoteStyle}
          onChange={setQuoteStyle}
        />
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>條件排序</Text>
          {([{key:'pnl',label:'損益'},{key:'changePct',label:'漲跌'},{key:'marketValue',label:'市值'}] as const).map(x=>
            <Pressable key={x.key} style={[styles.sortChip,sortKey===x.key&&styles.sortChipActive]} onPress={()=>setSortKey(x.key)}>
              <Text style={[styles.sortChipText,sortKey===x.key&&styles.sortChipTextActive]}>{x.label}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.quoteList}>{sorted.map(item=><HoldingQuoteModule key={item.symbol} item={item} style={quoteStyle} onPress={()=>onOpenHolding(item)}/>)}</View>
        <Text style={styles.ruleText}>釘選優先 → 條件排序 → 一般標的。首頁設定與庫存設定彼此獨立。</Text>
      </FrameCard>

      <FrameCard title="損益明細">
        <View style={styles.metricRow}>
          <MetricTile label="今日" value="+8,560" caption="+0.70%" tone="gain"/>
          <MetricTile label="本月" value="+23,420" caption="+1.88%" tone="gain"/>
          <MetricTile label="今年" value="+91,630" caption="+7.45%" tone="gain"/>
        </View>
        <View style={styles.totalPnl}><Text style={styles.totalPnlLabel}>含息總損益</Text><Text style={styles.totalPnlValue}>NT$ {money(totalPnl+totalDividend)}</Text></View>
      </FrameCard>
    </PageShell>
    <PageFrameSettingsModal visible={settingsOpen} title="首頁" frames={PAGE_FRAMES.home} onClose={()=>setSettingsOpen(false)}/>
  </>;
}

const styles=StyleSheet.create({
  heroLabel:{color:colors.textSecondary,fontSize:12,fontWeight:'700'},
  heroValue:{color:colors.text,fontSize:34,fontWeight:'900',fontVariant:['tabular-nums']},
  heroDelta:{fontSize:13,fontWeight:'800'},
  metricRow:{flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},
  newsRow:{flexDirection:'row',gap:spacing.sm,alignItems:'flex-start',paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  newsDot:{width:7,height:7,borderRadius:4,backgroundColor:colors.primary,marginTop:6},
  newsTitle:{fontSize:13,color:colors.text,fontWeight:'700',lineHeight:19},
  newsMeta:{fontSize:10,color:colors.textSecondary,marginTop:2},
  newsTime:{fontSize:10,color:colors.textSecondary},
  sortRow:{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'},
  sortLabel:{fontSize:11,fontWeight:'800',color:colors.textSecondary,marginRight:3},
  sortChip:{paddingHorizontal:11,paddingVertical:6,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  sortChipActive:{backgroundColor:colors.primary},
  sortChipText:{fontSize:11,fontWeight:'800',color:colors.textSecondary},
  sortChipTextActive:{color:'#FFFFFF'},
  quoteList:{gap:spacing.sm},
  ruleText:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  totalPnl:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:spacing.md,borderTopWidth:1,borderTopColor:colors.border},
  totalPnlLabel:{fontWeight:'800',color:colors.textSecondary},
  totalPnlValue:{fontSize:18,fontWeight:'900',color:colors.gain},
});
