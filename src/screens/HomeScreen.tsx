import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FloatingDashboardChart } from '../components/FloatingDashboardChart';
import { NewsReaderModal } from '../components/NewsReaderModal';
import { FrameCard } from '../components/FrameCard';
import { HoldingQuoteCollection, type HoldingLayoutMode } from '../components/HoldingQuoteCollection';
import {DashboardAssetOverview} from '../components/dashboard/DashboardAssetOverview';
import {DailyPnlHistoryModal} from '../components/dashboard/DailyPnlHistoryModal';
import {DashboardProfitAnalysis} from '../components/dashboard/DashboardProfitAnalysis';
import {DashboardProfitDetail} from '../components/dashboard/DashboardProfitDetail';
import {DashboardQuickActions} from '../components/dashboard/DashboardQuickActions';
import { PageEditorStack } from '../components/PageEditorStack';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import {PortfolioQuickBar} from '../components/PortfolioQuickBar';
import { PageShell } from '../components/PageShell';
import {LayoutTargetProvider} from '../editor/LayoutSelectionContext';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { usePageEditor } from '../editor/pageEditor';
import {safeHoldingStyle} from '../domain/holdingLayoutPolicy';
import {useMaintenance} from '../maintenance/MaintenanceRuntime';
import type { DashboardChartConfig } from '../editor/editorModel';
import {nextSortPreset,sortHoldingQuotes,sortPreset} from '../domain/holdingSort';
import {DEFAULT_ETF_BADGES,todayEtfReminderMap} from '../domain/etfBadges';
import type {DividendLedgerEntry} from '../finance/canonicalLedger';
import { DEFAULT_HOLDING_WALL_CONFIG, type HoldingQuote, type HoldingSortKey, type QuoteModuleStyle } from '../domain/uiModels';
import {DEFAULT_DASHBOARD_LAYOUT} from '../domain/dashboardLayout';
import type {MainPageKey} from '../domain/pageRegistry';
import { useFinance } from '../finance/FinanceRuntime';
import {useDailyPnlHistory} from '../finance/useDailyPnlHistory';
import { useMarketRuntime } from '../market/MarketRuntime';
import {marketIntradaySeriesFor,marketQuoteSnapshotFor} from '../market/marketCenterViews';
import { useAiNewsRuntime, type AiNewsItem } from '../ai/AiNewsRuntime';
import { colors, radius, spacing } from '../theme/tokens';

const money=(value:number)=>Math.round(value).toLocaleString('zh-TW');

