import {useDisplayFormat} from '../settings/useDisplayFormat';
import {financialTone} from '../theme/financialTone';
import {useSystemColors} from '../theme/useSystemColors';
import { useEffect, useState } from 'react';
import { OfficialCandleChart } from '../components/OfficialCandleChart';
import {fetchOfficialDailyHistory,type DailyCandle} from '../market/twseDailyHistory';
import {StyleSheet,View} from 'react-native';
import {Pressable,Text} from '../components/EditableNative';

import { FrameCard } from '../components/FrameCard';
import { MetricTile } from '../components/MetricTile';
import { PageEditorStack } from '../components/PageEditorStack';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import { PageShell } from '../components/PageShell';
import type { HoldingQuote } from '../domain/uiModels';
import {CHART_DATA_OPTIONS,HOLDING_CHART_RANGES,NATIVE_CHART_STYLES,normalizeHoldingChart,type ChartDataKey,type HoldingChartRange,type NativeChartStyle} from '../domain/chartEditor';
import {usePageEditor} from '../editor/pageEditor';
import { ledgerDisplayAmount, useFinance } from '../finance/FinanceRuntime';
import { colors, radius, spacing } from '../theme/tokens';
import {recordDiagnosticEvent} from '../diagnostics/DiagnosticRuntime';
import {PAGE_FRAMES} from '../domain/frameRegistry';
import {EtfConstituentsContent} from '../components/EtfConstituentsContent';
import {isEtfSymbol} from '../market/etfConstituents';

const monthsByRange:Record<HoldingChartRange,number>={'1月':1,'3月':3,'6月':6,'1年':12};
const HOLDING_DETAIL_FRAMES=PAGE_FRAMES.portfolio.filter(frame=>frame.key.startsWith('holding-detail-'));

