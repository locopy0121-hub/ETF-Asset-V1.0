import {useMemo,useState} from 'react';
import {StyleSheet,View} from 'react-native';
import {Pressable,Text} from '../EditableNative';
import {useSystemColors} from '../../theme/useSystemColors';
import type {DailyPnlRecord} from '../../finance/dailyPnlHistory';
import {summarizeDailyPnl} from '../../finance/dailyPnlHistory';
import {bucketValue,filterPnlRows,pagePnlRows,periodKey,recentPnlPeriods,
  samplePnlBuckets,sortPnlRows,summarizePeriods,winRate,
  type PnlFilter,type PnlMetric,type PnlPageSize,type PnlPeriod,type PnlSort} from '../../finance/dailyPnlAnalytics';
import {colors,radius,spacing} from '../../theme/tokens';

type ChartMode='line'|'bar';
const PERIODS:readonly {key:PnlPeriod;label:string}[]=[
  {key:'day',label:'日'},{key:'month',label:'月'},{key:'year',label:'年'},
];
const RANGES:Record<PnlPeriod,readonly {key:number|'all';label:string}[]>={
  day:[{key:7,label:'7日'},{key:30,label:'30日'},{key:90,label:'90日'},{key:'all',label:'全部'}],
  month:[{key:3,label:'3月'},{key:6,label:'6月'},{key:12,label:'12月'},{key:'all',label:'全部'}],
  year:[{key:3,label:'3年'},{key:5,label:'5年'},{key:'all',label:'全部'}],
};
const FILTERS:readonly {key:PnlFilter;label:string}[]=[
  {key:'all',label:'全部'},{key:'gain',label:'獲利'},
  {key:'loss',label:'虧損'},{key:'flat',label:'持平'},{key:'official',label:'正式收盤'},
];
const SORTS:readonly {key:PnlSort;label:string}[]=[
  {key:'date',label:'日期'},{key:'dailyPnl',label:'每日損益'},
  {key:'marketValue',label:'持股市值'},{key:'totalPnl',label:'累積損益'},
];
const SIZES:readonly PnlPageSize[]=[10,20,50];
const GRAPH_HEIGHT=182;
const money=(n:number)=>Math.round(n).toLocaleString('zh-TW');
const signed=(n:number)=>n>0?'+ '+money(n):money(n);

/** This is the holding statistics tab, not the home daily-P&L modal.
 * Both read the same persisted DailyPnlRecord without changing finance core.
 */
