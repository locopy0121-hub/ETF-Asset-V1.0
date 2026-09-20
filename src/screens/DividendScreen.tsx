import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { MetricTile } from '../components/MetricTile';
import { PageEditorStack } from '../components/PageEditorStack';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import { PageShell } from '../components/PageShell';
import { DEMO_DIVIDENDS } from '../data/demoData';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { colors, radius, spacing } from '../theme/tokens';

const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');

export function DividendScreen() {
  const [settingsOpen,setSettingsOpen]=useState(false);
  const total=DEMO_DIVIDENDS.reduce((s,x)=>s+x.amount,0);
  const events=useMemo(()=>new Map(DEMO_DIVIDENDS.map(x=>[Number(x.date.slice(-2)),x])),[]);
  return <>
    <PageShell title="股息中心" subtitle="以股息月曆掌握入金時間軸" actions={<PageGearButton onPress={()=>setSettingsOpen(true)}/>}>
      <PageEditorStack pageKey="dividend" frames={[
        {key:'dividend-summary',element:
          <FrameCard title="股息摘要">
            <View style={styles.metrics}>
              <MetricTile label="本月入金" value={money(total)} caption="預估＋實收" tone="gain"/>
              <MetricTile label="年度股息 Total" value="98,730" caption="+12.5% YoY"/>
              <MetricTile label="月平均股息" value="8,228" caption="今年"/>
            </View>
          </FrameCard>
        },
        {key:'dividend-calendar',element:
          <FrameCard title="股息月曆">
            <View style={styles.calendarTop}><Text style={styles.month}>‹　2026 年 9 月　›</Text><Text style={styles.filter}>全部 ▾</Text></View>
            <View style={styles.week}>{['日','一','二','三','四','五','六'].map(x=><Text key={x} style={styles.weekday}>{x}</Text>)}</View>
            <View style={styles.grid}>{Array.from({length:35},(_,i)=>{
              const day=i-1;
              const valid=day>=1&&day<=30;
              const event=valid?events.get(day):undefined;
              const statusColor=event?.status==='已入帳'?colors.gain:event?.status==='待入帳'?colors.warning:event?colors.primary:'transparent';
              return <View key={i} style={[styles.day,event&&styles.eventDay]}><Text style={[styles.dayText,!valid&&styles.dayGhost]}>{valid?day:''}</Text>{event?<View style={[styles.eventDot,{backgroundColor:statusColor}]}/>:null}</View>;
            })}</View>
            <View style={styles.legend}><Legend color={colors.primary} label="預估"/><Legend color={colors.warning} label="待入帳"/><Legend color={colors.gain} label="已入帳"/></View>
          </FrameCard>
        },
        {key:'dividend-list',element:
          <FrameCard title="股息清單">
            {DEMO_DIVIDENDS.map(row=><View key={row.id} style={styles.dividendRow}>
              <View style={styles.dateBadge}><Text style={styles.dateBadgeText}>{row.date.slice(5)}</Text></View>
              <View style={{flex:1}}><Text style={styles.stockName}>{row.name}</Text><Text style={styles.symbol}>{row.symbol}</Text></View>
              <View style={{alignItems:'flex-end'}}><Text style={styles.dividendAmount}>NT$ {money(row.amount)}</Text><Text style={[styles.status,{color:row.status==='已入帳'?colors.gain:row.status==='待入帳'?colors.warning:colors.primary}]}>{row.status}</Text></View>
            </View>)}
          </FrameCard>
        },
        {key:'annual-trend',element:
          <FrameCard title="年度趨勢">
            <View style={styles.bars}>{[32,38,46,42,68,52,61,57,74,63,80,88].map((h,i)=><View key={i} style={styles.barCol}><View style={[styles.bar,{height:h}]}/><Text style={styles.barLabel}>{i+1}</Text></View>)}</View>
          </FrameCard>
        },
      ]}/>
    </PageShell>
    <PageFrameSettingsModal visible={settingsOpen} pageKey="dividend" title="股息" frames={PAGE_FRAMES.dividend} onClose={()=>setSettingsOpen(false)}/>
  </>;
}
function Legend({color,label}:{color:string;label:string}){return <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:color}]}/><Text style={styles.legendText}>{label}</Text></View>}
const styles=StyleSheet.create({
  metrics:{flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},
  calendarTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  month:{fontWeight:'900',fontSize:15,color:colors.text},
  filter:{fontSize:11,fontWeight:'800',color:colors.primary,backgroundColor:colors.surfaceMuted,paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill},
  week:{flexDirection:'row'},
  weekday:{flex:1,textAlign:'center',fontSize:10,fontWeight:'800',color:colors.textSecondary},
  grid:{flexDirection:'row',flexWrap:'wrap'},
  day:{width:'14.285%',height:45,alignItems:'center',justifyContent:'center',borderRadius:10},
  eventDay:{backgroundColor:colors.surfaceMuted},
  dayText:{fontSize:12,fontWeight:'700',color:colors.text},
  dayGhost:{color:'transparent'},
  eventDot:{width:5,height:5,borderRadius:3,marginTop:4},
  legend:{flexDirection:'row',gap:spacing.lg,justifyContent:'center'},
  legendItem:{flexDirection:'row',alignItems:'center',gap:5},
  legendDot:{width:7,height:7,borderRadius:4},
  legendText:{fontSize:10,color:colors.textSecondary},
  dividendRow:{flexDirection:'row',alignItems:'center',gap:spacing.md,paddingVertical:11,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  dateBadge:{width:48,paddingVertical:7,borderRadius:10,backgroundColor:colors.surfaceMuted,alignItems:'center'},
  dateBadgeText:{fontSize:10,fontWeight:'800',color:colors.primary},
  stockName:{fontSize:13,fontWeight:'800',color:colors.text},
  symbol:{fontSize:10,color:colors.textSecondary,marginTop:2},
  dividendAmount:{fontSize:13,fontWeight:'900',color:colors.text},
  status:{fontSize:10,fontWeight:'800',marginTop:2},
  bars:{height:108,flexDirection:'row',alignItems:'flex-end',gap:5,paddingTop:8},
  barCol:{flex:1,alignItems:'center',justifyContent:'flex-end',height:'100%'},
  bar:{width:'70%',backgroundColor:colors.primary,borderRadius:4,opacity:0.75},
  barLabel:{fontSize:8,color:colors.textSecondary,marginTop:5},
});