export function HoldingDetailScreen({holding:initialHolding,onBack}:{holding:HoldingQuote;onBack:()=>void}){
  const {money,percent,date:displayDate}=useDisplayFormat();
  const colors=useSystemColors();
  const finance=useFinance();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const chartEditor=usePageEditor('portfolio');
  const savedChart=normalizeHoldingChart(chartEditor.displayConfig.holdingChart);
  // Detail must subscribe to the current canonical projection, not a stale tapped row.
  const holding=finance.holdings.find(row=>row.symbol===initialHolding.symbol)??initialHolding;
  const [range,setRange]=useState<HoldingChartRange>(savedChart.range);
  const [candles,setCandles]=useState<DailyCandle[]>([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historyError,setHistoryError]=useState<string|null>(null);
  const [chartStyle,setChartStyle]=useState<NativeChartStyle>(savedChart.style);
  const [chartData,setChartData]=useState<ChartDataKey[]>([...savedChart.dataKeys]);
  useEffect(()=>{recordDiagnosticEvent({level:'info',code:'DETAIL_MOUNT',screen:'holding-detail',message:'持股詳情已掛載'});},[holding.symbol]);
  useEffect(()=>{
    let active=true;
    const abort=new AbortController();
    setHistoryLoading(true);
    setHistoryError(null);
    setCandles([]);
    fetchOfficialDailyHistory(holding.symbol,monthsByRange[range],new Date(),abort.signal)
      .then(rows=>{if(active)setCandles(rows);})
      .catch(error=>{if(active){setHistoryError(error instanceof Error?error.message:'官方歷史行情不可用');recordDiagnosticEvent({level:'warning',code:'DAILY_HISTORY',screen:'holding-detail',message:'官方歷史行情取得失敗'});}})
      .finally(()=>{if(active)setHistoryLoading(false);});
    return()=>{active=false;abort.abort();};
  },[holding.symbol,range]);
  const finite=(value:number)=>Number.isFinite(value)?value:0;
  const currentPrice=finite(holding.price),previousClose=finite(holding.previousClose);
  const change=currentPrice-previousClose;
  const changePct=previousClose>0?change/previousClose*100:0;
  const history=[...finance.entries].filter(entry=>'symbol' in entry&&entry.symbol===holding.symbol&&typeof entry.date==='string').sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const quoteLabel=holding.quoteVerified===false?'行情待取得':holding.quoteQuality==='official_close'?'官方收盤參考':'實際成交';
  const quoteTime=typeof holding.quoteSourceAt==='number'&&Number.isFinite(holding.quoteSourceAt)&&holding.quoteSourceAt>0?holding.quoteSourceAt:null;
  const sourceTime=quoteTime?new Date(quoteTime).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'尚無';
  const toggleChartData=(key:ChartDataKey)=>setChartData(current=>{
    if(current.includes(key))return current.length===1?current:current.filter(item=>item!==key);
    return [...current,key];
  });

  return <>
  <PageShell
    pageKey="portfolio"
    headerFrameKey="holding-detail-header"
    includeBottomInset
    title={holding.name}
    subtitle={holding.symbol}
    actions={<><PageGearButton onPress={()=>setSettingsOpen(true)}/><Pressable editorId="native:HoldingDetailScreen:backButton:1" style={styles.backButton} onPress={onBack}><Text editorId="native:HoldingDetailScreen:backText:2" editorReadOnly={false} style={styles.backText}>返回</Text></Pressable></>}
  >
    <PageEditorStack pageKey="portfolio" frames={[
      {key:'holding-detail-quote',element:<FrameCard title="即時行情">
      <Text editorId="native:HoldingDetailScreen:price:3" editorReadOnly={true} style={[styles.price,{color:change>0?colors.gain:change<0?colors.loss:colors.flat}]}>{holding.quoteVerified===false?'行情待取得':holding.price.toFixed(2)}</Text>
      <Text editorId="native:HoldingDetailScreen:change:4" editorReadOnly={true} style={[styles.change,{color:change>0?colors.gain:change<0?colors.loss:colors.flat}]}>{holding.quoteVerified===false?'估值待核對':holding.previousCloseKnown===false?'前收待取得':(change>0?'▲':change<0?'▼':'●')+' '+(change>=0?'+':'')+change.toFixed(2)+'　'+(changePct>=0?'+':'')+changePct.toFixed(2)+'%'}</Text>
      <View style={styles.marketMeta}><Text editorId="native:HoldingDetailScreen:meta:5" editorReadOnly={true} style={styles.meta}>前收 {holding.previousCloseKnown===false?'待取得':holding.previousClose.toFixed(2)}</Text><Text editorId="native:HoldingDetailScreen:meta:6" editorReadOnly={true} style={styles.meta}>{quoteLabel}｜來源 {sourceTime}｜v{holding.marketDataVersion??0}</Text></View>
      <View style={styles.chartToolbox}>
        <Text editorId="native:HoldingDetailScreen:chartToolTitle:7" editorReadOnly={false} style={styles.chartToolTitle}>圖表樣式</Text>
        <View style={styles.rangeRow}>{NATIVE_CHART_STYLES.map(item=><Pressable editorId="native:HoldingDetailScreen:rangeChip:8" key={item.id} onPress={()=>setChartStyle(item.id)}
          style={[styles.rangeChip,chartStyle===item.id&&styles.rangeActive]}><Text editorId="native:HoldingDetailScreen:rangeText:9" editorReadOnly={false} style={[styles.rangeText,chartStyle===item.id&&styles.rangeTextActive]}>{item.label}</Text></Pressable>)}</View>
        <Text editorId="native:HoldingDetailScreen:chartToolTitle:10" editorReadOnly={false} style={styles.chartToolTitle}>資料數據（可複選）</Text>
        <View style={styles.rangeRow}>{CHART_DATA_OPTIONS.map(item=><Pressable editorId="native:HoldingDetailScreen:rangeChip:11" key={item.key}
          onPress={()=>toggleChartData(item.key)} style={[styles.rangeChip,chartData.includes(item.key)&&styles.rangeActive]}>
          <Text editorId="native:HoldingDetailScreen:rangeText:12" editorReadOnly={false} style={[styles.rangeText,chartData.includes(item.key)&&styles.rangeTextActive]}>{item.label}</Text></Pressable>)}</View>
      </View>
      <View style={styles.rangeRow}>{HOLDING_CHART_RANGES.map(item=><Pressable editorId="native:HoldingDetailScreen:rangeChip:13" key={item} onPress={()=>setRange(item)} style={[styles.rangeChip,range===item&&styles.rangeActive]}><Text editorId="native:HoldingDetailScreen:rangeText:14" editorReadOnly={true} style={[styles.rangeText,range===item&&styles.rangeTextActive]}>{item}</Text></Pressable>)}</View>
      <OfficialCandleChart candles={candles} loading={historyLoading} error={historyError} rangeLabel={range} dataKeys={chartData} chartStyle={chartStyle}
        crosshairDefault={savedChart.crosshairEnabled} costLineEnabled={savedChart.costLineEnabled}
        holding={{shares:holding.shares,costAvg:holding.costAvg,cumulativeDividend:holding.cumulativeDividend,canonicalPnl:holding.pnl,canonicalComprehensivePnl:holding.comprehensivePnl,canonicalRoi:holding.roi}}/>
      <Text editorId="native:HoldingDetailScreen:rangeHint:15" editorReadOnly={false} style={styles.rangeHint}>資料固定取歷史行情來源；單一月份無資料或暫時失敗不會清空其他月份已取得的歷史交易日。持股圖表預設值可由維護工程師的「圖表工程」編輯清單調整。</Text>
    </FrameCard>},
      {key:'holding-detail-info',element:<FrameCard title="持股資訊">
      <View style={styles.metrics}>
        <MetricTile label="持有股數" value={holding.shares.toLocaleString('zh-TW',{maximumFractionDigits:4})} caption="股"/>
        <MetricTile label="純成交均價" value={holding.tradeAvg.toFixed(2)} caption="不含費"/>
        <MetricTile label="含費成本均價" value={holding.costAvg.toFixed(2)} caption="帳務核心"/>
        <MetricTile label="目前市值" value={holding.quoteVerified===false?'待核對':money(holding.marketValue)} caption="NT$"/>
      </View>
    </FrameCard>},
      ...(isEtfSymbol(holding.symbol)?[{key:'holding-detail-constituents',element:<FrameCard title="ETF 成分股"><EtfConstituentsContent key={holding.symbol} symbol={holding.symbol} name={holding.name}/></FrameCard>}]:[]),
      {key:'holding-detail-pnl',element:<FrameCard title="損益拆解" tone={financialTone(holding.pricePnl,holding.quoteVerified!==false)}>
      <View style={styles.metrics}>
        <MetricTile label="純價差損益" value={holding.quoteVerified===false?'待核對':money(holding.pricePnl)} caption="毛市值－純成交成本" tone={financialTone(holding.pricePnl,holding.quoteVerified!==false)}/>
        <MetricTile label="淨清算未實現" value={holding.quoteVerified===false?'待核對':money(holding.pnl)} caption={(holding.roi>=0?'+':'')+percent(holding.roi)} tone={financialTone(holding.pnl,holding.quoteVerified!==false)}/>
        <MetricTile label="已實現" value={money(holding.realizedPnl)} caption="歷史賣出" tone={financialTone(holding.realizedPnl)}/>
        <MetricTile label="含息總損益" value={holding.quoteVerified===false?'待核對':money(holding.comprehensivePnl)} caption="Canonical" tone={financialTone(holding.comprehensivePnl,holding.quoteVerified!==false)}/>
      </View>
    </FrameCard>},
      {key:'holding-detail-dividend',element:<FrameCard title="股息" tone={financialTone(holding.cumulativeDividend)}>
      <View style={styles.metrics}><MetricTile label="累積淨股息" value={money(holding.cumulativeDividend)} caption="NT$" tone={financialTone(holding.cumulativeDividend)}/><MetricTile label="持股占比" value={finance.valuationComplete?percent(holding.weight):'待核對'} caption="目前組合"/></View>
    </FrameCard>},
      {key:'holding-detail-history',element:<FrameCard title="交易與股息紀錄">
      {history.length?history.slice(0,12).map(entry=><View key={entry.id} style={styles.historyRow}>
        <Text editorId="native:HoldingDetailScreen:historyDate:16" editorReadOnly={true} style={styles.historyDate}>{entry.date.slice(5)}</Text>
        <Text editorId="native:HoldingDetailScreen:historyKind:17" editorReadOnly={true} style={styles.historyKind}>{entry.kind==='buy'?'買進':entry.kind==='sell'?'賣出':entry.kind==='dividend'?'股息':'其他'}</Text>
        <Text editorId="native:HoldingDetailScreen:historyAmount:18" editorReadOnly={true} style={styles.historyAmount}>NT$ {money(ledgerDisplayAmount(entry))}</Text>
      </View>):<Text editorId="native:HoldingDetailScreen:muted:19" editorReadOnly={false} style={styles.muted}>尚無紀錄</Text>}
    </FrameCard>},
      {key:'holding-detail-calculator',element:<FrameCard title="試算入口">
      <Text editorId="native:HoldingDetailScreen:muted:20" editorReadOnly={false} style={styles.muted}>庫存頁右上角「🧮」已接入正式試算核心；試算資料不回寫正式 Ledger。</Text>
    </FrameCard>},
    ]}/>
  </PageShell>
  <PageFrameSettingsModal visible={settingsOpen} pageKey="portfolio" title={'個股資訊 · '+holding.symbol}
    frames={HOLDING_DETAIL_FRAMES} previewQuote={holding} onClose={()=>setSettingsOpen(false)}/>
  </>;
}

const styles=StyleSheet.create({
  backButton:{paddingHorizontal:13,paddingVertical:9,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  backText:{fontWeight:'800',color:colors.primary},
  price:{fontSize:42,fontWeight:'900',fontVariant:['tabular-nums']},
  change:{fontSize:14,fontWeight:'800'},
  marketMeta:{flexDirection:'row',justifyContent:'space-between'},
  meta:{fontSize:10,color:colors.textSecondary},
  chartToolbox:{gap:7,padding:9,borderRadius:10,backgroundColor:colors.surfaceMuted},
  chartToolTitle:{fontSize:10,fontWeight:'900',color:colors.textSecondary},
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
