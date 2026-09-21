import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { FloatingDashboardChart } from '../components/FloatingDashboardChart';
import { FrameCard } from '../components/FrameCard';
import { HoldingQuoteCollection, type HoldingLayoutMode } from '../components/HoldingQuoteCollection';
import { MetricTile } from '../components/MetricTile';
import { PageEditorStack } from '../components/PageEditorStack';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { PageShell } from '../components/PageShell';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { usePageEditor } from '../editor/pageEditor';
import type { DashboardChartConfig, DashboardMetricKey } from '../editor/editorModel';
import { sortHoldingQuotes } from '../domain/holdingSort';
import { DEFAULT_HOLDING_WALL_CONFIG, type HoldingQuote, type HoldingSortKey, type QuoteModuleStyle } from '../domain/uiModels';
import { useFinance } from '../finance/FinanceRuntime';
import { useMarketRuntime } from '../market/MarketRuntime';
import { useAiNewsRuntime } from '../ai/AiNewsRuntime';
import { colors, radius, spacing } from '../theme/tokens';

const money=(value:number)=>Math.round(value).toLocaleString('zh-TW');

export function HomeScreen({onOpenHolding}:{onOpenHolding:(holding:HoldingQuote)=>void}) {
  const finance=useFinance();
  const market=useMarketRuntime();
  const aiNews=useAiNewsRuntime();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [chartBounds,setChartBounds]=useState({width:320,height:280});
  const editor=usePageEditor('home');
  const quoteStyle=(editor.displayConfig.quoteStyle??'quote') as QuoteModuleStyle;
  const sortKey=(editor.displayConfig.sortKey??'pnl') as HoldingSortKey;
  const holdingLayoutMode=(editor.displayConfig.holdingLayoutMode??'list') as HoldingLayoutMode;
  const setQuoteStyle=(value:QuoteModuleStyle)=>editor.updateDisplayConfig({quoteStyle:value});
  const setSortKey=(value:HoldingSortKey)=>editor.updateDisplayConfig({sortKey:value});
  const setHoldingLayoutMode=(value:HoldingLayoutMode)=>editor.updateDisplayConfig({holdingLayoutMode:value});
  const sorted=useMemo(()=>sortHoldingQuotes(finance.holdings,sortKey,true),[finance.holdings,sortKey]);
  const portfolio=finance.snapshot.portfolio;
  const totalDividend=portfolio.totalDividendsReceived;
  const dashboardMetrics=(editor.displayConfig.dashboardMetrics??[]) as readonly DashboardMetricKey[];
  const dashboardCharts=(editor.displayConfig.dashboardCharts??[]) as readonly DashboardChartConfig[];
  const dashboardMetricInfo:Record<DashboardMetricKey,{label:string;value:number;caption:string;tone?:'gain'|'loss'}>={
    totalMarketValue:{label:'持股市值',value:portfolio.totalMarketValue,caption:'Finance Core'},
    totalPnl:{label:'含息總損益',value:portfolio.totalPnl,caption:'含息',tone:portfolio.totalPnl>=0?'gain':'loss'},
    totalUnrealizedProfit:{label:'未實現損益',value:portfolio.totalUnrealizedProfit,caption:'淨清算',tone:portfolio.totalUnrealizedProfit>=0?'gain':'loss'},
    realizedNetPnL:{label:'已實現損益',value:portfolio.realizedNetPnL,caption:'歷史賣出',tone:portfolio.realizedNetPnL>=0?'gain':'loss'},
    totalDividendsReceived:{label:'累積淨股息',value:portfolio.totalDividendsReceived,caption:'V3.7.8'},
    cashBalance:{label:'現金',value:finance.snapshot.cashBalance,caption:'Ledger'},
    holdingCount:{label:'持股檔數',value:finance.holdings.length,caption:'檔'},
  };
  const chartSeries=(chart:DashboardChartConfig)=>{
    const rows=finance.holdings.slice(0,8);
    const labels=rows.map(row=>row.symbol);
    switch(chart.source){
      case 'pnl':return {labels,values:rows.map(row=>row.pnl)};
      case 'dividend':return {labels,values:rows.map(row=>row.cumulativeDividend)};
      case 'roi':return {labels,values:rows.map(row=>row.roi)};
      case 'marketValue':
      case 'allocation':
      default:return {labels,values:rows.map(row=>row.marketValue)};
    }
  };
  const moveDashboardChart=(id:string,x:number,y:number)=>editor.updateDisplayConfig({dashboardCharts:dashboardCharts.map(chart=>chart.id===id?{...chart,x,y}:chart)});
  const newsCount=Math.max(1,Math.min(10,Number(editor.displayConfig.newsVisibleCount??5)));
  const newsHoldingsOnly=editor.displayConfig.newsHoldingsOnly??true;
  const holdingSymbols=useMemo(()=>new Set(finance.holdings.map(x=>x.symbol.toUpperCase())),[finance.holdings]);
  const newsItems=useMemo(()=>aiNews.items.filter(item=>!newsHoldingsOnly||holdingSymbols.has(item.symbol.toUpperCase())).slice(0,newsCount),[aiNews.items,newsHoldingsOnly,holdingSymbols,newsCount]);

  return <>
    <PageShell title="資產儀表板" subtitle="所有資產與損益來自 V3.7.8 Finance Core" actions={<View style={styles.actions}><Pressable onPress={()=>void market.refresh({force:true})} style={styles.refreshButton}><Text style={styles.refreshButtonText}>{market.refreshing?'更新中':'更新行情'}</Text></Pressable><PageGearButton onPress={()=>setSettingsOpen(true)}/></View>}>
      <View
        style={styles.pageLayer}
        onLayout={event=>setChartBounds({width:event.nativeEvent.layout.width,height:event.nativeEvent.layout.height})}
      >
      <PageEditorStack pageKey="home" frames={[
        {key:'asset-dashboard',element:
          <FrameCard title="資產儀表板">
            <View style={styles.dashboardTop}>
              <View style={styles.dashboardSummary}>
                <Text style={styles.heroLabel}>總資產（持股市值）</Text>
                <Text style={styles.heroValue}>NT$ {money(portfolio.totalMarketValue)}</Text>
                <Text style={[styles.heroDelta,{color:portfolio.totalPnl>=0?colors.gain:colors.loss}]}>含息總損益 NT$ {money(portfolio.totalPnl)}</Text>
              </View>
            </View>
            <View style={styles.metricRow}>
              {dashboardMetrics.map(key=>{const item=dashboardMetricInfo[key];return <MetricTile key={key} label={item.label} value={key==='holdingCount'?String(item.value):money(item.value)} caption={item.caption} {...(item.tone?{tone:item.tone}:{})}/>;})}
            </View>
          </FrameCard>
        },
        {key:'market-news',element:
          <FrameCard title="市場新聞">
            {newsItems.map(item=><Pressable key={item.id} accessibilityRole="link" disabled={!item.url} onPress={()=>void Linking.openURL(item.url)} style={({pressed})=>[styles.newsRow,pressed&&styles.newsPressed,!item.url&&styles.newsDisabled]}>
              <View style={styles.newsDot}/>
              <View style={{flex:1}}><Text style={styles.newsSymbol}>{item.symbol} {item.name}</Text><Text numberOfLines={2} style={styles.newsTitle}>{item.title}</Text><Text numberOfLines={2} style={styles.newsSummary}>{item.summary}</Text><Text style={styles.newsMeta}>{item.source} · 點擊開啟原文</Text></View>
              <Text style={styles.newsTime}>{new Date(item.publishedAt).toLocaleDateString('zh-TW',{month:'2-digit',day:'2-digit'})}</Text>
            </Pressable>)}
            {!newsItems.length?<Text style={styles.ruleText}>尚無持股新聞；請到 AI 助理更新新聞。</Text>:null}
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
            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>顯示排列</Text>
              {([
                {key:'list',label:'單欄'},
                {key:'grid2',label:'雙欄'},
                {key:'grid3',label:'三欄'},
                {key:'horizontal',label:'橫向滑動'},
                {key:'paged2',label:'雙欄滑動'},
              ] as const).map(x=>
                <Pressable key={x.key} style={[styles.sortChip,holdingLayoutMode===x.key&&styles.sortChipActive]} onPress={()=>setHoldingLayoutMode(x.key)}>
                  <Text style={[styles.sortChipText,holdingLayoutMode===x.key&&styles.sortChipTextActive]}>{x.label}</Text>
                </Pressable>
              )}
            </View>
            <HoldingQuoteCollection rows={sorted} style={quoteStyle} layoutMode={holdingLayoutMode} wallConfig={editor.displayConfig.holdingWall??DEFAULT_HOLDING_WALL_CONFIG} onOpenHolding={onOpenHolding}/>
            <Text style={styles.ruleText}>共 {sorted.length} 筆持股；排序只改順序，排列只改畫面，不裁切資料。主體行情牆卡片共用同一份 A/B 編輯設定；首頁與庫存各自保存顯示設定。</Text>
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
      {dashboardCharts.map(chart=>{const series=chartSeries(chart);return <FloatingDashboardChart key={chart.id} config={chart} values={series.values} labels={series.labels} bounds={chartBounds} onMove={(x,y)=>moveDashboardChart(chart.id,x,y)}/>;})}
      </View>
    </PageShell>
    <PageFrameSettingsModal visible={settingsOpen} pageKey="home" title="首頁" frames={PAGE_FRAMES.home} onClose={()=>setSettingsOpen(false)}/>
  </>;
}

const styles=StyleSheet.create({
  actions:{flexDirection:'row',alignItems:'center',gap:8},
  refreshButton:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  refreshButtonText:{fontSize:10,fontWeight:'900',color:colors.primary},
  heroLabel:{color:colors.textSecondary,fontSize:12,fontWeight:'700'},
  heroValue:{color:colors.text,fontSize:34,fontWeight:'900',fontVariant:['tabular-nums']},
  heroDelta:{fontSize:13,fontWeight:'800'},
  pageLayer:{position:'relative'},
  dashboardTop:{minHeight:150,justifyContent:'flex-start'},
  dashboardSummary:{width:'48%',gap:6},
  metricRow:{flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},
  newsRow:{flexDirection:'row',gap:spacing.sm,alignItems:'flex-start',paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  newsDot:{width:7,height:7,borderRadius:4,backgroundColor:colors.primary,marginTop:6},
  newsSymbol:{fontSize:10,fontWeight:'900',color:colors.primary,marginBottom:2},
  newsSummary:{fontSize:10,lineHeight:15,color:colors.textSecondary,marginTop:3},
  newsTitle:{fontSize:13,color:colors.text,fontWeight:'700',lineHeight:19},
  newsMeta:{fontSize:10,color:colors.textSecondary,marginTop:2},
  newsTime:{fontSize:10,color:colors.textSecondary},
  newsPressed:{opacity:.65},
  newsDisabled:{opacity:.45},
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
