import {EditorSurface} from '../EditorSurface';
import {useSystemColors} from '../../theme/useSystemColors';
import {useMemo,useState} from 'react';
import {Modal,ScrollView,StyleSheet,View} from 'react-native';
import {Pressable,Text} from '../EditableNative';

import type {CanonicalLedgerEntry,CanonicalLedgerSnapshot} from '../../finance/canonicalLedger';
import type {DailyPnlRecord} from '../../finance/dailyPnlHistory';
import {buildPurchasePnlStatistics,type PurchaseLotPnlStat} from '../../finance/purchasePnlStats';
import {colors,radius,spacing} from '../../theme/tokens';

const PAGE_SIZE=20;
const money=(value:number)=>Math.round(value).toLocaleString('zh-TW');
const signed=(value:number)=>`${value>0?'+':''}${money(value)}`;
const pct=(value:number)=>`${value>0?'+':''}${value.toFixed(2)}%`;
const shares=(value:number)=>Number.isInteger(value)?value.toLocaleString('zh-TW'):value.toLocaleString('zh-TW',{maximumFractionDigits:4});

type Tab='symbol'|'purchase'|'daily';
type Filter='all'|'open'|'closed';
type SortMode='date'|'pnl'|'symbol';

const TABS:readonly {key:Tab;label:string}[]=[
  {key:'symbol',label:'ETF 彙總'},
  {key:'purchase',label:'購買紀錄'},
  {key:'daily',label:'每日走勢'},
];

function Stat({label,value,valueColor}:{label:string;value:string;valueColor?:string}){
  return <View style={styles.stat}>
    <Text editorId="native:PurchasePnlStatsModal:statLabel:1" editorReadOnly={false} style={styles.statLabel}>{label}</Text>
    <Text editorId="native:PurchasePnlStatsModal:statValue:2" editorReadOnly={true} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.statValue,valueColor?{color:valueColor}:undefined]}>{value}</Text>
  </View>;
}

function LotMetric({label,value,valueColor}:{label:string;value:string;valueColor?:string}){
  return <View style={styles.lotMetric}>
    <Text editorId="native:PurchasePnlStatsModal:metricLabel:3" editorReadOnly={false} style={styles.metricLabel}>{label}</Text>
    <Text editorId="native:PurchasePnlStatsModal:metricValue:4" editorReadOnly={true} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.metricValue,valueColor?{color:valueColor}:undefined]}>{value}</Text>
  </View>;
}

function PurchaseCard({row}:{row:PurchaseLotPnlStat}){
  const colors=useSystemColors();
  const tone=(value:number)=>value>0?colors.gain:value<0?colors.loss:colors.flat;
  return <View style={styles.purchaseCard}>
    <View style={styles.purchaseHead}>
      <View style={{flex:1}}>
        <Text editorId="native:PurchasePnlStatsModal:symbolText:5" editorReadOnly={true} style={styles.symbolText}>{row.symbol}　{row.name}</Text>
        <Text editorId="native:PurchasePnlStatsModal:dateText:6" editorReadOnly={true} style={styles.dateText}>{row.date} · 買進 NT$ {row.buyPrice.toLocaleString('zh-TW',{maximumFractionDigits:4})}</Text>
      </View>
      <View style={[styles.statusBadge,row.status==='open'?styles.statusOpen:styles.statusClosed]}>
        <Text editorId="native:PurchasePnlStatsModal:statusText:7" editorReadOnly={true} style={[styles.statusText,row.status==='open'?styles.statusOpenText:styles.statusClosedText]}>{row.status==='open'?'持有中':'已結清'}</Text>
      </View>
    </View>
    <View style={styles.metricGrid}>
      <LotMetric label="原始股數" value={shares(row.originalShares)}/>
      <LotMetric label="剩餘股數" value={shares(row.remainingShares)}/>
      <LotMetric label="原始買進金額" value={'NT$ '+money(row.originalTradeAmount)}/>
      <LotMetric label="買進手續費" value={'NT$ '+money(row.purchaseFee)}/>
      <LotMetric label="剩餘持股成本" value={'NT$ '+money(row.remainingTradeCost)}/>
      <LotMetric label="目前市值" value={'NT$ '+money(row.currentMarketValue)}/>
      <LotMetric label="持股損益" value={signed(row.holdingPnl)} valueColor={tone(row.holdingPnl)}/>
      <LotMetric label="持股報酬率" value={pct(row.holdingRoi)} valueColor={tone(row.holdingPnl)}/>
      <LotMetric label="目前價格" value={'NT$ '+row.currentPrice.toLocaleString('zh-TW',{maximumFractionDigits:4})}/>
      <LotMetric label="持有天數" value={row.holdingDays.toLocaleString('zh-TW')+' 天'}/>
    </View>
  </View>;
}

