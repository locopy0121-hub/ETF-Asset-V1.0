import {useSystemColors} from '../../theme/useSystemColors';
import {useMemo,useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {summarizeDailyPnl,type DailyPnlRecord,type DailyPnlStats} from '../../finance/dailyPnlHistory';
import {bucketValue,filterPnlRows,pagePnlRows,periodKey,recentPnlPeriods,samplePnlBuckets,sortPnlRows,summarizePeriods,winRate,
  type PnlBucket,type PnlFilter,type PnlMetric,type PnlPageSize,type PnlPeriod,type PnlSort} from '../../finance/dailyPnlAnalytics';
import {colors,radius,spacing} from '../../theme/tokens';

const money=(value:number)=>Math.round(value).toLocaleString('zh-TW');
const signed=(value:number)=>`${value>0?'+':''}${money(value)}`;
const CHART_HEIGHT=196;
const CHART_PADDING_X=12;
type ChartStyle='line'|'area'|'bar';
const PERIOD_OPTIONS:readonly {key:PnlPeriod;label:string}[]=[
  {key:'day',label:'日走勢'},{key:'month',label:'月走勢'},{key:'year',label:'年走勢'},
];
const RANGE_OPTIONS:Record<PnlPeriod,readonly {count:number|'all';label:string}[]>={
  day:[{count:7,label:'7日'},{count:30,label:'30日'},{count:90,label:'90日'},{count:'all',label:'全部'}],
  month:[{count:3,label:'3月'},{count:6,label:'6月'},{count:12,label:'12月'},{count:'all',label:'全部'}],
  year:[{count:3,label:'3年'},{count:5,label:'5年'},{count:'all',label:'全部'}],
};
const METRIC_OPTIONS:readonly {key:PnlMetric;label:string}[]=[
  {key:'dailyPnl',label:'期間損益'},
  {key:'totalPnl',label:'累積總損益'},
  {key:'marketValue',label:'持股市值'},
];
const CHART_OPTIONS:readonly {key:ChartStyle;label:string}[]=[
  {key:'line',label:'折線'},{key:'area',label:'面積'},{key:'bar',label:'柱狀'},
];
const FILTER_OPTIONS:readonly {key:PnlFilter;label:string}[]=[
  {key:'all',label:'全部'},{key:'gain',label:'獲利'},{key:'loss',label:'虧損'},
  {key:'flat',label:'持平'},{key:'official',label:'正式收盤'},
];
const SORT_OPTIONS:readonly {key:PnlSort;label:string}[]=[
  {key:'date',label:'日期'},{key:'dailyPnl',label:'每日損益'},
  {key:'totalPnl',label:'累積損益'},{key:'marketValue',label:'市值'},
];
const PAGE_SIZES:readonly PnlPageSize[]=[10,20,50];

export function DailyPnlHistoryModal({visible,onClose,records,stats,historyLoading=false,historyError=null,historyStartDate=null}:{
  visible:boolean;
  onClose:()=>void;
  records:readonly DailyPnlRecord[];
  stats:DailyPnlStats;
  historyLoading?:boolean;
  historyError?:string|null;
  historyStartDate?:string|null;
}){
  const colors=useSystemColors();
  const tone=(value:number)=>value>0?colors.gain:value<0?colors.loss:colors.flat;
  const [period,setPeriod]=useState<PnlPeriod>('day');
  const [periodCount,setPeriodCount]=useState<number|'all'>(30);
  const [metric,setMetric]=useState<PnlMetric>('dailyPnl');
  const [chartStyle,setChartStyle]=useState<ChartStyle>('line');
  const [sort,setSort]=useState<PnlSort>('date');
  const [ascending,setAscending]=useState(false);
  const [filter,setFilter]=useState<PnlFilter>('all');
  const [pageSize,setPageSize]=useState<PnlPageSize>(20);
  const [page,setPage]=useState(0);
  const [plotWidth,setPlotWidth]=useState(320);
  const [selectedDate,setSelectedDate]=useState<string|null>(null);

  const chronological=useMemo(()=>[...records].sort((a,b)=>a.date.localeCompare(b.date)),[records]);
  const grouped=useMemo(()=>summarizePeriods(chronological,period),[chronological,period]);
  const chartPeriods=useMemo(()=>recentPnlPeriods(grouped,periodCount),[grouped,periodCount]);
  const ranged=useMemo(()=>{
    if(!chartPeriods.length)return [];
    const from=chartPeriods[0]!.startDate,to=chartPeriods[chartPeriods.length-1]!.endDate;
    return chronological.filter(row=>row.date>=from&&row.date<=to);
  },[chronological,chartPeriods]);
  const rangeStats=periodCount==='all'?stats:summarizeDailyPnl(ranged);
  const ordered=useMemo(()=>sortPnlRows(filterPnlRows(ranged,filter),sort,ascending),
    [ranged,filter,sort,ascending]);
  const pageState=pagePnlRows(ordered,page,pageSize);
  const {rows:pageRows,page:safePage,pageCount}=pageState;
  const chartRows=useMemo(()=>samplePnlBuckets(chartPeriods,metric),[chartPeriods,metric]);
  const latest=ranged[ranged.length-1]??null;
  const selected=ranged.find(row=>row.date===selectedDate)??latest;
  const selectedBucket=chartPeriods.find(row=>row.key===periodKey(selected?.date??'',period))??
    chartPeriods[chartPeriods.length-1]??null;
  const monthly=useMemo(()=>summarizePeriods(ranged,'month').reverse(),[ranged]);
  const win=winRate(rangeStats.gainDays,rangeStats.lossDays);

  const values=chartRows.map(bucket=>bucketValue(bucket,metric));
  const baseline=metric==='marketValue'?(values[0]??0):0;
  const rawMin=Math.min(baseline,...values);
  const rawMax=Math.max(baseline,...values);
  const rawRange=Math.max(1,rawMax-rawMin);
  const min=rawMin-rawRange*0.08;
  const max=rawMax+rawRange*0.08;
  const valueRange=Math.max(1,max-min);
  const innerWidth=Math.max(40,plotWidth-CHART_PADDING_X*2);
  const x=(index:number)=>CHART_PADDING_X+(chartRows.length<=1?innerWidth/2:index/(chartRows.length-1)*innerWidth);
  const y=(value:number)=>12+(max-value)/valueRange*(CHART_HEIGHT-38);
  const points=chartRows.map((bucket,index)=>({
    bucket,value:bucketValue(bucket,metric),x:x(index),y:y(bucketValue(bucket,metric)),
  }));
  const baselineY=y(baseline);
  const selectedPoint=points.find(point=>point.bucket.key===selectedBucket?.key)??null;
  const changePeriod=(next:PnlPeriod)=>{
    setPeriod(next);setPeriodCount(next==='day'?30:next==='month'?12:'all');
    setPage(0);setSelectedDate(null);
  };
  const changeCount=(next:number|'all')=>{
    setPeriodCount(next);setPage(0);setSelectedDate(null);
  };
  const updateSort=(key:PnlSort)=>{setSort(key);setAscending(value=>key===sort?!value:false);setPage(0);};
  const updateFilter=(next:PnlFilter)=>{setFilter(next);setPage(0);};


  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{flex:1}}>
          <Text style={styles.title}>每日損益統計中心</Text>
          <Text style={styles.subtitle}>日／月／年真實損益起伏 · 正式收盤紀錄 · 逐筆查詢</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="關閉每日損益統計" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>關閉</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {historyLoading?<View style={styles.notice}><Text style={styles.noticeText}>
          正在從 {historyStartDate??'第一筆交易日'} 重建正式歷史收盤資料…
        </Text></View>:null}
        {historyError?<View style={[styles.notice,styles.noticeError]}><Text style={styles.noticeText}>
          歷史資料未完整：{historyError}。以下保留已有有效紀錄。
        </Text></View>:null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>期間統計總覽</Text>
          <View style={styles.statsGrid}>
            <Stat label="最新累積總損益" value={latest?signed(latest.totalPnl):'—'}
              valueColor={latest?tone(latest.totalPnl):undefined}/>
            <Stat label="期間每日損益合計" value={ranged.length?signed(rangeStats.periodPnl):'—'}
              valueColor={ranged.length?tone(rangeStats.periodPnl):undefined}/>
            <Stat label="獲利／虧損／持平日" value={`${rangeStats.gainDays}／${rangeStats.lossDays}／${rangeStats.flatDays}`}/>
            <Stat label="獲利勝率" value={win===null?'—':win.toFixed(1)+'%'}/>
            <Stat label="平均每日損益" value={ranged.length?signed(rangeStats.averageDailyPnl):'—'}
              valueColor={ranged.length?tone(rangeStats.averageDailyPnl):undefined}/>
            <Stat label="最佳單日" value={rangeStats.best?signed(rangeStats.best.todayPnl):'—'}
              valueColor={rangeStats.best?tone(rangeStats.best.todayPnl):undefined}/>
            <Stat label="最差單日" value={rangeStats.worst?signed(rangeStats.worst.todayPnl):'—'}
              valueColor={rangeStats.worst?tone(rangeStats.worst.todayPnl):undefined}/>
            <Stat label="最新持股市值" value={latest?money(latest.totalMarketValue):'—'}/>
          </View>
          <Text style={styles.tableHint}>勝率僅以獲利與虧損日計算；每日損益已扣除買賣本金流量，不等於市值直接增減。</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>損益走勢 · 日／月／年</Text>
            <Text style={styles.chartHint}>紅色獲利 · 綠色虧損</Text>
          </View>
          <View style={styles.controlRow}>
            {PERIOD_OPTIONS.map(option=><Pressable key={option.key} accessibilityRole="button"
              accessibilityLabel={option.label} accessibilityState={{selected:period===option.key}}
              onPress={()=>changePeriod(option.key)}
              style={[styles.controlChip,period===option.key&&styles.controlChipActive]}>
              <Text style={[styles.controlText,period===option.key&&styles.controlTextActive]}>{option.label}</Text>
            </Pressable>)}
          </View>
          <View style={styles.controlRow}>
            {RANGE_OPTIONS[period].map(option=><Pressable key={String(option.count)}
              accessibilityRole="button" onPress={()=>changeCount(option.count)}
              style={[styles.rangeChip,periodCount===option.count&&styles.controlChipActive]}>
              <Text style={[styles.controlText,periodCount===option.count&&styles.controlTextActive]}>{option.label}</Text>
            </Pressable>)}
          </View>
          <View style={styles.controlRow}>
            {METRIC_OPTIONS.map(option=><Pressable key={option.key} accessibilityRole="button"
              onPress={()=>setMetric(option.key)}
              style={[styles.controlChip,metric===option.key&&styles.controlChipActive]}>
              <Text style={[styles.controlText,metric===option.key&&styles.controlTextActive]}>{option.label}</Text>
            </Pressable>)}
          </View>
          <View style={styles.controlRow}>
            {CHART_OPTIONS.map(option=><Pressable key={option.key} accessibilityRole="button"
              onPress={()=>setChartStyle(option.key)}
              style={[styles.rangeChip,chartStyle===option.key&&styles.controlChipActive]}>
              <Text style={[styles.controlText,chartStyle===option.key&&styles.controlTextActive]}>{option.label}</Text>
            </Pressable>)}
          </View>
          <View style={styles.chartCard}>
            <View style={styles.chartValueRow}>
              <View style={{flexShrink:1}}>
                <Text style={styles.chartMetricLabel}>{METRIC_OPTIONS.find(option=>option.key===metric)?.label}（{PERIOD_OPTIONS.find(option=>option.key===period)?.label}）</Text>
                <Text style={[styles.chartMetricValue,selectedBucket&&metric!=='marketValue'?{color:tone(bucketValue(selectedBucket,metric))}:undefined]}>
                  {selectedBucket?(metric==='marketValue'?money(selectedBucket.lastMarketValue):signed(bucketValue(selectedBucket,metric))):'—'}
                </Text>
              </View>
              <View style={styles.chartDateWrap}>
                <Text style={styles.chartDate}>{selectedBucket?.label??'—'}</Text>
                <Text style={styles.chartStatus}>{selectedBucket?
                  `${selectedBucket.days} 日 · ${selectedBucket.estimatedDays?'含暫估':'正式'}`:'尚無紀錄'}</Text>
              </View>
            </View>
            <View onLayout={event=>{
              const width=Math.floor(event.nativeEvent.layout.width);
              if(width>0&&width!==plotWidth)setPlotWidth(width);
            }} style={styles.plot}>
              {points.length?[<>
                {[0.25,0.5,0.75].map(ratio=><View key={ratio} pointerEvents="none"
                  style={[styles.gridLine,{top:12+ratio*(CHART_HEIGHT-38)}]}/>)}
                <View pointerEvents="none" style={[styles.baseline,{top:baselineY}]}/>
                {chartStyle!=='line'&&points.map((point,index)=>{
                  const segmentTone=metric==='marketValue'
                    ?point.value-(points[index-1]?.value??point.value):point.value;
                  const top=Math.min(point.y,baselineY),height=Math.max(2,Math.abs(point.y-baselineY));
                  const barWidth=chartStyle==='bar'
                    ?Math.max(3,Math.min(20,innerWidth/Math.max(2,points.length)*0.65))
                    :Math.max(3,innerWidth/Math.max(1,points.length-1));
                  return <View key={'column-'+point.bucket.key} pointerEvents="none" style={{
                    position:'absolute',left:point.x-barWidth/2,top,width:barWidth,height,
                    borderRadius:chartStyle==='bar'?3:0,opacity:chartStyle==='area'?0.22:0.88,
                    backgroundColor:tone(segmentTone),
                  }}/>;
                })}
                {chartStyle!=='bar'&&points.slice(1).map((point,index)=>{
                  const prior=points[index]!;
                  const dx=point.x-prior.x,dy=point.y-prior.y;
                  const length=Math.max(1,Math.hypot(dx,dy));
                  const angle=Math.atan2(dy,dx);
                  const direction=metric==='marketValue'?point.value-prior.value:point.value;
                  return <View key={'seg-'+point.bucket.key} pointerEvents="none" style={{
                    position:'absolute',left:(prior.x+point.x)/2-length/2,
                    top:(prior.y+point.y)/2-1,width:length,height:2,borderRadius:1,
                    backgroundColor:tone(direction),transform:[{rotateZ:angle+'rad'}],
                  }}/>;
                })}
                {selectedPoint?<View pointerEvents="none" style={[styles.selectionLine,{left:selectedPoint.x}]}/>:null}
                {selectedPoint?<View pointerEvents="none" style={[styles.selectionDot,{
                  left:selectedPoint.x-4,top:selectedPoint.y-4,
                  backgroundColor:tone(metric==='marketValue'?selectedPoint.bucket.periodPnl:selectedPoint.value),
                }]}/>:null}
                {points.length===1?<View pointerEvents="none" style={[styles.selectionDot,{
                  left:points[0]!.x-4,top:points[0]!.y-4,
                  backgroundColor:tone(points[0]!.bucket.periodPnl),
                }]}/>:null}
                {points.map((point,index)=>{
                  const nextX=points[index+1]?.x??plotWidth-CHART_PADDING_X;
                  const prevX=points[index-1]?.x??CHART_PADDING_X;
                  const hitWidth=Math.max(10,(nextX-prevX)/2);
                  return <Pressable key={'hit-'+point.bucket.key} accessibilityRole="button"
                    accessibilityLabel={`${point.bucket.label} ${METRIC_OPTIONS.find(o=>o.key===metric)?.label} ${money(point.value)}`}
                    onPress={()=>setSelectedDate(point.bucket.endDate)}
                    style={{position:'absolute',left:Math.max(0,point.x-hitWidth/2),
                      top:0,width:hitWidth,height:CHART_HEIGHT}}/>;
                })}
                <Text pointerEvents="none" style={[styles.axisLabel,{top:4}]}>
                  {metric==='marketValue'?money(rawMax):signed(rawMax)}
                </Text>
                <Text pointerEvents="none" style={[styles.axisLabel,{bottom:4}]}>
                  {metric==='marketValue'?money(rawMin):signed(rawMin)}
                </Text>
              </>]:<View style={styles.plotEmpty}><Text style={styles.empty}>尚無可繪製的日／月／年損益紀錄。</Text></View>}
            </View>
            <View style={styles.chartFoot}>
              <Text style={styles.chartFootText}>{chartRows[0]?.label??'—'}</Text>
              <Text style={styles.chartFootText}>{chartPeriods.length>120?'已抽樣繪圖 · 統計保留全數':''}</Text>
              <Text style={styles.chartFootText}>{chartRows[chartRows.length-1]?.label??'—'}</Text>
            </View>
          </View>
          <Text style={styles.tableHint}>日：逐交易日；月／年：期間每日損益合計，累積損益與市值使用該期間最後一筆估值。點選圖形可查看對應日期。</Text>
        </View>

        {selected?<View style={styles.detailCard}>
          <View style={styles.detailHead}>
            <Text style={styles.detailTitle}>{selected.date} 損益明細</Text>
            <Text style={[styles.detailTotal,{color:tone(selected.todayPnl)}]}>{signed(selected.todayPnl)}</Text>
          </View>
          <Text style={styles.meta}>前次累積損益 {signed(selected.previousTotalPnl)} · 當日累積總損益 {signed(selected.totalPnl)}</Text>
          <Text style={styles.detailFormula}>前次累積 {signed(selected.previousTotalPnl)} ＋ 當日 {signed(selected.todayPnl)}
            {' '}＋ 帳務調整 {signed(selected.accountingAdjustment)} ＝ 累積 {signed(selected.totalPnl)}</Text>
          <Text style={styles.meta}>前次持股市值 {money(selected.previousMarketValue)} → 當日 {money(selected.totalMarketValue)}
            {selected.tradeMarketFlow!==0?` · 交易本金流 ${signed(selected.tradeMarketFlow)}`:''}
            {' · '}{selected.basis==='official-history'?'正式歷史收盤':'即時／前收估值'}
          </Text>
        </View>:null}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>每日損益紀錄</Text>
            <Text style={styles.chartHint}>共 {ordered.length} 筆</Text>
          </View>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>每頁</Text>
            {PAGE_SIZES.map(size=><Pressable key={size} accessibilityRole="button"
              accessibilityLabel={`每頁顯示 ${size} 筆`} onPress={()=>{setPageSize(size);setPage(0);}}
              style={[styles.rangeChip,pageSize===size&&styles.controlChipActive]}>
              <Text style={[styles.controlText,pageSize===size&&styles.controlTextActive]}>{size}</Text>
            </Pressable>)}
            <Text style={styles.pageInfo}>第 {safePage+1}／{pageCount} 頁</Text>
          </View>
          <View style={styles.controlRow}>
            {FILTER_OPTIONS.map(option=><Pressable key={option.key} accessibilityRole="button"
              onPress={()=>updateFilter(option.key)} style={[styles.rangeChip,filter===option.key&&styles.controlChipActive]}>
              <Text style={[styles.controlText,filter===option.key&&styles.controlTextActive]}>{option.label}</Text>
            </Pressable>)}
          </View>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>排序</Text>
            {SORT_OPTIONS.map(option=><Pressable key={option.key} accessibilityRole="button"
              onPress={()=>updateSort(option.key)}
              style={[styles.rangeChip,sort===option.key&&styles.controlChipActive]}>
              <Text style={[styles.controlText,sort===option.key&&styles.controlTextActive]}>
                {option.label}{sort===option.key?(ascending?' ↑':' ↓'):''}
              </Text>
            </Pressable>)}
          </View>
          {pageRows.length?pageRows.map(row=><Pressable key={row.date} accessibilityRole="button"
            accessibilityLabel={`${row.date} 每日損益 ${signed(row.todayPnl)}`}
            onPress={()=>setSelectedDate(row.date)}
            style={[styles.recordCard,selectedDate===row.date&&styles.recordCardSelected]}>
            <View style={{flex:1,gap:4}}>
              <Text style={styles.recordDate}>{row.date}</Text>
              <Text style={styles.recordMeta}>{row.basis==='official-history'?'正式收盤':'暫估'} · 累積 {signed(row.totalPnl)}</Text>
              <Text style={styles.recordMeta}>本金流 {signed(row.tradeMarketFlow)} · 帳務調整 {signed(row.accountingAdjustment)}</Text>
            </View>
            <View style={{alignItems:'flex-end',gap:4}}>
              <Text style={styles.recordMeta}>市值 {money(row.totalMarketValue)}</Text>
              <Text style={[styles.recordPnl,{color:tone(row.todayPnl)}]}>{signed(row.todayPnl)}</Text>
              <Text style={styles.recordDetailHint}>點選查看明細 ›</Text>
            </View>
          </Pressable>):<Text style={styles.empty}>目前沒有符合條件的每日紀錄。</Text>}
          <View style={styles.pagination}>
            <Pressable disabled={safePage<=0} onPress={()=>setPage(value=>Math.max(0,value-1))}
              style={[styles.pageButton,safePage<=0&&styles.pageButtonDisabled]}>
              <Text style={styles.pageText}>‹ 上一頁</Text>
            </Pressable>
            <Text style={styles.pageInfo}>第 {safePage+1}／{pageCount} 頁 · 共 {ordered.length} 筆</Text>
            <Pressable disabled={safePage>=pageCount-1}
              onPress={()=>setPage(value=>Math.min(pageCount-1,value+1))}
              style={[styles.pageButton,safePage>=pageCount-1&&styles.pageButtonDisabled]}>
              <Text style={styles.pageText}>下一頁 ›</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>月度損益摘要</Text>
          <Text style={styles.tableHint}>依當前圖表日期範圍彙整；若日期範圍跨越部分月份，僅統計範圍內已取得的交易日。</Text>
          {monthly.length?monthly.map(bucket=><View key={bucket.key} style={styles.monthCard}>
            <View style={{flex:1,gap:5}}>
              <Text style={styles.monthTitle}>{bucket.label} · {bucket.days} 筆</Text>
              <Text style={styles.recordMeta}>平均日損益 {signed(bucket.averageDailyPnl)}</Text>
              <Text style={styles.recordMeta}>獲利／虧損／持平 {bucket.gainDays}／{bucket.lossDays}／{bucket.flatDays}
                {' · '}勝率 {winRate(bucket.gainDays,bucket.lossDays)?.toFixed(1)??'—'}%</Text>
              <Text style={styles.recordMeta}>最佳 {bucket.best?.date??'—'} {bucket.best?signed(bucket.best.todayPnl):'—'}
                {' · '}最差 {bucket.worst?.date??'—'} {bucket.worst?signed(bucket.worst.todayPnl):'—'}</Text>
              <Text style={styles.recordMeta}>{bucket.estimatedDays?'含暫估行情':'正式紀錄'} · 月末累積 {signed(bucket.lastTotalPnl)}</Text>
            </View>
            <Text style={[styles.monthPnl,{color:tone(bucket.periodPnl)}]}>{signed(bucket.periodPnl)}</Text>
          </View>):<Text style={styles.empty}>取得正式歷史資料後顯示月度摘要。</Text>}
        </View>
      </ScrollView>
    </View>
  </Modal>;
}

function Stat({label,value,valueColor}:{label:string;value:string;valueColor?:string}){
  return <View style={styles.stat}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text numberOfLines={2} style={[styles.statValue,valueColor?{color:valueColor}:undefined]}>{value}</Text>
  </View>;
}

function Cell({text,width,header=false,right=false,strong=false,color}:{text:string;width:number;header?:boolean;right?:boolean;strong?:boolean;color?:string}){
  return <Text numberOfLines={1} style={[
    styles.cell,{width,textAlign:right?'right':'left'},
    header&&styles.cellHeader,strong&&styles.cellStrong,color?{color}:undefined,
  ]}>{text}</Text>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background,paddingTop:spacing.lg},
  header:{flexDirection:'row',alignItems:'flex-start',gap:spacing.md,paddingHorizontal:spacing.lg,paddingVertical:spacing.md,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  title:{fontSize:24,fontWeight:'900',color:colors.text},
  subtitle:{fontSize:11,lineHeight:17,color:colors.textSecondary,marginTop:4},
  close:{minHeight:44,justifyContent:'center',paddingHorizontal:14,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  closeText:{fontSize:12,fontWeight:'900',color:colors.primary},
  scroll:{padding:spacing.lg,gap:spacing.lg,paddingBottom:40},
  notice:{padding:spacing.md,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},
  noticeError:{borderColor:colors.warning},
  noticeText:{fontSize:11,lineHeight:17,color:colors.textSecondary,fontWeight:'700'},
  statsGrid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},
  stat:{width:'48%',minHeight:76,padding:spacing.md,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  statLabel:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  statValue:{fontSize:17,lineHeight:23,fontWeight:'900',color:colors.text,marginTop:6,fontVariant:['tabular-nums']},
  section:{gap:spacing.sm},
  sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},
  sectionTitle:{fontSize:16,fontWeight:'900',color:colors.text},
  chartHint:{fontSize:9,color:colors.textSecondary},
  controlRow:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  controlChip:{minHeight:34,justifyContent:'center',paddingHorizontal:12,borderRadius:radius.pill,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  rangeChip:{minHeight:31,justifyContent:'center',paddingHorizontal:11,borderRadius:radius.pill,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  controlChipActive:{borderColor:colors.primary,backgroundColor:colors.surfaceMuted},
  controlText:{fontSize:11,fontWeight:'800',color:colors.textSecondary},
  controlTextActive:{color:colors.primary},
  chartCard:{padding:spacing.md,borderRadius:radius.md,backgroundColor:'#0B0F14',borderWidth:1,borderColor:'#29313A'},
  chartValueRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4},
  chartMetricLabel:{fontSize:10,fontWeight:'800',color:'#94A3B8'},
  chartMetricValue:{fontSize:26,lineHeight:32,fontWeight:'900',color:'#F8FAFC',fontVariant:['tabular-nums']},
  chartDateWrap:{alignItems:'flex-end'},
  chartDate:{fontSize:12,fontWeight:'900',color:'#E2E8F0'},
  chartStatus:{fontSize:9,color:'#94A3B8',marginTop:3},
  plot:{height:CHART_HEIGHT,position:'relative',overflow:'hidden'},
  plotEmpty:{height:CHART_HEIGHT,alignItems:'center',justifyContent:'center'},
  gridLine:{position:'absolute',left:0,right:0,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#26313C'},
  baseline:{position:'absolute',left:0,right:0,borderTopWidth:1,borderStyle:'dashed',borderTopColor:'#64748B'},
  selectionLine:{position:'absolute',top:0,bottom:0,width:1,backgroundColor:'#CBD5E1',opacity:.45},
  selectionDot:{position:'absolute',width:8,height:8,borderRadius:4,borderWidth:2,borderColor:'#0B0F14'},
  axisLabel:{position:'absolute',left:2,fontSize:8,fontWeight:'800',color:'#64748B'},
  chartFoot:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},
  chartFootText:{fontSize:8,color:'#64748B'},
  detailCard:{padding:spacing.md,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,gap:6},
  detailHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},
  detailTitle:{fontSize:13,fontWeight:'900',color:colors.text},
  detailTotal:{fontSize:12,fontWeight:'900',fontVariant:['tabular-nums']},
  detailFormula:{fontSize:11,lineHeight:18,color:colors.text},
  meta:{fontSize:10,lineHeight:15,color:colors.textSecondary},
  tableHint:{fontSize:10,lineHeight:15,color:colors.textSecondary},
  sortButton:{minHeight:32,justifyContent:'center',paddingHorizontal:10,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  sortText:{fontSize:10,fontWeight:'900',color:colors.primary},
  tableShell:{flexDirection:'row',borderWidth:1,borderColor:colors.border,borderRadius:radius.md,overflow:'hidden',backgroundColor:colors.surface},
  fixedColumn:{width:98,borderRightWidth:1,borderRightColor:colors.border,backgroundColor:colors.surface,zIndex:2},
  tableScroller:{flex:1},
  tableBody:{minWidth:826,backgroundColor:colors.surface},
  tableRow:{flexDirection:'row',minHeight:42,alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  tableHeader:{minHeight:38,backgroundColor:colors.surfaceMuted},
  tableRowSelected:{backgroundColor:colors.surfaceMuted},
  cell:{paddingHorizontal:8,fontSize:10,color:colors.text,fontVariant:['tabular-nums']},
  cellHeader:{fontSize:9,fontWeight:'900',color:colors.textSecondary},
  cellStrong:{fontWeight:'900'},
  pagination:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},
  pageButton:{minHeight:36,justifyContent:'center',paddingHorizontal:14,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  pageButtonDisabled:{opacity:.35},
  pageText:{fontSize:10,fontWeight:'900',color:colors.primary},
  pageInfo:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  recordCard:{flexDirection:'row',alignItems:'center',gap:12,minHeight:84,
    backgroundColor:colors.surface,padding:12,borderWidth:1,borderColor:colors.border,
    borderRadius:radius.md},
  recordCardSelected:{borderColor:colors.primary,backgroundColor:colors.surfaceMuted},
  recordDate:{fontSize:12,fontWeight:'900',color:colors.text},
  recordMeta:{fontSize:9,lineHeight:14,color:colors.textSecondary},
  recordPnl:{fontSize:18,fontWeight:'900',fontVariant:['tabular-nums']},
  recordDetailHint:{fontSize:9,color:colors.primary,fontWeight:'800'},
  controlLabel:{fontSize:10,color:colors.textSecondary,fontWeight:'800',alignSelf:'center'},
  monthCard:{flexDirection:'row',gap:12,alignItems:'flex-start',
    borderRadius:radius.md,borderColor:colors.border,borderWidth:1,
    padding:12,backgroundColor:colors.surface},
  monthTitle:{fontSize:12,fontWeight:'900',color:colors.text},
  monthPnl:{fontSize:15,fontWeight:'900',fontVariant:['tabular-nums']},
  empty:{fontSize:12,lineHeight:18,color:colors.textSecondary,paddingVertical:spacing.md},
});