export function HoldingMarketValueHistoryPanel({records}:{
  records:readonly DailyPnlRecord[];
}){
  const systemColors=useSystemColors();
  const tone=(n:number)=>n>0?systemColors.gain:n<0?systemColors.loss:systemColors.flat;
  const [period,setPeriod]=useState<PnlPeriod>('day');
  const [range,setRange]=useState<number|'all'>(30);
  const [metric,setMetric]=useState<PnlMetric>('marketValue');
  const [chartMode,setChartMode]=useState<ChartMode>('line');
  const [filter,setFilter]=useState<PnlFilter>('all');
  const [sort,setSort]=useState<PnlSort>('date');
  const [ascending,setAscending]=useState(false);
  const [pageSize,setPageSize]=useState<PnlPageSize>(20);
  const [page,setPage]=useState(0);
  const [selectedDate,setSelectedDate]=useState<string|null>(null);
  const [plotWidth,setPlotWidth]=useState(300);

  const chronological=useMemo(()=>[...records].sort((a,b)=>a.date.localeCompare(b.date)),[records]);
  const grouped=useMemo(()=>summarizePeriods(chronological,period),[chronological,period]);
  const currentBuckets=useMemo(()=>recentPnlPeriods(grouped,range),[grouped,range]);
  const ranged=useMemo(()=>{
    if(!currentBuckets.length)return [];
    const start=currentBuckets[0]!.startDate,end=currentBuckets[currentBuckets.length-1]!.endDate;
    return chronological.filter(row=>row.date>=start&&row.date<=end);
  },[chronological,currentBuckets]);
  const visible=useMemo(()=>sortPnlRows(filterPnlRows(ranged,filter),sort,ascending),
    [ranged,filter,sort,ascending]);
  const paging=pagePnlRows(visible,page,pageSize);
  const displayBuckets=useMemo(()=>samplePnlBuckets(currentBuckets,metric,80),[currentBuckets,metric]);
  const monthly=useMemo(()=>summarizePeriods(ranged,'month').reverse(),[ranged]);
  const stats=useMemo(()=>summarizeDailyPnl(ranged),[ranged]);
  const win=winRate(stats.gainDays,stats.lossDays);
  const last=ranged[ranged.length-1]??null;
  const selected=ranged.find(row=>row.date===selectedDate)??last;
  const selectedBucket=currentBuckets.find(b=>b.key===periodKey(selected?.date??'',period))??
    currentBuckets[currentBuckets.length-1]??null;

  // Market value is an absolute amount, not daily investment performance.
  // A monthly/yearly point uses the period's last official/current snapshot.
  const numbers=displayBuckets.map(bucket=>bucketValue(bucket,metric));
  const floor=metric==='marketValue'&&numbers.length?Math.min(...numbers):Math.min(0,...numbers);
  const ceiling=metric==='marketValue'&&numbers.length?Math.max(...numbers):Math.max(0,...numbers);
  const padding=Math.max(1,(ceiling-floor)*0.1);
  const min=floor-padding,max=ceiling+padding;
  const inner=Math.max(32,plotWidth-24);
  const y=(value:number)=>12+(max-value)/Math.max(1,max-min)*(GRAPH_HEIGHT-36);
  const x=(index:number)=>12+(displayBuckets.length<=1?inner/2:index/(displayBuckets.length-1)*inner);
  const points=displayBuckets.map((bucket,index)=>({
    bucket,value:bucketValue(bucket,metric),x:x(index),y:y(bucketValue(bucket,metric)),
  }));
  const baseline=y(metric==='marketValue'?floor:0);

  const changePeriod=(next:PnlPeriod)=>{
    setPeriod(next);setRange(next==='day'?30:next==='month'?12:'all');setPage(0);setSelectedDate(null);
  };
  const changeRange=(next:number|'all')=>{setRange(next);setPage(0);setSelectedDate(null);};
  const changeSort=(next:PnlSort)=>{
    setAscending(current=>next===sort?!current:false);setSort(next);setPage(0);
  };
  const setFilterReset=(next:PnlFilter)=>{setFilter(next);setPage(0);};

  return <View style={styles.section}>
    <View style={styles.sectionHead}>
      <Text editorId="native:HoldingValueHistory:title" editorReadOnly={false} style={styles.sectionTitle}>每日市值走勢與統計</Text>
      <Text editorId="native:HoldingValueHistory:count" editorReadOnly={true} style={styles.meta}>歷史共 {records.length} 筆</Text>
    </View>
    <Text style={styles.note}>市值走勢是資產估值，不代表投資報酬；期間損益使用已扣除交易本金流的每日損益紀錄。持股總損益仍以現值減成本計算。</Text>

    <View style={styles.statsGrid}>
      <MiniStat label="期末持股市值" value={last?'NT$ '+money(last.totalMarketValue):'—'}/>
      <MiniStat label="期間每日損益合計" value={ranged.length?signed(stats.periodPnl):'—'}
        color={ranged.length?tone(stats.periodPnl):undefined}/>
      <MiniStat label="獲利／虧損／持平日" value={stats.gainDays+'／'+stats.lossDays+'／'+stats.flatDays}/>
      <MiniStat label="獲利勝率" value={win===null?'—':win.toFixed(1)+'%'}/>
      <MiniStat label="最佳／最差單日"
        value={(stats.best?signed(stats.best.todayPnl):'—')+'／'+(stats.worst?signed(stats.worst.todayPnl):'—')}/>
      <MiniStat label="平均每日損益" value={ranged.length?signed(stats.averageDailyPnl):'—'}
        color={ranged.length?tone(stats.averageDailyPnl):undefined}/>
    </View>

    <Text style={styles.sectionTitle}>市值與損益走勢 · 日／月／年</Text>
    <View style={styles.controls}>
      {PERIODS.map(o=><Chip key={o.key} label={o.label} active={period===o.key} onPress={()=>changePeriod(o.key)}/>)}
      <Text style={styles.tiny}>週期</Text>
    </View>
    <View style={styles.controls}>
      {RANGES[period].map(o=><Chip key={String(o.key)} label={o.label}
        active={range===o.key} onPress={()=>changeRange(o.key)}/>)}
    </View>
    <View style={styles.controls}>
      <Chip label="持股市值" active={metric==='marketValue'} onPress={()=>setMetric('marketValue')}/>
      <Chip label="期間損益" active={metric==='dailyPnl'} onPress={()=>setMetric('dailyPnl')}/>
      <Chip label="折線" active={chartMode==='line'} onPress={()=>setChartMode('line')}/>
      <Chip label="柱狀" active={chartMode==='bar'} onPress={()=>setChartMode('bar')}/>
    </View>

    <View style={styles.chartCard}>
      <View style={styles.chartTop}>
        <View style={{flex:1}}>
          <Text style={styles.tiny}>{metric==='marketValue'?'期末持股市值':'期間損益'} · {period==='day'?'日':period==='month'?'月':'年'}</Text>
          <Text style={[styles.chartNumber,metric==='dailyPnl'&&selectedBucket?{color:tone(selectedBucket.periodPnl)}:undefined]}>
            {selectedBucket?(metric==='marketValue'?'NT$ '+money(selectedBucket.lastMarketValue):signed(selectedBucket.periodPnl)):'—'}
          </Text>
        </View>
        <Text style={styles.chartDate}>{selectedBucket?.label??'無紀錄'}</Text>
      </View>
      <View style={styles.plot} onLayout={e=>{
        const width=Math.floor(e.nativeEvent.layout.width);
        if(width>0&&width!==plotWidth)setPlotWidth(width);
      }}>
        {points.length?<>
          {[0.25,0.5,0.75].map(f=><View key={f} pointerEvents="none" style={[styles.gridLine,{top:12+f*(GRAPH_HEIGHT-36)}]}/>)}
          {chartMode==='bar'?points.map((point,i)=>{
            const diff=metric==='marketValue'?point.value-(points[i-1]?.value??point.value):point.value;
            const width=Math.max(3,Math.min(16,inner/Math.max(1,points.length)*0.65));
            return <View key={'bar'+point.bucket.key} pointerEvents="none" style={{
              position:'absolute',left:point.x-width/2,top:Math.min(point.y,baseline),
              width,height:Math.max(2,Math.abs(baseline-point.y)),
              backgroundColor:metric==='marketValue'?colors.primary:tone(diff),opacity:0.85,borderRadius:2,
            }}/>;
          }):points.slice(1).map((point,i)=>{
            const before=points[i]!,dx=point.x-before.x,dy=point.y-before.y;
            const length=Math.max(1,Math.hypot(dx,dy)),angle=Math.atan2(dy,dx);
            return <View key={'segment'+point.bucket.key} pointerEvents="none" style={{
              position:'absolute',left:(before.x+point.x)/2-length/2,top:(before.y+point.y)/2-1,
              width:length,height:2,backgroundColor:colors.primary,
              transform:[{rotateZ:angle+'rad'}],
            }}/>;
          })}
          {points.map((point,i)=>{
            const prior=points[i-1]?.x??12,next=points[i+1]?.x??plotWidth-12;
            const hitWidth=Math.max(10,(next-prior)/2);
            return <Pressable key={'point'+point.bucket.key} accessibilityRole="button"
              accessibilityLabel={point.bucket.label+' '+(metric==='marketValue'?'持股市值 ':'期間損益 ')+money(point.value)}
              onPress={()=>setSelectedDate(point.bucket.endDate)}
              style={{position:'absolute',left:Math.max(0,point.x-hitWidth/2),top:0,
                height:GRAPH_HEIGHT,width:hitWidth}}/>;
          })}
          <Text pointerEvents="none" style={[styles.axis,{top:3}]}>{money(ceiling)}</Text>
          <Text pointerEvents="none" style={[styles.axis,{bottom:2}]}>{money(floor)}</Text>
        </>:<View style={styles.noGraph}><Text style={styles.empty}>目前沒有可繪製的行情歷史。</Text></View>}
      </View>
      <View style={styles.axisFoot}><Text style={styles.tiny}>{displayBuckets[0]?.label??'—'}</Text>
        <Text style={styles.tiny}>{displayBuckets.length<currentBuckets.length?'圖形抽樣，不影響完整統計':''}</Text>
        <Text style={styles.tiny}>{displayBuckets[displayBuckets.length-1]?.label??'—'}</Text></View>
    </View>
    <Text style={styles.note}>月／年市值採期間最後有效估值，期間損益為每日損益合計；切換週期會重新彙整實際紀錄，不是僅放大或縮小圖表。</Text>
    {selected?<View style={styles.detail}>
      <Text style={styles.recordDate}>{selected.date} · {selected.basis==='official-history'?'正式收盤':'盤中／前收暫估'}</Text>
      <Text style={styles.recordDetail}>當日市值 NT$ {money(selected.totalMarketValue)} · 當日損益 <Text style={{color:tone(selected.todayPnl)}}>{signed(selected.todayPnl)}</Text></Text>
      <Text style={styles.tiny}>前次累積損益 {signed(selected.previousTotalPnl)} · 當日累積損益 {signed(selected.totalPnl)} · 交易本金流 {signed(selected.tradeMarketFlow)}</Text>
    </View>:null}

    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>每日市值走勢紀錄</Text>
      <Text style={styles.meta}>共 {visible.length} 筆 · 第 {paging.page+1}／{paging.pageCount} 頁</Text>
    </View>
    <View style={styles.controls}>
      <Text style={styles.tiny}>每頁</Text>
      {SIZES.map(size=><Chip key={size} label={String(size)} active={pageSize===size}
        onPress={()=>{setPageSize(size);setPage(0);}}/>)}
    </View>
    <View style={styles.controls}>
      {FILTERS.map(o=><Chip key={o.key} label={o.label} active={filter===o.key}
        onPress={()=>setFilterReset(o.key)}/>)}
    </View>
    <View style={styles.controls}>
      <Text style={styles.tiny}>排序</Text>
      {SORTS.map(o=><Chip key={o.key} label={o.label+(sort===o.key?(ascending?' ↑':' ↓'):'')}
        active={sort===o.key} onPress={()=>changeSort(o.key)}/>)}
    </View>
    {paging.rows.map(row=><Pressable key={row.date} accessibilityRole="button"
      accessibilityLabel={row.date+' 市值 '+money(row.totalMarketValue)+' 當日損益 '+signed(row.todayPnl)}
      onPress={()=>setSelectedDate(row.date)}
      style={[styles.record,selectedDate===row.date&&styles.recordSelected]}>
      <View style={{flex:1,gap:3}}>
        <Text editorId="native:HoldingValueHistory:recordDate" editorReadOnly={true} style={styles.recordDate}>{row.date}</Text>
        <Text style={styles.recordMeta}>{row.basis==='official-history'?'正式收盤':'暫估'}{row.final?' · 已結束':''}</Text>
        <Text style={styles.recordMeta}>當日累積損益 {signed(row.totalPnl)}</Text>
      </View>
      <View style={styles.recordRight}>
        <Text style={styles.recordMeta}>市值 {money(row.totalMarketValue)}</Text>
        <Text style={[styles.recordPnl,{color:tone(row.todayPnl)}]}>{signed(row.todayPnl)}</Text>
        <Text style={styles.recordMeta}>點選查看明細 ›</Text>
      </View>
    </Pressable>)}
    {!paging.rows.length?<Text style={styles.empty}>沒有符合目前期間或篩選條件的每日紀錄。</Text>:null}
    <View style={styles.pagination}>
      <Pressable accessibilityRole="button" disabled={paging.page===0}
        onPress={()=>setPage(n=>Math.max(0,n-1))}
        style={[styles.pageButton,paging.page===0&&styles.disabled]}>
        <Text style={styles.pageButtonLabel}>上一頁</Text>
      </Pressable>
      <Text style={styles.meta}>第 {paging.page+1}／{paging.pageCount} 頁</Text>
      <Pressable accessibilityRole="button" disabled={paging.page>=paging.pageCount-1}
        onPress={()=>setPage(n=>Math.min(paging.pageCount-1,n+1))}
        style={[styles.pageButton,paging.page>=paging.pageCount-1&&styles.disabled]}>
        <Text style={styles.pageButtonLabel}>下一頁</Text>
      </Pressable>
    </View>
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>月度市值／損益摘要</Text>
      <Text style={styles.tiny}>逐月期末估值</Text>
    </View>
    {monthly.slice(0,12).map(bucket=><View key={bucket.key} style={styles.month}>
      <View style={{flex:1}}>
        <Text style={styles.recordDate}>{bucket.key}</Text>
        <Text style={styles.recordMeta}>{bucket.days} 個紀錄日 · {bucket.estimatedDays?'含暫估':'正式'}</Text>
      </View>
      <View style={styles.recordRight}>
        <Text style={styles.recordMeta}>期末市值 {money(bucket.lastMarketValue)}</Text>
        <Text style={[styles.recordPnl,{color:tone(bucket.periodPnl)}]}>{signed(bucket.periodPnl)}</Text>
      </View>
    </View>)}
    {!monthly.length?<Text style={styles.empty}>尚無可統計的月份。</Text>:null}
    {monthly.length>12?<Text style={styles.note}>月度摘要顯示最近 12 個月；日／月／年走勢及每日紀錄仍保留完整歷史。</Text>:null}
  </View>;
}