export function PurchasePnlStatsModal({
  visible,onClose,entries,holdings,dailyRecords,
}:{
  visible:boolean;
  onClose:()=>void;
  entries:readonly CanonicalLedgerEntry[];
  holdings:CanonicalLedgerSnapshot['holdings'];
  dailyRecords:readonly DailyPnlRecord[];
}){
  const colors=useSystemColors();
  const tone=(value:number)=>value>0?colors.gain:value<0?colors.loss:colors.flat;
  const [tab,setTab]=useState<Tab>('symbol');
  const [filter,setFilter]=useState<Filter>('all');
  const [sort,setSort]=useState<SortMode>('date');
  const [page,setPage]=useState(0);
  const stats=useMemo(()=>buildPurchasePnlStatistics({entries,holdings}),[entries,holdings]);

  const filteredLots=useMemo(()=>{
    const rows=stats.lots.filter(row=>filter==='all'||row.status===filter);
    return rows.slice().sort((a,b)=>{
      if(sort==='pnl')return b.holdingPnl-a.holdingPnl||b.date.localeCompare(a.date);
      if(sort==='symbol')return a.symbol.localeCompare(b.symbol)||b.date.localeCompare(a.date);
      return b.date.localeCompare(a.date)||b.id.localeCompare(a.id);
    });
  },[stats.lots,filter,sort]);
  const pageCount=Math.max(1,Math.ceil(filteredLots.length/PAGE_SIZE));
  const safePage=Math.min(page,pageCount-1);
  const pageLots=filteredLots.slice(safePage*PAGE_SIZE,(safePage+1)*PAGE_SIZE);
  const dailyRows=useMemo(()=>[...dailyRecords].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,120),[dailyRecords]);
  const chooseTab=(next:Tab)=>{setTab(next);setPage(0);};
  const chooseFilter=(next:Filter)=>{setFilter(next);setPage(0);};

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><EditorSurface pageKey="home" frameKey="purchase-pnl-modal" title="購買損益統計" visible={visible}>
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{flex:1}}>
          <Text editorId="native:PurchasePnlStatsModal:title:8" editorReadOnly={false} style={styles.title}>持股損益統計</Text>
          <Text editorId="native:PurchasePnlStatsModal:subtitle:9" editorReadOnly={false} style={styles.subtitle}>以購買紀錄拆解目前持股總損益；股息、已實現損益與預估清算費用不併入。</Text>
        </View>
        <Pressable editorId="native:PurchasePnlStatsModal:close:10" accessibilityRole="button" accessibilityLabel="關閉持股損益統計" onPress={onClose} style={styles.close}>
          <Text editorId="native:PurchasePnlStatsModal:closeText:11" editorReadOnly={false} style={styles.closeText}>關閉</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.formula}>
          <Text editorId="native:PurchasePnlStatsModal:formulaTitle:12" editorReadOnly={false} style={styles.formulaTitle}>持股總損益公式</Text>
          <Text editorId="native:PurchasePnlStatsModal:formulaText:13" editorReadOnly={true} style={styles.formulaText}>目前持股市值 {money(stats.totalMarketValue)} − 目前持股成本 {money(stats.totalHoldingCost)} = {signed(stats.holdingPnl)}</Text>
          <Text editorId="native:PurchasePnlStatsModal:formulaNote:14" editorReadOnly={false} style={styles.formulaNote}>此處的「持股成本」採金融核心目前持倉的買進成交金額成本；股息與賣出已實現損益另列，不加入這個數字。</Text>
        </View>

        <View style={styles.statsGrid}>
          <Stat label="持股市值" value={'NT$ '+money(stats.totalMarketValue)}/>
          <Stat label="持股成本" value={'NT$ '+money(stats.totalHoldingCost)}/>
          <Stat label="持股總損益" value={signed(stats.holdingPnl)} valueColor={tone(stats.holdingPnl)}/>
          <Stat label="持股報酬率" value={pct(stats.holdingRoi)} valueColor={tone(stats.holdingPnl)}/>
        </View>

        <View style={styles.tabRow}>
          {TABS.map(item=><Pressable editorId="native:PurchasePnlStatsModal:tab:15" key={item.key} onPress={()=>chooseTab(item.key)} style={[styles.tab,tab===item.key&&styles.tabActive]}>
            <Text editorId="native:PurchasePnlStatsModal:tabText:16" editorReadOnly={false} style={[styles.tabText,tab===item.key&&styles.tabTextActive]}>{item.label}</Text>
          </Pressable>)}
        </View>

        {tab==='symbol'?<View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text editorId="native:PurchasePnlStatsModal:sectionTitle:17" editorReadOnly={false} style={styles.sectionTitle}>依 ETF 彙總</Text>
            <Text editorId="native:PurchasePnlStatsModal:sectionMeta:18" editorReadOnly={true} style={styles.sectionMeta}>{stats.symbols.length} 檔持股 · {stats.openPurchaseCount} 筆有效購買紀錄</Text>
          </View>
          {stats.symbols.map(row=><View key={row.symbol} style={styles.symbolCard}>
            <View style={styles.purchaseHead}>
              <View style={{flex:1}}><Text editorId="native:PurchasePnlStatsModal:symbolText:19" editorReadOnly={true} style={styles.symbolText}>{row.symbol}　{row.name}</Text><Text editorId="native:PurchasePnlStatsModal:dateText:20" editorReadOnly={true} style={styles.dateText}>{shares(row.shares)} 股 · 現價 NT$ {row.currentPrice.toLocaleString('zh-TW',{maximumFractionDigits:4})}</Text></View>
              <Text editorId="native:PurchasePnlStatsModal:symbolPnl:21" editorReadOnly={true} style={[styles.symbolPnl,{color:tone(row.holdingPnl)}]}>{signed(row.holdingPnl)}</Text>
            </View>
            <View style={styles.metricGrid}>
              <LotMetric label="持股成本" value={'NT$ '+money(row.holdingCost)}/>
              <LotMetric label="目前市值" value={'NT$ '+money(row.marketValue)}/>
              <LotMetric label="持股報酬率" value={pct(row.holdingRoi)} valueColor={tone(row.holdingPnl)}/>
              <LotMetric label="購買紀錄" value={row.openPurchaseCount+' / '+row.purchaseCount+' 筆'}/>
            </View>
          </View>)}
          {!stats.symbols.length?<Text editorId="native:PurchasePnlStatsModal:empty:22" editorReadOnly={false} style={styles.empty}>目前沒有持有中的標的。</Text>:null}
        </View>:null}

        {tab==='purchase'?<View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text editorId="native:PurchasePnlStatsModal:sectionTitle:23" editorReadOnly={false} style={styles.sectionTitle}>購買紀錄統計</Text>
            <Text editorId="native:PurchasePnlStatsModal:sectionMeta:24" editorReadOnly={true} style={styles.sectionMeta}>共 {filteredLots.length} 筆</Text>
          </View>
          <View style={styles.controlRow}>
            {([{key:'all',label:'全部'},{key:'open',label:'持有中'},{key:'closed',label:'已結清'}] as const).map(item=><Pressable editorId="native:PurchasePnlStatsModal:chip:25" key={item.key} onPress={()=>chooseFilter(item.key)}
              style={[styles.chip,filter===item.key&&styles.chipActive]}><Text editorId="native:PurchasePnlStatsModal:chipText:26" editorReadOnly={false} style={[styles.chipText,filter===item.key&&styles.chipTextActive]}>{item.label}</Text></Pressable>)}
          </View>
          <View style={styles.controlRow}>
            {([{key:'date',label:'日期'},{key:'pnl',label:'損益'},{key:'symbol',label:'代號'}] as const).map(item=><Pressable editorId="native:PurchasePnlStatsModal:chip:27" key={item.key} onPress={()=>{setSort(item.key);setPage(0);}}
              style={[styles.chip,sort===item.key&&styles.chipActive]}><Text editorId="native:PurchasePnlStatsModal:chipText:28" editorReadOnly={false} style={[styles.chipText,sort===item.key&&styles.chipTextActive]}>排序：{item.label}</Text></Pressable>)}
          </View>
          {pageLots.map(row=><PurchaseCard key={row.id} row={row}/>)}
          {!pageLots.length?<Text editorId="native:PurchasePnlStatsModal:empty:29" editorReadOnly={false} style={styles.empty}>目前沒有符合條件的購買紀錄。</Text>:null}
          {pageCount>1?<View style={styles.pagination}>
            <Pressable editorId="native:PurchasePnlStatsModal:pageButton:30" disabled={safePage===0} onPress={()=>setPage(current=>Math.max(0,current-1))} style={[styles.pageButton,safePage===0&&styles.pageButtonDisabled]}><Text editorId="native:PurchasePnlStatsModal:pageButtonText:31" editorReadOnly={false} style={styles.pageButtonText}>上一頁</Text></Pressable>
            <Text editorId="native:PurchasePnlStatsModal:pageInfo:32" editorReadOnly={true} style={styles.pageInfo}>{safePage+1} / {pageCount}</Text>
            <Pressable editorId="native:PurchasePnlStatsModal:pageButton:33" disabled={safePage>=pageCount-1} onPress={()=>setPage(current=>Math.min(pageCount-1,current+1))} style={[styles.pageButton,safePage>=pageCount-1&&styles.pageButtonDisabled]}><Text editorId="native:PurchasePnlStatsModal:pageButtonText:34" editorReadOnly={false} style={styles.pageButtonText}>下一頁</Text></Pressable>
          </View>:null}
          <View style={styles.notice}>
            <Text editorId="native:PurchasePnlStatsModal:noticeTitle:35" editorReadOnly={false} style={styles.noticeTitle}>移動平均成本一致性</Text>
            <Text editorId="native:PurchasePnlStatsModal:noticeText:36" editorReadOnly={false} style={styles.noticeText}>金融核心賣出採「移動平均含費成本釋放」。為了逐筆回看購買紀錄，剩餘股數與成本依當時仍有效的買進紀錄同比例分攤；這是統計呈現，不會改寫交易帳務或金融核心。</Text>
          </View>
        </View>:null}

        {tab==='daily'?<View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text editorId="native:PurchasePnlStatsModal:sectionTitle:37" editorReadOnly={false} style={styles.sectionTitle}>每日市值走勢紀錄</Text>
            <Text editorId="native:PurchasePnlStatsModal:sectionMeta:38" editorReadOnly={true} style={styles.sectionMeta}>保留最近 {dailyRows.length} 筆</Text>
          </View>
          <Text editorId="native:PurchasePnlStatsModal:dailyNote:39" editorReadOnly={false} style={styles.dailyNote}>每日紀錄用來回溯市場變化，不拿來反推「持股總損益」。持股總損益永遠以目前市值減目前持股成本為準。</Text>
          {dailyRows.map(row=><View key={row.date} style={styles.dailyRow}>
            <View><Text editorId="native:PurchasePnlStatsModal:dailyDate:40" editorReadOnly={true} style={styles.dailyDate}>{row.date}</Text><Text editorId="native:PurchasePnlStatsModal:dailyBasis:41" editorReadOnly={true} style={styles.dailyBasis}>{row.basis==='official-history'?'正式收盤':'即時／前收基準'}{row.final?' · 已結束':''}</Text></View>
            <View style={styles.dailyRight}><Text editorId="native:PurchasePnlStatsModal:dailyMarket:42" editorReadOnly={true} style={styles.dailyMarket}>市值 {money(row.totalMarketValue)}</Text><Text editorId="native:PurchasePnlStatsModal:dailyPnl:43" editorReadOnly={true} style={[styles.dailyPnl,{color:tone(row.todayPnl)}]}>{signed(row.todayPnl)}</Text></View>
          </View>)}
          {!dailyRows.length?<Text editorId="native:PurchasePnlStatsModal:empty:44" editorReadOnly={false} style={styles.empty}>尚無每日行情紀錄。</Text>:null}
        </View>:null}
      </ScrollView>
    </View>
  </EditorSurface></Modal>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background},
  header:{paddingHorizontal:spacing.lg,paddingTop:spacing.xl,paddingBottom:spacing.md,borderBottomWidth:1,borderBottomColor:colors.border,backgroundColor:colors.surface,flexDirection:'row',alignItems:'flex-start',gap:spacing.md},
  title:{fontSize:22,fontWeight:'900',color:colors.text},
  subtitle:{fontSize:11,lineHeight:17,color:colors.textSecondary,marginTop:4},
  close:{paddingHorizontal:14,paddingVertical:9,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  closeText:{fontSize:11,fontWeight:'900',color:colors.primary},
  scroll:{padding:spacing.lg,gap:spacing.md,paddingBottom:48},
  formula:{padding:spacing.md,borderRadius:radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,gap:5},
  formulaTitle:{fontSize:12,fontWeight:'900',color:colors.text},
  formulaText:{fontSize:15,lineHeight:22,fontWeight:'900',color:colors.text,fontVariant:['tabular-nums']},
  formulaNote:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  statsGrid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},
  stat:{width:'48%',minWidth:140,padding:spacing.md,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,gap:4},
  statLabel:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  statValue:{fontSize:19,lineHeight:25,fontWeight:'900',color:colors.text,fontVariant:['tabular-nums']},
  tabRow:{flexDirection:'row',gap:6,padding:4,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  tab:{flex:1,minHeight:38,alignItems:'center',justifyContent:'center',borderRadius:radius.pill},
  tabActive:{backgroundColor:colors.primary},
  tabText:{fontSize:11,fontWeight:'900',color:colors.textSecondary},
  tabTextActive:{color:'#FFFFFF'},
  section:{gap:spacing.sm},
  sectionHead:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:spacing.sm},
  sectionTitle:{fontSize:16,fontWeight:'900',color:colors.text},
  sectionMeta:{fontSize:10,color:colors.textSecondary},
  symbolCard:{padding:spacing.md,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,gap:spacing.sm},
  purchaseCard:{padding:spacing.md,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,gap:spacing.sm},
  purchaseHead:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:spacing.sm},
  symbolText:{fontSize:13,fontWeight:'900',color:colors.text},
  dateText:{fontSize:10,color:colors.textSecondary,marginTop:3},
  symbolPnl:{fontSize:18,fontWeight:'900',fontVariant:['tabular-nums']},
  statusBadge:{paddingHorizontal:9,paddingVertical:5,borderRadius:radius.pill},
  statusOpen:{backgroundColor:'#EAFBF2'},
  statusClosed:{backgroundColor:colors.surfaceMuted},
  statusText:{fontSize:9,fontWeight:'900'},
  statusOpenText:{color:'#087A48'},
  statusClosedText:{color:colors.textSecondary},
  metricGrid:{flexDirection:'row',flexWrap:'wrap',columnGap:8,rowGap:7},
  lotMetric:{width:'48%',minWidth:130,paddingTop:5,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  metricLabel:{fontSize:9,color:colors.textSecondary},
  metricValue:{fontSize:12,lineHeight:18,fontWeight:'900',color:colors.text,fontVariant:['tabular-nums']},
  controlRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
  chip:{paddingHorizontal:11,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  chipActive:{backgroundColor:colors.primary},
  chipText:{fontSize:10,fontWeight:'900',color:colors.textSecondary},
  chipTextActive:{color:'#FFFFFF'},
  pagination:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},
  pageButton:{paddingHorizontal:14,paddingVertical:9,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  pageButtonDisabled:{opacity:.35},
  pageButtonText:{fontSize:10,fontWeight:'900',color:colors.primary},
  pageInfo:{fontSize:10,fontWeight:'900',color:colors.textSecondary},
  notice:{padding:spacing.md,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,gap:4},
  noticeTitle:{fontSize:11,fontWeight:'900',color:colors.text},
  noticeText:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  dailyNote:{fontSize:10,lineHeight:16,color:colors.textSecondary,padding:spacing.sm,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  dailyRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  dailyDate:{fontSize:12,fontWeight:'900',color:colors.text},
  dailyBasis:{fontSize:9,color:colors.textSecondary,marginTop:2},
  dailyRight:{alignItems:'flex-end'},
  dailyMarket:{fontSize:10,color:colors.textSecondary},
  dailyPnl:{fontSize:14,fontWeight:'900',fontVariant:['tabular-nums'],marginTop:2},
  empty:{paddingVertical:spacing.lg,textAlign:'center',fontSize:12,color:colors.textSecondary},
});
