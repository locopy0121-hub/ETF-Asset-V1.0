import { useEffect, useState } from 'react';
import { HoldingChartPanel } from '../components/HoldingChartPanel';
import {DEFAULT_CHART_DATA,validChartFields,type ChartDataField,type ChartRender} from '../domain/chartDataSelection';
import {InspectableTarget} from '../maintenance/InspectableTarget';
import {TARGET_APPEARANCE,type FrameMaintenanceContext,type InspectedTarget} from '../maintenance/inspectionModel';
import {WorkspaceSurface} from '../maintenance/WorkspaceSurface';
import {useMaintenance} from '../maintenance/MaintenanceRuntime';
import {usePageEditor} from '../editor/pageEditor';
import type {MainPageKey} from '../domain/pageRegistry';
import {fetchOfficialDailyHistory,type DailyCandle} from '../market/twseDailyHistory';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { MetricTile } from '../components/MetricTile';
import { PageShell } from '../components/PageShell';
import type { HoldingQuote } from '../domain/uiModels';
import { ledgerDisplayAmount, useFinance } from '../finance/FinanceRuntime';
import { colors, radius, spacing } from '../theme/tokens';

const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');
const ranges=['1月','3月','1年'] as const;

export function HoldingDetailScreen({holding:initialHolding,onBack,sourcePage='home'}:{holding:HoldingQuote;onBack:()=>void;sourcePage?:MainPageKey}){
  const engineer=useMaintenance();
  const editor=usePageEditor(sourcePage);
  const chartFrameKey=sourcePage==='portfolio'?'holding-view':'holding-quotes';
  const frame:FrameMaintenanceContext={page:sourcePage,frameKey:chartFrameKey,frameTitle:'持股詳情圖表',
    frameConfig:editor.config[chartFrameKey]!,displayConfig:editor.displayConfig};
  const chartTarget:InspectedTarget={id:'holding-chart:'+initialHolding.symbol,kind:'generic',label:'持股詳情圖表',
    page:sourcePage,frameKey:chartFrameKey,frameTitle:'持股詳情圖表',
    properties:[{name:'ETF 代號',value:initialHolding.symbol,readOnly:true},{name:'歷史行情來源',value:'TWSE 官方日資料',readOnly:true},
      {name:'資料選擇',value:'OHLC／收盤價／成交量／持股成本／市值／損益／股息',readOnly:true}],
    base:{...TARGET_APPEARANCE,padding:0,backgroundOpacity:0,backgroundColor:'#FFFFFF',chartSeries:DEFAULT_CHART_DATA,chartRender:'candles'}};
  const [localSeries,setLocalSeries]=useState<ChartDataField[]>([...DEFAULT_CHART_DATA]);
  const [localRender,setLocalRender]=useState<ChartRender>('candles');
  const finance=useFinance();
  // Detail must subscribe to the current canonical projection, not a stale tapped row.
  const holding=finance.holdings.find(row=>row.symbol===initialHolding.symbol)??initialHolding;
  const [range,setRange]=useState<(typeof ranges)[number]>('1月');
  const [candles,setCandles]=useState<DailyCandle[]>([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historyError,setHistoryError]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;
    const abort=new AbortController();
    setHistoryLoading(true);
    setHistoryError(null);
    setCandles([]);
    fetchOfficialDailyHistory(holding.symbol,range==='1月'?1:range==='3月'?3:12,new Date(),abort.signal)
      .then(rows=>{if(active)setCandles(rows);})
      .catch(error=>{if(active)setHistoryError(error instanceof Error?error.message:'官方歷史行情不可用');})
      .finally(()=>{if(active)setHistoryLoading(false);});
    return()=>{active=false;abort.abort();};
  },[holding.symbol,range]);
  const change=holding.price-holding.previousClose;
  const changePct=holding.previousClose>0?change/holding.previousClose*100:0;
  const history=[...finance.entries].filter(entry=>'symbol' in entry&&entry.symbol===holding.symbol).sort((a,b)=>b.date.localeCompare(a.date));
  const quoteLabel=holding.quoteVerified===false?'行情待取得':holding.quoteQuality==='official_close'?'官方收盤參考':'實際成交';
  const sourceTime=holding.quoteSourceAt?new Date(holding.quoteSourceAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'尚無';

  return <PageShell
    pageKey={sourcePage}
    title={holding.name}
    subtitle={holding.symbol}
    actions={<Pressable style={styles.backButton} onPress={onBack}><Text style={styles.backText}>返回</Text></Pressable>}
  >
    <FrameCard title="即時行情">
      <Text style={[styles.price,{color:change>0?colors.gain:change<0?colors.loss:colors.flat}]}>{holding.quoteVerified===false?'行情待取得':holding.price.toFixed(2)}</Text>
      <Text style={[styles.change,{color:change>0?colors.gain:change<0?colors.loss:colors.flat}]}>{holding.quoteVerified===false?'估值待核對':holding.previousCloseKnown===false?'前收待取得':(change>0?'▲':change<0?'▼':'●')+' '+(change>=0?'+':'')+change.toFixed(2)+'　'+(changePct>=0?'+':'')+changePct.toFixed(2)+'%'}</Text>
      <View style={styles.marketMeta}><Text style={styles.meta}>前收 {holding.previousCloseKnown===false?'待取得':holding.previousClose.toFixed(2)}</Text><Text style={styles.meta}>{quoteLabel}｜來源 {sourceTime}｜v{holding.marketDataVersion??0}</Text></View>
      <View style={styles.rangeRow}>{ranges.map(item=><Pressable key={item} onPress={()=>setRange(item)} style={[styles.rangeChip,range===item&&styles.rangeActive]}><Text style={[styles.rangeText,range===item&&styles.rangeTextActive]}>{item}</Text></Pressable>)}</View>
      <WorkspaceSurface config={engineer.getWorkspace(sourcePage,chartFrameKey)} active={engineer.enabled}
        onBounds={bounds=>engineer.reportWorkspaceBounds(sourcePage,chartFrameKey,bounds)}>
        <InspectableTarget target={chartTarget} frame={frame}>{(appearance,customized,override)=>
          <View style={customized?{padding:appearance.padding,borderColor:appearance.borderColor,
            borderWidth:appearance.borderWidth,borderRadius:appearance.borderRadius}:undefined}>
            <HoldingChartPanel holding={holding} candles={candles} loading={historyLoading} error={historyError}
              rangeLabel={range} selected={override.chartSeries?validChartFields(override.chartSeries):localSeries}
              onSelected={setLocalSeries} renderMode={override.chartRender??localRender} onRenderMode={setLocalRender}/>
          </View>}
        </InspectableTarget>
      </WorkspaceSurface>
      <Text style={styles.rangeHint}>目前支援臺灣證交所官方日 K。週線／分時線與上櫃 ETF 在有可信來源前不顯示示意圖。</Text>
    </FrameCard>

    <FrameCard title="持股資訊">
      <View style={styles.metrics}>
        <MetricTile label="持有股數" value={money(holding.shares)} caption="股"/>
        <MetricTile label="純成交均價" value={holding.tradeAvg.toFixed(2)} caption="不含費"/>
        <MetricTile label="含費成本均價" value={holding.costAvg.toFixed(2)} caption="帳務核心"/>
        <MetricTile label="目前市值" value={holding.quoteVerified===false?'待核對':money(holding.marketValue)} caption="NT$"/>
      </View>
    </FrameCard>

    <FrameCard title="損益拆解">
      <View style={styles.metrics}>
        <MetricTile label="純價差損益" value={holding.quoteVerified===false?'待核對':money(holding.pricePnl)} caption="毛市值－純成交成本" tone={holding.pricePnl>=0?'gain':'loss'}/>
        <MetricTile label="淨清算未實現" value={holding.quoteVerified===false?'待核對':money(holding.pnl)} caption={(holding.roi>=0?'+':'')+holding.roi.toFixed(2)+'%'} tone={holding.pnl>=0?'gain':'loss'}/>
        <MetricTile label="已實現" value={money(holding.realizedPnl)} caption="歷史賣出" tone={holding.realizedPnl>=0?'gain':'loss'}/>
        <MetricTile label="含息總損益" value={holding.quoteVerified===false?'待核對':money(holding.comprehensivePnl)} caption="Canonical" tone={holding.comprehensivePnl>=0?'gain':'loss'}/>
      </View>
    </FrameCard>

    <FrameCard title="股息">
      <View style={styles.metrics}><MetricTile label="累積淨股息" value={money(holding.cumulativeDividend)} caption="NT$" tone="gain"/><MetricTile label="持股占比" value={finance.valuationComplete?holding.weight.toFixed(1)+'%':'待核對'} caption="目前組合"/></View>
    </FrameCard>

    <FrameCard title="交易與股息紀錄">
      {history.length?history.slice(0,12).map(entry=><View key={entry.id} style={styles.historyRow}>
        <Text style={styles.historyDate}>{entry.date.slice(5)}</Text>
        <Text style={styles.historyKind}>{entry.kind==='buy'?'買進':entry.kind==='sell'?'賣出':entry.kind==='dividend'?'股息':'其他'}</Text>
        <Text style={styles.historyAmount}>NT$ {money(ledgerDisplayAmount(entry))}</Text>
      </View>):<Text style={styles.muted}>尚無紀錄</Text>}
    </FrameCard>

    <FrameCard title="試算入口">
      <Text style={styles.muted}>庫存頁右上角「🧮」已接入正式試算核心；試算資料不回寫正式 Ledger。</Text>
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