export function HomeScreen({onOpenHolding,onOpenChart,onNavigate}:{onOpenHolding:(holding:HoldingQuote)=>void;onOpenChart:(holding:HoldingQuote)=>void;onNavigate:(page:MainPageKey)=>void}) {
  const finance=useFinance();
  const market=useMarketRuntime();
  const aiNews=useAiNewsRuntime();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [selectedNews,setSelectedNews]=useState<AiNewsItem|null>(null);
  const [pnlHistoryOpen,setPnlHistoryOpen]=useState(false);
  const [chartBounds,setChartBounds]=useState({width:320,height:280});
  const editor=usePageEditor('home');
  const maintenance=useMaintenance();
  const effectiveDisplay=maintenance.session?.page==='home'?maintenance.session.draftDisplay:editor.displayConfig;
  const rawQuoteStyle=(effectiveDisplay.quoteStyle??'quote') as QuoteModuleStyle;
  const sortKey=(effectiveDisplay.sortKey??'pnl') as HoldingSortKey;
  const holdingLayoutMode=(effectiveDisplay.holdingLayoutMode??'list') as HoldingLayoutMode;
  // Legacy saved combinations remain safe: no graph is rendered in three columns.
  const quoteStyle=safeHoldingStyle(holdingLayoutMode,rawQuoteStyle);
  const currentSort=sortPreset(sortKey);
  const [homeFirstMode,setHomeFirstMode]=useState<'quote'|'compact'>(()=>quoteStyle==='compact'?'compact':'quote');
  const setQuoteStyle=(value:QuoteModuleStyle)=>{
    if(holdingLayoutMode==='grid3'&&(value==='chart'||value==='advanced'))return;
    if(value==='quote'||value==='compact')setHomeFirstMode(value);
    editor.updateDisplayConfig({quoteStyle:value});
  };
  const setSortKey=(value:HoldingSortKey)=>editor.updateDisplayConfig({sortKey:value});
  const cycleHomeFirst=()=>setQuoteStyle(homeFirstMode==='quote'?'compact':'quote');
  const cycleHomeSort=()=>setSortKey(nextSortPreset(sortKey).key);
  const setHoldingLayoutMode=(value:HoldingLayoutMode)=>editor.updateDisplayConfig({
    holdingLayoutMode:value,
    ...(value==='grid3'&&(rawQuoteStyle==='chart'||rawQuoteStyle==='advanced')?{quoteStyle:'quote' as const}:{}),
  });
  const sorted=useMemo(()=>{
    const tags=new Map(market.catalog.map(item=>[item.symbol,item]));
    const reminders=todayEtfReminderMap(finance.entries.filter((x):x is DividendLedgerEntry=>x.kind==='dividend'),undefined,effectiveDisplay.etfBadges?.reminderEvents);
    return sortHoldingQuotes(finance.holdings.map(item=>{
      const quote=marketQuoteSnapshotFor(market.quotes,item.symbol);
      const intraday=marketIntradaySeriesFor(market.quotes,item.symbol);
      return {
        ...item,
        ...(quote?{
          price:quote.currentPrice,
          previousClose:quote.previousClose,
          sparkline:[...(quote.sparkline??item.sparkline)],
        }:{}),
        intraday:intraday.points,
        intradayDate:intraday.date,
        intradayPreviousClose:intraday.previousClose,
      };
    }),sortKey,currentSort.descending).map(item=>({
      ...item,etfType:tags.get(item.symbol)?.etfType??null,
      dividendType:tags.get(item.symbol)?.dividendType??null,
      reminderEvent:reminders.get(item.symbol)??null,
    }));
  },[finance.holdings,finance.entries,sortKey,currentSort.descending,market.catalog,market.quotes,effectiveDisplay.etfBadges?.reminderEvents]);
  const portfolio=finance.snapshot.portfolio;
  const valuationComplete=finance.valuationComplete;
  const pnlHistory=useDailyPnlHistory({
    hydrated:finance.hydrated,
    initialCash:finance.initialCash,
    entries:finance.entries,
    rawQuotes:finance.quotes,
    currentSnapshot:finance.snapshot,
    valuationComplete,
    marketDataVersion:market.marketDataVersion,
  });
  const currentPnl=pnlHistory.current;
  const dashboardLayout=effectiveDisplay.dashboardLayout??DEFAULT_DASHBOARD_LAYOUT;
  const dashboardCharts=(effectiveDisplay.dashboardCharts??[]) as readonly DashboardChartConfig[];
  const dashboardKpis=[
    {key:'realizedNetPnL',label:'已實現損益',value:money(portfolio.realizedNetPnL),caption:'歷史賣出',tone:portfolio.realizedNetPnL>=0?'gain' as const:'loss' as const,glyph:'↗'},
    {key:'totalPnl',label:'含息總損益',value:valuationComplete?money(portfolio.totalPnl):'待核對',caption:'含息總損益',tone:portfolio.totalPnl>=0?'gain' as const:'loss' as const,glyph:'%'},
    {key:'totalUnrealizedProfit',label:'未實現損益',value:valuationComplete?money(portfolio.totalUnrealizedProfit):'待核對',caption:'淨清算',tone:portfolio.totalUnrealizedProfit>=0?'gain' as const:'loss' as const,glyph:'▥'},
    {key:'totalMarketValue',label:'持股市值',value:valuationComplete?money(portfolio.totalMarketValue):'待核對',caption:'持股行情＋股數',glyph:'◔'},
  ];
  const dashboardProfitRows=[
    {key:'price',label:'純價差未實現',value:valuationComplete?money(portfolio.totalPriceUnrealizedProfit):'待核對',tone:portfolio.totalPriceUnrealizedProfit>=0?'gain' as const:'loss' as const},
    {key:'net',label:'淨清算未實現',value:valuationComplete?money(portfolio.totalUnrealizedProfit):'待核對',tone:portfolio.totalUnrealizedProfit>=0?'gain' as const:'loss' as const},
    {key:'realized',label:'已實現損益',value:money(portfolio.realizedNetPnL),tone:portfolio.realizedNetPnL>=0?'gain' as const:'loss' as const},
    {key:'total',label:'含息總損益',value:valuationComplete?money(portfolio.totalPnl):'待核對',tone:portfolio.totalPnl>=0?'gain' as const:'loss' as const},
  ];
  const chartSeries=(chart:DashboardChartConfig)=>{
    const rows=finance.holdings.slice(0,8);
    const labels=rows.map(row=>row.symbol);
    switch(chart.source){
      case 'pnl':return {labels,values:rows.map(row=>row.pnl)};
      case 'dividend':return {labels,values:rows.map(row=>row.cumulativeDividend)};
      case 'roi':return {labels,values:rows.map(row=>row.roi)};
      case 'avgCost':return {labels,values:rows.map(row=>row.avgCost)};
      case 'price':return {labels,values:rows.map(row=>row.price)};
      case 'shares':return {labels,values:rows.map(row=>row.shares)};
      case 'realizedPnl':return {labels,values:rows.map(row=>row.realizedPnl)};
      case 'comprehensivePnl':return {labels,values:rows.map(row=>row.comprehensivePnl)};
      case 'transactions':return {labels,values:rows.map(row=>finance.entries.filter(entry=>'symbol' in entry&&entry.symbol===row.symbol&&(entry.kind==='buy'||entry.kind==='sell')).length)};
      case 'marketValue':
      case 'allocation':
      default:return {labels,values:rows.map(row=>row.marketValue)};
    }
  };
  const moveDashboardChart=(id:string,x:number,y:number)=>editor.updateDisplayConfig({dashboardCharts:dashboardCharts.map(chart=>chart.id===id?{...chart,x,y}:chart)});
  const resizeDashboardChart=(id:string,width:number,height:number)=>editor.updateDisplayConfig({dashboardCharts:dashboardCharts.map(chart=>chart.id===id?{...chart,width,height}:chart)});
  const newsCount=Math.max(1,Math.min(10,Number(effectiveDisplay.newsVisibleCount??5)));
  const newsHoldingsOnly=effectiveDisplay.newsHoldingsOnly??true;
  const holdingSymbols=useMemo(()=>new Set(finance.holdings.map(x=>x.symbol.toUpperCase())),[finance.holdings]);
  const newsItems=useMemo(()=>aiNews.items.filter(item=>!newsHoldingsOnly||holdingSymbols.has(item.symbol.toUpperCase())).slice(0,newsCount),[aiNews.items,newsHoldingsOnly,holdingSymbols,newsCount]);

  return <>
    <PageShell pageKey="home" title="資產管家" subtitle="掌握資產現況・所有損益來自正式帳務核心" actions={<View style={styles.actions}><Pressable onPress={()=>void market.refresh({force:true})} style={styles.refreshButton}><Text style={styles.refreshButtonText}>{market.refreshing?'更新中':'更新行情'}</Text></Pressable><PageGearButton onPress={()=>setSettingsOpen(true)}/></View>}>
      <View
        style={styles.pageLayer}
        onLayout={event=>setChartBounds({width:event.nativeEvent.layout.width,height:event.nativeEvent.layout.height})}
      >
      <LayoutTargetProvider targets={effectiveDisplay.layoutTargets??{}}>
      <PageEditorStack pageKey="home" gap={dashboardLayout.sectionGap} frames={[
        {key:'asset-dashboard',element:
          <FrameCard title="資產總覽">
            <View style={{paddingHorizontal:dashboardLayout.contentPadding}}>
              <DashboardAssetOverview
                amount={money(portfolio.totalMarketValue)}
                complete={valuationComplete}
                caption={valuationComplete?'持股市值＋股數':'待取得可信行情，帳務明細不受影響'}
                layout={dashboardLayout.overview}
                previousPnl={currentPnl?.previousTotalPnl??0}
                todayPnl={currentPnl?.todayPnl??0}
                totalPnl={portfolio.totalPnl}
                pnlComplete={valuationComplete&&currentPnl!==null}
                onPressTotalPnl={()=>setPnlHistoryOpen(true)}
              />
            </View>
          </FrameCard>
        },
        {key:'profit-analysis',element:
          <FrameCard title="損益分析">
            <View style={{paddingHorizontal:dashboardLayout.contentPadding}}>
              <DashboardProfitAnalysis items={dashboardKpis} layout={dashboardLayout.profitAnalysis}/>
            </View>
          </FrameCard>
        },
        {key:'pnl-detail',element:
          <FrameCard title="損益明細">
            <View style={{paddingHorizontal:dashboardLayout.contentPadding}}>
              <DashboardProfitDetail rows={dashboardProfitRows} layout={dashboardLayout.profitDetail} onMore={()=>onNavigate('portfolio')}/>
            </View>
          </FrameCard>
        },
        {key:'dashboard-quick-actions',element:
          <FrameCard title="快捷功能">
            <View style={{paddingHorizontal:dashboardLayout.contentPadding}}>
              <DashboardQuickActions layout={dashboardLayout.quickActions} actions={[
                {key:'stock-query',label:'持股查詢',glyph:'⌕',onPress:()=>onNavigate('portfolio')},
                {key:'ledger',label:'交易紀錄',glyph:'▤',onPress:()=>onNavigate('ledger')},
                {key:'allocation',label:'資產配置',glyph:'◔',onPress:()=>onNavigate('portfolio')},
                {key:'dividend',label:'股息資訊',glyph:'＄',onPress:()=>onNavigate('dividend')},
              ]}/>
            </View>
          </FrameCard>
        },
        {key:'market-news',element:
          <FrameCard title="市場新聞">
            {newsItems.map(item=><Pressable key={item.id} accessibilityRole="button" onPress={()=>setSelectedNews(item)} style={({pressed})=>[styles.newsRow,pressed&&styles.newsPressed]}>
              <View style={styles.newsDot}/>
              <View style={{flex:1}}><Text style={styles.newsSymbol}>{item.symbol} {item.name}</Text><Text numberOfLines={2} style={styles.newsTitle}>{item.title}</Text><Text numberOfLines={2} style={styles.newsSummary}>{item.summary}</Text><Text style={styles.newsMeta}>{item.source} · 點擊於 App 內閱讀</Text></View>
              <Text style={styles.newsTime}>{new Date(item.publishedAt).toLocaleDateString('zh-TW',{month:'2-digit',day:'2-digit'})}</Text>
            </Pressable>)}
            {!newsItems.length?<Text style={styles.ruleText}>尚無持股新聞；請到 AI 助理更新新聞。</Text>:null}
          </FrameCard>
        },
        {key:'holding-quotes',element:
          <FrameCard title="持股行情模塊">
            <PortfolioQuickBar firstMode={homeFirstMode} activeMode={quoteStyle} firstHint="切換純行情與精簡"
              sortLabel={currentSort.label} onCycleFirst={cycleHomeFirst}
              onSelect={setQuoteStyle} onCycleSort={cycleHomeSort}/>
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
            {holdingLayoutMode==='grid3'?<Text style={styles.ruleText}>三欄自動使用無圖表精簡卡，保留 ETF 代號、名稱、報價、漲跌與損益。</Text>:null}
            <HoldingQuoteCollection rows={sorted} style={quoteStyle} layoutMode={holdingLayoutMode} refreshToken={finance.sharedSnapshot.generatedAt} badgeConfig={effectiveDisplay.etfBadges??DEFAULT_ETF_BADGES} wallConfig={effectiveDisplay.holdingWall??DEFAULT_HOLDING_WALL_CONFIG} onOpenHolding={onOpenHolding} onOpenChart={onOpenChart}/>
            <Text style={styles.ruleText}>共 {sorted.length} 筆持股；排序只改順序，排列只改畫面，不裁切資料。主體行情牆卡片共用同一份 A/B 編輯設定；首頁與庫存各自保存顯示設定。</Text>
          </FrameCard>
        },
      ]}/>
      </LayoutTargetProvider>
      {dashboardCharts.map(chart=>{const series=chartSeries(chart);return <FloatingDashboardChart key={chart.id} config={chart} values={series.values} labels={series.labels} bounds={chartBounds} onMove={(x,y)=>moveDashboardChart(chart.id,x,y)} onResize={(width,height)=>resizeDashboardChart(chart.id,width,height)}/>;})}
      </View>
    </PageShell>
    <NewsReaderModal item={selectedNews} onClose={()=>setSelectedNews(null)}/>
    <DailyPnlHistoryModal visible={pnlHistoryOpen} onClose={()=>setPnlHistoryOpen(false)}
      records={pnlHistory.records} stats={pnlHistory.stats}
      historyLoading={pnlHistory.historyLoading} historyError={pnlHistory.historyError}
      historyStartDate={pnlHistory.historyStartDate}/>
    <PageFrameSettingsModal visible={settingsOpen} pageKey="home" title="首頁" frames={PAGE_FRAMES.home} previewQuote={sorted[0]} previewRows={sorted} onClose={()=>setSettingsOpen(false)}/>
  </>;
}

const styles=StyleSheet.create({
  actions:{flexDirection:'row',alignItems:'center',gap:8},
  refreshButton:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  refreshButtonText:{fontSize:10,fontWeight:'900',color:colors.primary},
  heroLabel:{color:colors.textSecondary,fontSize:12,fontWeight:'700'},
  heroAmountShell:{width:'100%',minWidth:0,overflow:'hidden'},
  heroAmountRow:{flexDirection:'row',alignItems:'flex-end',width:'100%',minWidth:0,overflow:'hidden'},
  heroPrefix:{color:colors.text,fontSize:18,lineHeight:42,fontWeight:'900',marginRight:8,flexShrink:1,maxWidth:'30%'},
  heroValue:{color:colors.text,fontSize:42,lineHeight:46,fontWeight:'900',fontVariant:['tabular-nums'],flex:1,minWidth:0,flexShrink:1},
  heroDelta:{fontSize:13,fontWeight:'800',marginTop:2},
  pageLayer:{position:'relative'},
  dashboardTop:{minHeight:128,justifyContent:'flex-start'},
  // The hero amount is one responsive composite row; never position NT$ and the value independently.
  dashboardSummary:{width:'100%',gap:4,minWidth:0},
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