function MiniStat({label,value,color}:{label:string;value:string;color?:string}){
  return <View style={styles.stat}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue,color?{color}:undefined]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>;
}
function Chip({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress}
    style={[styles.chip,active&&styles.chipSelected]}>
    <Text style={[styles.chipText,active&&styles.chipTextSelected]}>{label}</Text>
  </Pressable>;
}
const styles=StyleSheet.create({
  section:{gap:spacing.sm},
  sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
  sectionTitle:{fontSize:16,fontWeight:'900',color:colors.text},
  meta:{fontSize:10,color:colors.textSecondary},
  note:{fontSize:10,lineHeight:17,color:colors.textSecondary,backgroundColor:colors.surfaceMuted,borderRadius:radius.md,padding:10},
  statsGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  stat:{width:'48%',minWidth:128,padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,gap:4},
  statLabel:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  statValue:{fontSize:16,fontWeight:'900',color:colors.text},
  controls:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6},
  chip:{paddingHorizontal:11,paddingVertical:8,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  chipSelected:{backgroundColor:colors.primary},
  chipText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  chipTextSelected:{color:'#FFFFFF'},
  tiny:{fontSize:10,color:colors.textSecondary},
  chartCard:{padding:12,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,backgroundColor:colors.surface,gap:9},
  chartTop:{flexDirection:'row',gap:10,alignItems:'center'},
  chartNumber:{fontSize:18,fontWeight:'900',color:colors.text,marginTop:4},
  chartDate:{fontSize:11,fontWeight:'800',color:colors.textSecondary},
  plot:{height:GRAPH_HEIGHT,position:'relative',overflow:'hidden'},
  gridLine:{position:'absolute',height:1,left:0,right:0,backgroundColor:colors.border},
  axis:{position:'absolute',left:2,fontSize:9,color:colors.textSecondary},
  axisFoot:{flexDirection:'row',justifyContent:'space-between',gap:5},
  noGraph:{flex:1,alignItems:'center',justifyContent:'center'},
  empty:{padding:16,textAlign:'center',color:colors.textSecondary,fontSize:12},
  detail:{padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,gap:5},
  record:{padding:10,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,
    flexDirection:'row',alignItems:'center',gap:9},
  recordSelected:{borderColor:colors.primary,borderWidth:2},
  recordDate:{fontSize:12,fontWeight:'900',color:colors.text},
  recordMeta:{fontSize:10,color:colors.textSecondary},
  recordRight:{alignItems:'flex-end',gap:4},
  recordPnl:{fontSize:14,fontWeight:'900'},
  recordDetail:{fontSize:11,color:colors.text},
  pagination:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:7,paddingVertical:5},
  pageButton:{paddingHorizontal:14,paddingVertical:9,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  pageButtonLabel:{fontSize:11,fontWeight:'900',color:colors.primary},
  disabled:{opacity:0.35},
  month:{padding:12,borderRadius:radius.md,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',gap:8,
    borderWidth:1,borderColor:colors.border},
});
