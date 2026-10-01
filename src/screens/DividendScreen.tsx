import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AiQuestionBox } from '../components/AiQuestionBox';
import { FrameCard } from '../components/FrameCard';
import { MetricTile } from '../components/MetricTile';
import { PageEditorStack } from '../components/PageEditorStack';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import { PageShell } from '../components/PageShell';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import {buildDividendCalendarEvents,deviceLocalCalendarDate,dividendCalendarTypeLabel,filterDividendCalendarEvents,type DividendCalendarEventType} from '../dividend/dividendCalendar';
import { useAiNewsRuntime } from '../ai/AiNewsRuntime';
import {answerAiQuestion,type AiAssistantAction} from '../ai/aiAssistant';
import {dividendEventToLedger} from '../ai/dividendAssistant';
import { calculateLedgerCashFlow, type DividendLedgerEntry } from '../finance/canonicalLedger';
import { useFinance } from '../finance/FinanceRuntime';
import { useSettingsRuntime } from '../settings/SettingsRuntime';
import { colors, spacing } from '../theme/tokens';

const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');
const nowIso=()=>deviceLocalCalendarDate();
const calendarEventColor=(type:DividendCalendarEventType)=>
  type==='lastBuyDate'?'#8B5CF6':type==='exDate'?colors.primary:type==='recordDate'?colors.warning:colors.gain;
const shortDate=(date:string)=>date?date.slice(5).replace('-',' / '):'';
const parseNumber=(value:string)=>{const n=Number(value.replace(/,/g,'').trim());return Number.isFinite(n)?n:0;};
const isIsoDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(new Date(value+'T12:00:00').getTime());

