import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {DailyPnlRecord,DailyPnlStats} from '../../finance/dailyPnlHistory';
import {colors,radius,spacing} from '../../theme/tokens';

const money=(value:number)=>Math.round(value).toLocaleString('zh-TW');
const signed=(value:number)=>`${value>0?'+':''}${money(value)}`;
const tone=(value:number)=>value>0?colors.gain:value<0?colors.loss:colors.flat;

export function DailyPnlHistoryModal({visible,onClose,records,stats}:{
  visible:boolean;onClose:()=>void;records:readonly DailyPnlRecord[];stats:DailyPnlStats;
}){
  const ordered=[...records].sort((a,b)=>b.date.localeCompare(a.date));
  const trend=[...records].sort((a,b)=>a.date.localeCompare(b.date)).slice(-20);
  const maxAbs=Math.max(1,...trend.map(row=>Math.abs(row.todayPnl)));
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{flex:1}}>
          <Text style={styles.title}>每日損益紀錄</Text>
          <Text style={styles.subtitle}>前一日損益＋今日損益＝總損益；收盤紀錄落盤後不再被即時行情改寫</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="關閉每日損益紀錄" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>關閉</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statsGrid}>
          <Stat label="期間損益" value={signed(stats.periodPnl)} valueColor={tone(stats.periodPnl)}/>
          <Stat label="平均每日" value={signed(stats.averageDailyPnl)} valueColor={tone(stats.averageDailyPnl)}/>
          <Stat label="獲利／虧損日" value={`${stats.gainDays}／${stats.lossDays}`}/>
          <Stat label="持平日" value={String(stats.flatDays)}/>
          <Stat label="最佳單日" value={stats.best?`${stats.best.date}  ${signed(stats.best.todayPnl)}`:'—'} valueColor={stats.best?tone(stats.best.todayPnl):undefined}/>
          <Stat label="最差單日" value={stats.worst?`${stats.worst.date}  ${signed(stats.worst.todayPnl)}`:'—'} valueColor={stats.worst?tone(stats.worst.todayPnl):undefined}/>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近 20 筆每日變化</Text>
          {trend.length?<View style={styles.trend}>
            {trend.map(row=>{
              const height=8+Math.round(Math.abs(row.todayPnl)/maxAbs*72);
              return <View key={row.date} style={styles.trendCell}>
                <View accessibilityLabel={`${row.date} 今日損益 ${signed(row.todayPnl)}`}
                  style={[styles.trendBar,{height,backgroundColor:tone(row.todayPnl)}]}/>
                <Text numberOfLines={1} style={styles.trendDate}>{row.date.slice(5)}</Text>
              </View>;
            })}
          </View>:<Text style={styles.empty}>尚無可核實的每日損益紀錄。</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>每日紀錄</Text>
          {ordered.length?ordered.map(row=><View key={row.date} style={styles.row}>
            <View style={styles.rowHead}>
              <Text style={styles.date}>{row.date}</Text>
              <Text style={[styles.badge,row.final?styles.badgeFinal:styles.badgeLive]}>{row.final?'已收盤':'盤中'}</Text>
            </View>
            <Text style={styles.formula}>
              前日 {signed(row.previousTotalPnl)} ＋ 今日 <Text style={{color:tone(row.todayPnl),fontWeight:'900'}}>{signed(row.todayPnl)}</Text>
              {' '}＝ 總損益 <Text style={{color:tone(row.totalPnl),fontWeight:'900'}}>{signed(row.totalPnl)}</Text>
            </Text>
            <Text style={styles.meta}>收盤／目前持股市值 {money(row.totalMarketValue)} · 行情版本 {row.marketDataVersion}</Text>
          </View>):<Text style={styles.empty}>行情完成核實後，系統會自動建立當日紀錄。</Text>}
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

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background,paddingTop:spacing.lg},
  header:{flexDirection:'row',alignItems:'flex-start',gap:spacing.md,paddingHorizontal:spacing.lg,paddingVertical:spacing.md,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  title:{fontSize:24,fontWeight:'900',color:colors.text},
  subtitle:{fontSize:11,lineHeight:17,color:colors.textSecondary,marginTop:4},
  close:{minHeight:44,justifyContent:'center',paddingHorizontal:14,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  closeText:{fontSize:12,fontWeight:'900',color:colors.primary},
  scroll:{padding:spacing.lg,gap:spacing.lg,paddingBottom:40},
  statsGrid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},
  stat:{width:'48%',minHeight:86,padding:spacing.md,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  statLabel:{fontSize:11,fontWeight:'800',color:colors.textSecondary},
  statValue:{fontSize:17,lineHeight:23,fontWeight:'900',color:colors.text,marginTop:7,fontVariant:['tabular-nums']},
  section:{gap:spacing.sm},
  sectionTitle:{fontSize:16,fontWeight:'900',color:colors.text},
  trend:{height:118,flexDirection:'row',alignItems:'flex-end',gap:3,padding:spacing.sm,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  trendCell:{flex:1,minWidth:0,alignItems:'center',justifyContent:'flex-end'},
  trendBar:{width:'72%',minWidth:3,borderRadius:4},
  trendDate:{fontSize:7,color:colors.textSecondary,marginTop:4},
  row:{padding:spacing.md,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,gap:6},
  rowHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.sm},
  date:{fontSize:15,fontWeight:'900',color:colors.text},
  badge:{fontSize:10,fontWeight:'900',paddingHorizontal:8,paddingVertical:4,borderRadius:radius.pill,overflow:'hidden'},
  badgeFinal:{backgroundColor:colors.surfaceMuted,color:colors.primary},
  badgeLive:{backgroundColor:colors.surfaceMuted,color:colors.warning},
  formula:{fontSize:13,lineHeight:20,color:colors.text},
  meta:{fontSize:10,lineHeight:15,color:colors.textSecondary},
  empty:{fontSize:12,lineHeight:18,color:colors.textSecondary,paddingVertical:spacing.md},
});
