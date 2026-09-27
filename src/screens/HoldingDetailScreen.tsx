import { useEffect, useState } from 'react';
import { OfficialCandleChart } from '../components/OfficialCandleChart';
import {fetchOfficialDailyHistory,type DailyCandle} from '../market/twseDailyHistory';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { MetricTile } from '../components/MetricTile';
import { PageShell } from '../components/PageShell';
import type { HoldingQuote } from '../domain/uiModels';
import {CHART_DATA_OPTIONS,NATIVE_CHART_STYLES,type ChartDataKey,type NativeChartStyle} from '../domain/chartEditor';
import { ledgerDisplayAmount, useFinance } from '../finance/FinanceRuntime';
import { colors, radius, spacing } from '../theme/tokens';

const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');
const ranges=['1月','3月','1年'] as const;

export function HoldingDetailScreen({holding:initialHolding,onBack}:{holding:HoldingQuote;onBack:()=>void}){
  const finance=useFinance();
  // Detail must subscribe to the current canonical projection, not a stale tapped row.
  const holding=finance.holdings.find(row=>row.symbol===initialHolding.symbol)??initialHolding;
  const [range,setRange]=useState<(typeof ranges)[number]>('1月');
  const [candles,setCandles]=useState<DailyCandle[]>([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historyError,setHistoryError]=useState<string|null>(null);
  const [chartStyle,setChartStyle]=useState<NativeChartStyle>('candlestick');
  const [chartData,setChartData]=useState<ChartDataKey[]>(['open','high','low','close','volume']);
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

  return <PageShell
    title={holding.name}
    subtitle={holding.symbol}
    actions={<Pressable style={styles.backButton} onPress={onBack}><Text style={styles.backText}>返回</Text></Pressable>}
  >
    <FrameCard title="即時行情">
      <Text style={[styles.price,{color:change>0?colors.gain:change<0?colors.loss:colors.flat}]}>{holding.quoteVerified===false?'行情待取得':holding.price.toFixed(2)}</Text>
      <Text style={[styles.change,{color:change>0?colors.gain:change<0?colors.loss:colors.flat}]}>{holding.quoteVerified===false?'估值待核對':holding.previousCloseKnown===false?'前收待取得':(change>0?'▲':change<0?'▼':'●')+' '+(change>=0?'+':'')+change.toFixed(2)+'　'+(changePct>=0?'+':'')+changePct.toFixed(2)+'%'}</Text>
      <View style={styles.marketMeta}><Text style={styles.meta}>前收 {holding.previousCloseKnown===false?'待取得':holding.previousClose.toFixed(2)}</Text><Text style={styles.meta}>{quoteLabel}｜來源 {sourceTime}｜v{holding.marketDataVersion??0}</Text></View>
      <View style={styles.chartToolbox}>
        <Text style={styles.chartToolTitle}>圖表樣式</Text>
        <View style={styles.rangeRow}>{NATIVE_CHART_STYLES.map(item=><Pressable key={item.id} onPress={()=>setChartStyle(item.id)}
          style={[styles.rangeChip,chartStyle===item.id&&styles.rangeActive]}><Text style={[styles.rangeText,chartStyle===item.id&&styles.rangeTextActive]}>{item.label}</Text></Pressable>)}</View>
        <Text style={styles.chartToolTitle}>資料數據（可複選）</Text>
        <View style={styles.rangeRow}>{CHART_DATA_OPTIONS.filter(item=>['open','high','low','close','volume'].includes(item.key)).map(item=><Pressable key={item.key}
          onPress={()=>toggleChartData(item.key)} style={[styles.rangeChip,chartData.includes(item.key)&&styles.rangeActive]}>
          <Text style={[styles.rangeText,chartData.includes(item.key)&&styles.rangeTextActive]}>{item.label}</Text></Pressable>)}</View>
      </View>
      <View style={styles.rangeRow}>{ranges.map(item=><Pressable key={item} onPress={()=>setRange(item)} style={[styles.rangeChip,range===item&&styles.rangeActive]}><Text style={[styles.rangeText,range===item&&styles.rangeTextActive]}>{item}</Text></Pressable>)}</View>
      <OfficialCandleChart candles={candles} loading={historyLoading} error={historyError} rangeLabel={range} dataKeys={chartData} chartStyle={chartStyle}/>
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