export function DividendScreen() {
  const finance=useFinance();
  const aiSettings=useSettingsRuntime();
  const aiNews=useAiNewsRuntime();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [month,setMonth]=useState(nowIso().slice(0,7));
  const today=nowIso();
  const [selectedDate,setSelectedDate]=useState(today);
  const [selectedDividendId,setSelectedDividendId]=useState<string|null>(null);
  const [addOpen,setAddOpen]=useState(false);
  const [addSymbol,setAddSymbol]=useState('');
  const [addName,setAddName]=useState('');
  const [addPaymentDate,setAddPaymentDate]=useState(today);
  const [addPerShare,setAddPerShare]=useState('');
  const [addShares,setAddShares]=useState('');
  const [addLastBuyDate,setAddLastBuyDate]=useState('');
  const [addExDate,setAddExDate]=useState('');
  const [addRecordDate,setAddRecordDate]=useState('');
  const [addNote,setAddNote]=useState('');
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
  const shiftMonth=(delta:number)=>{
    const d=new Date(monthDate);d.setMonth(d.getMonth()+delta);
    const next=deviceLocalCalendarDate(d).slice(0,7);
    setMonth(next);
    setSelectedDate(next===today.slice(0,7)?today:next+'-01');
  };
  const firstWeekday=monthDate.getDay();
  const nextMonth=new Date(monthDate);nextMonth.setMonth(nextMonth.getMonth()+1);
  const daysInMonth=Math.round((nextMonth.getTime()-monthDate.getTime())/86400000);
  const calendarCells=Math.max(35,Math.ceil((firstWeekday+daysInMonth)/7)*7);
  const monthTotals=Array.from({length:12},(_,idx)=>{
    const key=year+'-'+String(idx+1).padStart(2,'0');
    return dividends.filter(x=>x.date.startsWith(key)).reduce((s,x)=>s+calculateLedgerCashFlow(x),0);
  });
  const maxMonth=Math.max(1,...monthTotals);
  const addPerShareValue=parseNumber(addPerShare);
  const addSharesValue=parseNumber(addShares);
  const addInstrument=finance.holdings.find(row=>row.symbol===addSymbol.trim().toUpperCase());
  const addPreview:DividendLedgerEntry|null=
    addSymbol.trim()&&addName.trim()&&isIsoDate(addPaymentDate)&&addPerShareValue>0&&addSharesValue>0
      ?{
        id:'preview-dividend-entry',
        date:addPaymentDate,
        kind:'dividend',
        symbol:addSymbol.trim().toUpperCase(),
        name:addName.trim(),
        perShareAmount:addPerShareValue,
        sharesHeld:addSharesValue,
      }
      :null;
  const addGross=addPreview?Math.floor(addPreview.perShareAmount*addPreview.sharesHeld):0;
  const addNet=addPreview?calculateLedgerCashFlow(addPreview):0;
  const openAddDividend=(symbol?:string)=>{
    const holding=finance.holdings.find(row=>row.symbol===(symbol??finance.holdings[0]?.symbol));
    setAddSymbol(holding?.symbol??'');
    setAddName(holding?.name??'');
    setAddShares(holding?.shares?String(holding.shares):'');
    setAddPaymentDate(today);
    setAddPerShare('');
    setAddLastBuyDate('');
    setAddExDate('');
    setAddRecordDate('');
    setAddNote('');
    setAddOpen(true);
  };
  const updateAddSymbol=(value:string)=>{
    const symbol=value.toUpperCase().replace(/\s/g,'');
    setAddSymbol(symbol);
    const holding=finance.holdings.find(row=>row.symbol===symbol);
    if(holding){
      setAddName(holding.name);
      setAddShares(String(holding.shares));
    }
  };
  const saveDividend=()=>{
    if(!addPreview){
      Alert.alert('資料未完整','請確認 ETF 代號、名稱、配發日、每股股息與符合配息股數。');
      return;
    }
    if(addPaymentDate>today){
      Alert.alert('尚未入帳','未來配發日不能直接寫入現金帳務。請在實際配發後新增；未來事件保留在股息月曆／配息事件中。');
      return;
    }
    const optionalDates=[
      ['最後購買日',addLastBuyDate],
      ['除息日',addExDate],
      ['股權登記日',addRecordDate],
    ] as const;
    const invalid=optionalDates.find(([,value])=>value.trim()&&!isIsoDate(value.trim()));
    if(invalid){
      Alert.alert('日期格式錯誤',invalid[0]+'請使用 YYYY-MM-DD。');
      return;
    }
    const duplicate=dividends.some(row=>
      row.symbol===addPreview.symbol&&
      row.date===addPreview.date&&
      Math.abs(row.perShareAmount-addPreview.perShareAmount)<0.000001&&
      Math.abs(row.sharesHeld-addPreview.sharesHeld)<0.000001
    );
    if(duplicate){
      Alert.alert('疑似重複股息','相同 ETF、配發日、每股股息與股數的紀錄已存在，未再次新增。');
      return;
    }
    const note=[
      '手動股息建檔',
      addLastBuyDate.trim()?('最後購買日 '+addLastBuyDate.trim()):'',
      addExDate.trim()?('除息日 '+addExDate.trim()):'',
      addRecordDate.trim()?('股權登記日 '+addRecordDate.trim()):'',
      '配發日 '+addPaymentDate,
      addNote.trim(),
    ].filter(Boolean).join('；');
    finance.addDividend({...addPreview,id:'dividend-manual-'+Date.now(),note});
    setMonth(addPaymentDate.slice(0,7));
    setSelectedDate(addPaymentDate);
    setAddOpen(false);
    Alert.alert('新增完成',addPreview.symbol+' 股息紀錄已寫入帳務核心、股息清單與月曆。');
  };
  const askDividend=async(question:string)=>{
    const q=question.toLowerCase();
    if(q.includes('本月'))return {intent:'dividend' as const,text:month+' 本月淨入帳 NT$ '+money(monthTotal)+'，共 '+monthRows.length+' 筆股息紀錄。'};
    if(q.includes('今年')||q.includes('年度'))return {intent:'dividend' as const,text:year+' 年度淨股息 NT$ '+money(annual)+'，月平均 NT$ '+money(monthlyAverage)+'。'};
    if(q.includes('最高')||q.includes('最多')){const max=Math.max(...monthTotals);const idx=monthTotals.indexOf(max);return {intent:'dividend' as const,text:year+' 年目前最高月份為 '+(idx+1)+' 月，淨股息 NT$ '+money(max)+'。'};}
    return answerAiQuestion(question,finance.holdings,finance.snapshot.portfolio,aiNews.items,finance.entries);
  };
  const runAiAction=(action:AiAssistantAction)=>{if(action.kind==='addDividend')finance.addDividend(dividendEventToLedger(action.event));};

  return <>
    <PageShell pageKey="dividend" title="股息中心" subtitle="股息淨額與現金入帳共用正式帳務核心" actions={<View style={styles.headerActions}><Pressable accessibilityRole="button" accessibilityLabel="新增股息" onPress={()=>openAddDividend()} style={styles.addHeaderButton}><Text style={styles.addHeaderButtonText}>＋ 新增</Text></Pressable><PageGearButton onPress={()=>setSettingsOpen(true)}/></View>}>
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
          <FrameCard title="股息月曆" action={<Text style={styles.calendarCount}>{monthEvents.length} 項事件</Text>}>
            <View style={styles.calendarTop}>
              <Pressable accessibilityRole="button" accessibilityLabel="上一個月" onPress={()=>shiftMonth(-1)} style={styles.arrowButton}><Text style={styles.arrow}>‹</Text></Pressable>
              <View style={styles.monthBlock}>
                <Text style={styles.month}>{month.replace('-',' 年 ')} 月</Text>
                <Text style={styles.monthCaption}>{month===today.slice(0,7)?'本月':'股息事件月曆'}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="下一個月" onPress={()=>shiftMonth(1)} style={styles.arrowButton}><Text style={styles.arrow}>›</Text></Pressable>
            </View>
            <View style={styles.week}>{['日','一','二','三','四','五','六'].map((x,index)=><Text key={x} style={[styles.weekday,(index===0||index===6)&&styles.weekend]}>{x}</Text>)}</View>
            <View style={styles.grid}>{Array.from({length:calendarCells},(_,i)=>{
              const day=i-firstWeekday+1;
              const valid=day>=1&&day<=daysInMonth;
              const dayEvents=valid?(events.get(day)??[]):[];
              const date=valid?month+'-'+String(day).padStart(2,'0'):'';
              const selected=valid&&selectedDate===date;
              const isToday=valid&&today===date;
              return <Pressable
                key={i}
                disabled={!valid}
                accessibilityRole="button"
                accessibilityLabel={valid?`${date}，${dayEvents.length} 項股息事件`:'空白日期'}
                onPress={()=>valid&&setSelectedDate(date)}
                style={[styles.day,!valid&&styles.dayInvalid,dayEvents.length>0&&styles.eventDay,selected&&styles.selectedDay]}
              >
                <View style={[styles.dayNumberWrap,isToday&&styles.todayNumberWrap,selected&&styles.selectedNumberWrap]}>
                  <Text style={[styles.dayText,!valid&&styles.dayGhost,selected&&styles.selectedDayText]}>{valid?day:''}</Text>
                </View>
                {dayEvents.length?<View style={styles.eventDots}>
                  {dayEvents.slice(0,3).map(event=><View key={event.id} style={[styles.eventDot,{backgroundColor:calendarEventColor(event.type)}]}/>)}
                  {dayEvents.length>3?<Text style={styles.moreEvents}>+{dayEvents.length-3}</Text>:null}
                </View>:<View style={styles.eventDotsPlaceholder}/>}
              </Pressable>;
            })}</View>
            {selectedDate.startsWith(month)?<View style={styles.eventDetails}>
              <View style={styles.eventDetailHeader}>
                <View>
                  <Text style={styles.eventDetailDate}>{shortDate(selectedDate)}</Text>
                  <Text style={styles.eventDetailTitle}>{selectedDate===today?'今天':'日期事件'}</Text>
                </View>
                <Text style={styles.eventDetailCount}>{selectedEvents.length?selectedEvents.length+' 項':'無事件'}</Text>
              </View>
              {selectedEvents.length?selectedEvents.map(event=><View key={event.id} style={styles.eventDetailRow}>
                <View style={[styles.eventTypeBadge,{backgroundColor:calendarEventColor(event.type)+'18'}]}>
                  <View style={[styles.eventTypeDot,{backgroundColor:calendarEventColor(event.type)}]}/>
                  <Text style={[styles.eventType,{color:calendarEventColor(event.type)}]}>{dividendCalendarTypeLabel(event.type)}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventSymbol}>{event.symbol} · {event.name}</Text>
                  <Text style={styles.eventText}>{event.date}{event.status?' · '+event.status:''}</Text>
                </View>
              </View>):<Text style={styles.noEventText}>這一天沒有已記錄的股息事件。</Text>}
            </View>:null}
            <View style={styles.legend}>
              <Legend color="#8B5CF6" label="最後購買日"/>
              <Legend color={colors.primary} label="除息日"/>
              <Legend color={colors.warning} label="股權登記日"/>
              <Legend color={colors.gain} label="股息配發日"/>
            </View>
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
    <Modal visible={addOpen} transparent animationType="slide" onRequestClose={()=>setAddOpen(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={{flex:1}}>
              <Text style={styles.modalTitle}>新增股息</Text>
              <Text style={styles.modalSubtitle}>實際入帳後寫入 Canonical Ledger，並同步股息清單、月曆與統計</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="關閉新增股息" onPress={()=>setAddOpen(false)} style={styles.modalClose}><Text style={styles.modalCloseText}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {finance.holdings.length?<View>
              <Text style={styles.fieldLabel}>快速選擇目前持股</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.holdingChips}>
                {finance.holdings.map(row=><Pressable key={row.symbol} onPress={()=>openAddDividend(row.symbol)} style={[styles.holdingChip,addSymbol===row.symbol&&styles.holdingChipActive]}>
                  <Text style={[styles.holdingChipCode,addSymbol===row.symbol&&styles.holdingChipCodeActive]}>{row.symbol}</Text>
                  <Text style={styles.holdingChipShares}>{row.shares.toLocaleString('zh-TW')} 股</Text>
                </Pressable>)}
              </ScrollView>
            </View>:null}

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>ETF 代號</Text>
              <TextInput value={addSymbol} onChangeText={updateAddSymbol} autoCapitalize="characters" autoCorrect={false} placeholder="例如 0050" style={styles.formInput}/>
              {addInstrument?<Text style={styles.autoFillHint}>已從目前持股帶入：{addInstrument.name} · {addInstrument.shares.toLocaleString('zh-TW')} 股</Text>:null}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>ETF 名稱</Text>
              <TextInput value={addName} onChangeText={setAddName} placeholder="ETF 名稱" style={styles.formInput}/>
            </View>

            <View style={styles.formTwo}>
              <View style={{flex:1}}>
                <Text style={styles.fieldLabel}>股息配發／入帳日</Text>
                <TextInput value={addPaymentDate} onChangeText={setAddPaymentDate} placeholder="YYYY-MM-DD" style={styles.formInput}/>
              </View>
              <View style={{flex:1}}>
                <Text style={styles.fieldLabel}>每股股息</Text>
                <TextInput value={addPerShare} onChangeText={setAddPerShare} keyboardType="decimal-pad" placeholder="0" style={styles.formInput}/>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>符合配息股數</Text>
              <TextInput value={addShares} onChangeText={setAddShares} keyboardType="decimal-pad" placeholder="0" style={styles.formInput}/>
              <Text style={styles.formHint}>目前持股只作為快速帶入，可依實際除息資格自行修正。</Text>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>入帳預覽</Text>
              <View style={styles.previewRow}><Text style={styles.previewLabel}>股息總額</Text><Text style={styles.previewValue}>NT$ {money(addGross)}</Text></View>
              <View style={styles.previewRow}><Text style={styles.previewLabel}>正式帳務淨入帳</Text><Text style={styles.previewValueStrong}>NT$ {money(addNet)}</Text></View>
              <Text style={styles.formHint}>淨入帳沿用既有股息核心規則計算，不在此表單另造公式。</Text>
            </View>

            <Text style={styles.formSectionTitle}>股息事件日期（選填）</Text>
            <View style={styles.formGroup}><Text style={styles.fieldLabel}>最後購買日</Text><TextInput value={addLastBuyDate} onChangeText={setAddLastBuyDate} placeholder="YYYY-MM-DD" style={styles.formInput}/></View>
            <View style={styles.formGroup}><Text style={styles.fieldLabel}>除息日</Text><TextInput value={addExDate} onChangeText={setAddExDate} placeholder="YYYY-MM-DD" style={styles.formInput}/></View>
            <View style={styles.formGroup}><Text style={styles.fieldLabel}>股權登記日</Text><TextInput value={addRecordDate} onChangeText={setAddRecordDate} placeholder="YYYY-MM-DD" style={styles.formInput}/></View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>備註</Text>
              <TextInput value={addNote} onChangeText={setAddNote} placeholder="資料來源、入帳備註等" multiline style={[styles.formInput,styles.formInputMultiline]}/>
            </View>

            <Pressable disabled={!addPreview} onPress={saveDividend} style={[styles.saveDividendButton,!addPreview&&styles.saveDividendButtonDisabled]}>
              <Text style={styles.saveDividendButtonText}>確認新增股息紀錄</Text>
            </Pressable>
            <Text style={styles.formWarning}>未來配發日不直接寫入現金帳務；實際入帳後再建立紀錄，避免預估股息提前灌入現金與總資產。</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
    <PageFrameSettingsModal visible={settingsOpen} pageKey="dividend" title="股息" frames={PAGE_FRAMES.dividend} onClose={()=>setSettingsOpen(false)}/>
  </>;
}
function Legend({color,label}:{color:string;label:string}){return <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:color}]}/><Text style={styles.legendText}>{label}</Text></View>}
const styles=StyleSheet.create({
  headerActions:{flexDirection:'row',alignItems:'center',gap:8},
  addHeaderButton:{minHeight:36,paddingHorizontal:12,borderRadius:12,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},
  addHeaderButtonText:{fontSize:11,fontWeight:'900',color:'#FFFFFF'},
  modalBackdrop:{flex:1,backgroundColor:'#00000066',justifyContent:'flex-end'},
  modalSheet:{maxHeight:'92%',backgroundColor:colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,overflow:'hidden'},
  modalHeader:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:18,paddingTop:16,paddingBottom:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  modalTitle:{fontSize:20,fontWeight:'900',color:colors.text},
  modalSubtitle:{fontSize:9,lineHeight:14,color:colors.textSecondary,marginTop:2},
  modalClose:{width:34,height:34,borderRadius:17,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center'},
  modalCloseText:{fontSize:22,lineHeight:24,fontWeight:'700',color:colors.textSecondary},
  modalContent:{padding:18,gap:12,paddingBottom:28},
  holdingChips:{gap:8,paddingVertical:3},
  holdingChip:{minWidth:84,paddingHorizontal:10,paddingVertical:8,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surfaceMuted},
  holdingChipActive:{borderColor:colors.primary,backgroundColor:'#E8F1FF'},
  holdingChipCode:{fontSize:11,fontWeight:'900',color:colors.text},
  holdingChipCodeActive:{color:colors.primary},
  holdingChipShares:{fontSize:8,color:colors.textSecondary,marginTop:2},
  formGroup:{gap:5},
  formTwo:{flexDirection:'row',gap:10},
  fieldLabel:{fontSize:10,fontWeight:'900',color:colors.textSecondary},
  formInput:{minHeight:42,borderWidth:1,borderColor:colors.border,borderRadius:12,backgroundColor:colors.background,paddingHorizontal:11,paddingVertical:8,fontSize:12,color:colors.text},
  formInputMultiline:{minHeight:78,textAlignVertical:'top'},
  autoFillHint:{fontSize:9,color:colors.primary,fontWeight:'700'},
  formHint:{fontSize:9,lineHeight:14,color:colors.textSecondary},
  formWarning:{fontSize:9,lineHeight:14,color:colors.warning,fontWeight:'700'},
  formSectionTitle:{fontSize:12,fontWeight:'900',color:colors.text,marginTop:3},
  previewCard:{gap:7,padding:12,borderRadius:14,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},
  previewTitle:{fontSize:11,fontWeight:'900',color:colors.text},
  previewRow:{flexDirection:'row',justifyContent:'space-between',gap:12},
  previewLabel:{fontSize:10,color:colors.textSecondary},
  previewValue:{fontSize:10,fontWeight:'800',color:colors.text},
  previewValueStrong:{fontSize:11,fontWeight:'900',color:colors.gain},
  saveDividendButton:{minHeight:46,borderRadius:14,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},
  saveDividendButtonDisabled:{opacity:0.45},
  saveDividendButtonText:{fontSize:12,fontWeight:'900',color:'#FFFFFF'},
  metrics:{flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},
  aiBox:{paddingTop:spacing.md,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  calendarCount:{fontSize:10,fontWeight:'900',color:colors.primary,backgroundColor:colors.surfaceMuted,paddingHorizontal:9,paddingVertical:5,borderRadius:999},
  calendarTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:4,paddingVertical:2},
  monthBlock:{alignItems:'center',gap:2},
  month:{fontWeight:'900',fontSize:18,color:colors.text,fontVariant:['tabular-nums']},
  monthCaption:{fontSize:9,fontWeight:'700',color:colors.textSecondary},
  arrowButton:{width:36,height:36,borderRadius:18,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center'},
  arrow:{fontSize:25,lineHeight:27,fontWeight:'900',color:colors.primary},
  week:{flexDirection:'row',paddingTop:2,paddingBottom:5,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  weekday:{flex:1,textAlign:'center',fontSize:10,fontWeight:'900',color:colors.textSecondary},
  weekend:{color:colors.primary},
  grid:{flexDirection:'row',flexWrap:'wrap',paddingTop:6},
  day:{width:'14.285%',height:48,alignItems:'center',justifyContent:'center',borderRadius:12,paddingTop:3},
  dayInvalid:{opacity:0},
  eventDay:{backgroundColor:colors.surfaceMuted},
  selectedDay:{backgroundColor:'#E8F1FF',borderWidth:1.5,borderColor:colors.primary},
  dayNumberWrap:{width:26,height:26,borderRadius:13,alignItems:'center',justifyContent:'center'},
  todayNumberWrap:{borderWidth:1,borderColor:colors.primary},
  selectedNumberWrap:{backgroundColor:colors.primary},
  dayText:{fontSize:12,fontWeight:'800',color:colors.text},
  selectedDayText:{color:'#FFFFFF',fontWeight:'900'},
  dayGhost:{color:'transparent'},
  eventDots:{height:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:2,marginTop:2},
  eventDotsPlaceholder:{height:10,marginTop:2},
  eventDot:{width:5,height:5,borderRadius:3},
  moreEvents:{fontSize:7,fontWeight:'900',color:colors.textSecondary,marginLeft:1},
  eventDetails:{gap:8,padding:12,borderRadius:14,backgroundColor:colors.surfaceMuted,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.border},
  eventDetailHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingBottom:3},
  eventDetailDate:{fontSize:15,fontWeight:'900',color:colors.text,fontVariant:['tabular-nums']},
  eventDetailTitle:{fontSize:9,fontWeight:'800',color:colors.textSecondary,marginTop:1},
  eventDetailCount:{fontSize:9,fontWeight:'900',color:colors.primary,backgroundColor:'#FFFFFF',paddingHorizontal:8,paddingVertical:4,borderRadius:999},
  eventDetailRow:{flexDirection:'row',gap:8,alignItems:'center',paddingVertical:3},
  eventTypeBadge:{minWidth:82,flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:8,paddingVertical:6,borderRadius:999},
  eventTypeDot:{width:6,height:6,borderRadius:3},
  eventType:{fontSize:9,fontWeight:'900'},
  eventInfo:{flex:1,minWidth:0},
  eventSymbol:{fontSize:10,fontWeight:'900',color:colors.text},
  eventText:{fontSize:9,lineHeight:14,color:colors.textSecondary,marginTop:1},
  noEventText:{fontSize:10,lineHeight:16,color:colors.textSecondary,paddingVertical:5},
  legend:{flexDirection:'row',flexWrap:'wrap',gap:6,justifyContent:'center'},
  legendItem:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:colors.surfaceMuted,paddingHorizontal:8,paddingVertical:5,borderRadius:999},
  legendDot:{width:7,height:7,borderRadius:4},
  legendText:{fontSize:9,fontWeight:'700',color:colors.textSecondary},
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
