import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AiQuestionBox } from '../components/AiQuestionBox';
import { FrameCard } from '../components/FrameCard';
import { MetricTile } from '../components/MetricTile';
import { PageEditorStack } from '../components/PageEditorStack';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import { PageShell } from '../components/PageShell';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import {buildDividendCalendarEvents,deviceLocalCalendarDate,dividendCalendarTypeLabel,filterDividendCalendarEvents} from '../dividend/dividendCalendar';
import { useAiNewsRuntime } from '../ai/AiNewsRuntime';
import {answerAiQuestion,type AiAssistantAction} from '../ai/aiAssistant';
import {dividendEventToLedger} from '../ai/dividendAssistant';
import { calculateLedgerCashFlow, type DividendLedgerEntry } from '../finance/canonicalLedger';
import { useFinance } from '../finance/FinanceRuntime';
import { useSettingsRuntime } from '../settings/SettingsRuntime';
import { colors, spacing } from '../theme/tokens';

const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');
const nowIso=()=>deviceLocalCalendarDate();

export function DividendScreen() {
  const finance=useFinance();
  const aiSettings=useSettingsRuntime();
  const aiNews=useAiNewsRuntime();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [month,setMonth]=useState(nowIso().slice(0,7));
  const today=nowIso();
  const [selectedDate,setSelectedDate]=useState(today);
  const [selectedDividendId,setSelectedDividendId]=useState<string|null>(null);
  const dividends=useMemo(()=>finance.entries.filter((x):x is DividendLedgerEntry=>x.kind==='dividend').sort((a,b)=>a.date.localeCompare(b.date)),[finance.entries]);
  const monthRows=dividends.filter(x=>x.date.startsWith(month));
  const monthTotal=monthRows.reduce((s,x)=>s+calculateLedgerCashFlow(x),0);
  const year=month.slice(0,4);
  const annual=dividends.filter(x=>x.date.startsWith(year)).reduce((s,x)=>s+calculateLedgerCashFlow(x),0);
  const monthlyAverage=annual/12;
  const calendarEvents=useMemo(()=>filterDividendCalendarEvents(
    buildDividendCalendarEvents(dividends,today),
    aiSettings.prefs.dividendCalendar,
  ),[dividends,today,aiSettings.prefs.dividendCalendar]);
  const monthEvents=calendarEvents.filter(event=>event.date.startsWith(month));
  const events=useMemo(()=>{
    const map=new Map<number,typeof monthEvents>();
    for(const event of monthEvents){
      const day=Number(event.date.slice(-2));
      map.set(day,[...(map.get(day)??[]),event]);
    }
    return map;
  },[calendarEvents,month]);
  const selectedEvents=monthEvents.filter(event=>event.date===selectedDate);
  const monthDate=new Date(month+'-01T12:00:00');
  const shiftMonth=(delta:number)=>{const d=new Date(monthDate);d.setMonth(d.getMonth()+delta);setMonth(deviceLocalCalendarDate(d).slice(0,7));};
  const firstWeekday=monthDate.getDay();
  const nextMonth=new Date(monthDate);nextMonth.setMonth(nextMonth.getMonth()+1);
  const daysInMonth=Math.round((nextMonth.getTime()-monthDate.getTime())/86400000);
  const calendarCells=Math.max(35,Math.ceil((firstWeekday+daysInMonth)/7)*7);
  const monthTotals=Array.from({length:12},(_,idx)=>{
    const key=year+'-'+String(idx+1).padStart(2,'0');
    return dividends.filter(x=>x.date.startsWith(key)).reduce((s,x)=>s+calculateLedgerCashFlow(x),0);
  });
  const maxMonth=Math.max(1,...monthTotals);
  const askDividend=async(question:string)=>{
    const q=question.toLowerCase();
    if(q.includes('本月'))return {intent:'dividend' as const,text:month+' 本月淨入帳 NT$ '+money(monthTotal)+'，共 '+monthRows.length+' 筆股息紀錄。'};
    if(q.includes('今年')||q.includes('年度'))return {intent:'dividend' as const,text:year+' 年度淨股息 NT$ '+money(annual)+'，月平均 NT$ '+money(monthlyAverage)+'。'};
    if(q.includes('最高')||q.includes('最多')){const max=Math.max(...monthTotals);const idx=monthTotals.indexOf(max);return {intent:'dividend' as const,text:year+' 年目前最高月份為 '+(idx+1)+' 月，淨股息 NT$ '+money(max)+'。'};}
    return answerAiQuestion(question,finance.holdings,finance.snapshot.portfolio,aiNews.items,finance.entries);
  };
  const runAiAction=(action:AiAssistantAction)=>{if(action.kind==='addDividend')finance.addDividend(dividendEventToLedger(action.event));};

  return <>
    <PageShell pageKey="dividend" title="股息中心" subtitle="股息淨額與現金入帳共用正式帳務核心" actions={<PageGearButton onPress={()=>setSettingsOpen(true)}/>}>
      <PageEditorStack pageKey="dividend" frames={[
        {key:'dividend-summary',element:
          <FrameCard title="股息摘要">
            <View style={styles.metrics}>
              <MetricTile label="本月淨入帳" value={money(monthTotal)} caption="扣 NHI／匯費" tone="gain"/>
              <MetricTile label="年度淨股息" value={money(annual)} caption={year}/>
              <MetricTile label="月平均股息" value={money(monthlyAverage)} caption="年度÷12"/>
            </View>
            {aiSettings.prefs.ai.enabled?<View style={styles.aiBox}><AiQuestionBox title="股息 AI 問答" suggestions={['更新持股股息日','這個月股息多少？','今年股息多少？','哪個月股息最高？']} onAsk={askDividend} onAction={runAiAction}/></View>:null}
          </FrameCard>
        },
        {key:'dividend-calendar',element:
          <FrameCard title="股息月曆">
            <View style={styles.calendarTop}>
              <Pressable onPress={()=>shiftMonth(-1)}><Text style={styles.arrow}>‹</Text></Pressable>
              <Text style={styles.month}>{month.replace('-',' 年 ')} 月</Text>
              <Pressable onPress={()=>shiftMonth(1)}><Text style={styles.arrow}>›</Text></Pressable>
            </View>
            <View style={styles.week}>{['日','一','二','三','四','五','六'].map(x=><Text key={x} style={styles.weekday}>{x}</Text>)}</View>
            <View style={styles.grid}>{Array.from({length:calendarCells},(_,i)=>{
              const day=i-firstWeekday+1;
              const valid=day>=1&&day<=daysInMonth;
              const dayEvents=valid?(events.get(day)??[]):[];
              const date=valid?month+'-'+String(day).padStart(2,'0'):'';
              return <Pressable key={i} disabled={!valid||!dayEvents.length} onPress={()=>setSelectedDate(date)} style={[styles.day,dayEvents.length>0&&styles.eventDay,selectedDate===date&&styles.selectedDay]}>
                <Text style={[styles.dayText,!valid&&styles.dayGhost]}>{valid?day:''}</Text>
                {dayEvents.length?<View style={styles.eventDots}>{dayEvents.slice(0,3).map(event=><View key={event.id} style={[styles.eventDot,{backgroundColor:event.type==='lastBuyDate'?'#8B5CF6':event.type==='exDate'?colors.primary:event.type==='recordDate'?colors.warning:colors.gain}]}/>)}</View>:null}
              </Pressable>;
            })}</View>
            {selectedEvents.length?<View style={styles.eventDetails}>{selectedEvents.map(event=><View key={event.id} style={styles.eventDetailRow}><Text style={styles.eventType}>{dividendCalendarTypeLabel(event.type)}</Text><Text style={styles.eventText}>{event.symbol} {event.name} · {event.date}{event.status?' · '+event.status:''}</Text></View>)}</View>:null}
            <View style={styles.legend}><Legend color="#8B5CF6" label="最後購買日"/><Legend color={colors.primary} label="除息日"/><Legend color={colors.warning} label="股權登記日"/><Legend color={colors.gain} label="股息配發日"/></View>
          </FrameCard>
        },
        {key:'dividend-list',element:
          <FrameCard title="股息清單">
            {monthRows.length?monthRows.map(row=>{
              const amount=calculateLedgerCashFlow(row);
              const status=row.date<today?'已入帳':row.date===today?'待入帳':'預估';
              return <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`查看 ${row.symbol} 股息資訊`} onPress={()=>setSelectedDividendId(current=>current===row.id?null:row.id)} style={styles.dividendRow}>
                <View style={styles.dateBadge}><Text style={styles.dateBadgeText}>{row.date.slice(5)}</Text></View>
                <View style={{flex:1}}>
                  <Text style={styles.stockName}>{row.name}</Text>
                  <Text style={styles.symbol}>{row.symbol} · {row.sharesHeld.toLocaleString('zh-TW')} 股 × {row.perShareAmount}</Text>
                  <Text style={styles.symbol}>{selectedDividendId===row.id?'▲ 收合股息資訊':'▼ 查看股息資訊'}</Text>
                  {selectedDividendId===row.id?<View style={styles.eventDetails}>
                    <Text style={styles.eventText}>配息股數：{row.sharesHeld.toLocaleString('zh-TW')} 股</Text>
                    <Text style={styles.eventText}>每股配息：NT$ {row.perShareAmount}</Text>
                    <Text style={styles.eventText}>帳務日期：{row.date}</Text>
                    {(['最後購買日','最後買進日','除息日','股權登記日','配發日'] as const).map(label=>{
                      const value=String(row.note??'').match(new RegExp(label+'\\s*(\\d{4}-\\d{2}-\\d{2})'))?.[1];
                      return <Text key={label} style={styles.eventText}>{label}：{value??'尚未取得可靠公告'}</Text>;
                    })}
                    <Text style={styles.eventText}>資料來源／備註：{row.note??'尚未記錄'}</Text>
                  </View>:null}
                </View>
                <View style={{alignItems:'flex-end'}}>
                  <Text style={styles.dividendAmount}>NT$ {money(amount)}</Text>
                  <Text style={[styles.status,{color:status==='已入帳'?colors.gain:status==='待入帳'?colors.warning:colors.primary}]}>{status}</Text>
                </View>
              </Pressable>;
            }):<Text style={styles.empty}>本月尚無股息紀錄</Text>}
          </FrameCard>
        },
        {key:'annual-trend',element:
          <FrameCard title="年度趨勢">
            <View style={styles.bars}>{monthTotals.map((amount,index)=>{
              const key=year+'-'+String(index+1).padStart(2,'0');
              const h=Math.max(3,Math.round(amount/maxMonth*82));
              return <Pressable key={key} onPress={()=>setMonth(key)} style={styles.barCol}>
                <View style={[styles.bar,{height:h}]}/><Text style={styles.barLabel}>{index+1}</Text>
              </Pressable>;
            })}</View>
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
  aiBox:{paddingTop:spacing.md,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  calendarTop:{flexDirection:'row',justifyContent:'center',gap:20,alignItems:'center'},
  month:{fontWeight:'900',fontSize:15,color:colors.text},
  arrow:{fontSize:24,fontWeight:'900',color:colors.primary},
  week:{flexDirection:'row'},
  weekday:{flex:1,textAlign:'center',fontSize:10,fontWeight:'800',color:colors.textSecondary},
  grid:{flexDirection:'row',flexWrap:'wrap'},
  day:{width:'14.285%',height:45,alignItems:'center',justifyContent:'center',borderRadius:10},
  eventDay:{backgroundColor:colors.surfaceMuted},
  selectedDay:{borderWidth:1,borderColor:colors.primary},
  dayText:{fontSize:12,fontWeight:'700',color:colors.text},
  dayGhost:{color:'transparent'},
  eventDots:{flexDirection:'row',gap:2,marginTop:4},
  eventDot:{width:5,height:5,borderRadius:3},
  eventDetails:{gap:6,padding:10,borderRadius:10,backgroundColor:colors.surfaceMuted},
  eventDetailRow:{flexDirection:'row',gap:8,alignItems:'flex-start'},
  eventType:{width:72,fontSize:10,fontWeight:'900',color:colors.primary},
  eventText:{flex:1,fontSize:10,lineHeight:16,color:colors.text},
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
  empty:{fontSize:12,color:colors.textSecondary,textAlign:'center',paddingVertical:18},
  bars:{height:108,flexDirection:'row',alignItems:'flex-end',gap:5,paddingTop:8},
  barCol:{flex:1,alignItems:'center',justifyContent:'flex-end',height:'100%'},
  bar:{width:'70%',backgroundColor:colors.primary,borderRadius:4,opacity:0.75},
  barLabel:{fontSize:8,color:colors.textSecondary,marginTop:5},
});
