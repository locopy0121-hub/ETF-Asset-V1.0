import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { HoldingQuoteModule } from '../components/HoldingQuoteModule';
import { MetricTile } from '../components/MetricTile';
import { PageEditorStack } from '../components/PageEditorStack';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { PageShell } from '../components/PageShell';
import { DEMO_NEWS } from '../data/demoData';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { usePageEditor } from '../editor/pageEditor';
import { sortHoldingQuotes } from '../domain/holdingSort';
import type { HoldingQuote, HoldingSortKey, QuoteModuleStyle } from '../domain/uiModels';
import { useFinance } from '../finance/FinanceRuntime';
import { colors, radius, spacing } from '../theme/tokens';

const money=(value:number)=>Math.round(value).toLocaleString('zh-TW');

export function HomeScreen({onOpenHolding}:{onOpenHolding:(holding:HoldingQuote)=>void}) {
  const finance=useFinance();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const editor=usePageEditor('home');
  const quoteStyle=(editor.displayConfig.quoteStyle??'quote') as QuoteModuleStyle;
  const sortKey=(editor.displayConfig.sortKey??'pnl') as HoldingSortKey;
  const setQuoteStyle=(value:QuoteModuleStyle)=>editor.updateDisplayConfig({quoteStyle:value});
  const setSortKey=(value:HoldingSortKey)=>editor.updateDisplayConfig({sortKey:value});
  const sorted=useMemo(()=>sortHoldingQuotes(finance.holdings,sortKey,true).slice(0,4),[finance.holdings,sortKey]);
  const portfolio=finance.snapshot.portfolio;
  const totalDividend=portfolio.totalDividendsReceived;

  return <>
    <PageShell title="資產儀表板" subtitle="所有資產與損益來自 V3.7.8 Finance Core" actions={<PageGearButton onPress={()=>setSettingsOpen(true)}/>}>
      <PageEditorStack pageKey="home" frames={[
        {key:'asset-dashboard',element:
          <FrameCard title="資產儀表板">
            <Text style={styles.heroLabel}>總資產</Text>
            <Text style={styles.heroValue}>NT$ {money(finance.snapshot.totalAssets)}</Text>
            <Text style={[styles.heroDelta,{color:portfolio.totalPnl>=0?colors.gain:colors.loss}]}>含息總損益 NT$ {money(portfolio.totalPnl)}</Text>
            <View style={styles.metricRow}>
              <MetricTile label="持股市值" value={money(portfolio.totalMarketValue)} caption="毛市值"/>
              <MetricTile label="現金" value={money(finance.snapshot.cashBalance)} caption="Ledger"/>
              <MetricTile label="累積淨股息" value={money(totalDividend)} caption="V3.7.8"/>
            </View>
          </FrameCard>
        },
        {key:'market-news',element:
          <FrameCard title="市場新聞">
            {DEMO_NEWS.slice(0,3).map(item=><View key={item.id} style={styles.newsRow}>
              <View style={styles.newsDot}/>
              <View style={{flex:1}}><Text numberOfLines={2} style={styles.newsTitle}>{item.title}</Text><Text style={styles.newsMeta}>{item.source}</Text></View>
              <Text style={styles.newsTime}>{item.time}</Text>
            </View>)}
          </FrameCard>
        },
        {key:'holding-quotes',element:
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
            <Text style={styles.ruleText}>首頁與庫存共用同一份持股與行情資料；顯示樣式與排序狀態彼此獨立。</Text>
          </FrameCard>
        },
        {key:'pnl-detail',element:
          <FrameCard title="損益明細">
            <View style={styles.metricRow}>
              <MetricTile label="純價差未實現" value={money(portfolio.totalPriceUnrealizedProfit)} caption="毛市值－純成交成本" tone={portfolio.totalPriceUnrealizedProfit>=0?'gain':'loss'}/>
              <MetricTile label="淨清算未實現" value={money(portfolio.totalUnrealizedProfit)} caption="扣預估賣出費稅" tone={portfolio.totalUnrealizedProfit>=0?'gain':'loss'}/>
              <MetricTile label="已實現" value={money(portfolio.realizedNetPnL)} caption="歷史賣出" tone={portfolio.realizedNetPnL>=0?'gain':'loss'}/>
            </View>
            <View style={styles.totalPnl}><Text style={styles.totalPnlLabel}>含息總損益</Text><Text style={[styles.totalPnlValue,{color:portfolio.totalPnl>=0?colors.gain:colors.loss}]}>NT$ {money(portfolio.totalPnl)}</Text></View>
          </FrameCard>
        },
      ]}/>
    </PageShell>
    <PageFrameSettingsModal visible={settingsOpen} pageKey="home" title="首頁" frames={PAGE_FRAMES.home} onClose={()=>setSettingsOpen(false)}/>
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
  totalPnlValue:{fontSize:18,fontWeight:'900'},
});
