import {marketCalendarLabel} from '../market/marketCenterViews';
import {EditorSurface} from '../components/EditorSurface';
import {useDisplayFormat} from '../settings/useDisplayFormat';
import { useEffect, useMemo, useState } from 'react';
import {Alert,Modal,ScrollView,StyleSheet,View} from 'react-native';
import {Pressable,Text,TextInput} from '../components/EditableNative';

import { AiQuestionBox } from '../components/AiQuestionBox';
import { CalendarDatePickerModal } from '../components/CalendarDatePickerModal';
import { FrameCard } from '../components/FrameCard';
import { MetricTile } from '../components/MetricTile';
import { PageEditorStack } from '../components/PageEditorStack';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import { PageShell } from '../components/PageShell';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import {buildDividendCalendarEvents,buildDividendPlanCalendarEvents,deviceLocalCalendarDate,dividendCalendarTypeLabel,filterDividendCalendarEvents,type DividendCalendarEventType} from '../dividend/dividendCalendar';
import { useAiNewsRuntime } from '../ai/AiNewsRuntime';
import {answerAiQuestion,type AiAssistantAction} from '../ai/aiAssistant';
import {dividendEventToPlan} from '../ai/dividendAssistant';
import { calculateLedgerCashFlow, type DividendLedgerEntry } from '../finance/canonicalLedger';
import { useFinance } from '../finance/FinanceRuntime';
import { useSettingsRuntime } from '../settings/SettingsRuntime';
import { colors, spacing } from '../theme/tokens';

import {isIsoCalendarDate as isIsoDate,validateDividendDates,validateDividendPlan,dividendAutofill,dividendEligibleShares,dividendPlanStatus,dividendPlanToLedger,type DividendPlan} from '../dividend/dividendPlans';

const nowIso=()=>deviceLocalCalendarDate();
const calendarEventColor=(type:DividendCalendarEventType)=>
  type==='lastBuyDate'?'#8B5CF6':type==='exDate'?colors.primary:type==='recordDate'?colors.warning:colors.gain;
const shortDate=(date:string)=>date?date.slice(5).replace('-',' / '):'';
const parseNumber=(value:string)=>{const n=Number(value.replace(/,/g,'').trim());return Number.isFinite(n)?n:0;};
const noteDate=(note:string|undefined,labels:readonly string[])=>{for(const label of labels){const value=String(note??'').match(new RegExp(label+'\\s*(\\d{4}-\\d{2}-\\d{2})'))?.[1];if(value)return value;}return '';};
type DividendDatePickerTarget='payment'|'lastBuy'|'ex'|'record';

export function DividendScreen() {
  const {money,percent,date:displayDate}=useDisplayFormat();
  const finance=useFinance();
  const aiSettings=useSettingsRuntime();
  const aiNews=useAiNewsRuntime();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [month,setMonth]=useState(nowIso().slice(0,7));
  const today=nowIso();
  const [selectedDate,setSelectedDate]=useState(today);
  const [selectedDividendId,setSelectedDividendId]=useState<string|null>(null);
  const [addOpen,setAddOpen]=useState(false);
  const [addMode,setAddMode]=useState<'receipt'|'forecast'>('receipt');
  const [editPlanId,setEditPlanId]=useState<string|null>(null);
  const [addSymbol,setAddSymbol]=useState('');
  const [addName,setAddName]=useState('');
  const [addPaymentDate,setAddPaymentDate]=useState(today);
  const [addPerShare,setAddPerShare]=useState('');
  const [addShares,setAddShares]=useState('');
  const [sharesAuto,setSharesAuto]=useState(true);
  const [addLastBuyDate,setAddLastBuyDate]=useState('');
  const [addExDate,setAddExDate]=useState('');
  const [addRecordDate,setAddRecordDate]=useState('');
  const [addNote,setAddNote]=useState('');
  const [datePickerTarget,setDatePickerTarget]=useState<DividendDatePickerTarget|null>(null);
  const dividends=useMemo(()=>finance.entries.filter((x):x is DividendLedgerEntry=>x.kind==='dividend').sort((a,b)=>a.date.localeCompare(b.date)),[finance.entries]);
  const monthRows=dividends.filter(x=>x.date.startsWith(month));
  const monthTotal=monthRows.reduce((s,x)=>s+calculateLedgerCashFlow(x),0);
  const year=month.slice(0,4);
  const annual=dividends.filter(x=>x.date.startsWith(year)).reduce((s,x)=>s+calculateLedgerCashFlow(x),0);
  const monthlyAverage=annual/12;
  const calendarEvents=useMemo(()=>filterDividendCalendarEvents(
    [...buildDividendCalendarEvents(dividends,today),...buildDividendPlanCalendarEvents(finance.dividendPlans,dividends)],
    aiSettings.prefs.dividendCalendar,
  ),[dividends,today,aiSettings.prefs.dividendCalendar,finance.dividendPlans]);
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
  const draftPlan:DividendPlan={id:editPlanId??'preview',symbol:addSymbol.trim().toUpperCase(),name:addName.trim(),status:'forecast',paymentDate:addPaymentDate,lastBuyDate:addLastBuyDate,exDate:addExDate,recordDate:addRecordDate,perShareAmount:addPerShare.trim()?addPerShareValue:null,sharesHeld:addShares.trim()?addSharesValue:null,note:addNote.trim()};
  const dateError=validateDividendDates(draftPlan);
  const formError=addMode==='forecast'?validateDividendPlan(draftPlan):dateError;
  const canSave=addMode==='forecast'?!formError:Boolean(addPreview)&&!formError;
  const monthPlans=finance.dividendPlans.filter(plan=>dividendPlanStatus(plan,finance.entries)!=='paid'&&(plan.paymentDate||plan.exDate||plan.recordDate||plan.lastBuyDate).startsWith(month));
  const applyPlan=(action:Parameters<typeof finance.applyDividendPlan>[0])=>{
    const error=finance.applyDividendPlan(action);if(error)Alert.alert('未完成',error);
    return !error;
  };
  const editPlan=(plan:DividendPlan)=>{
    setEditPlanId(plan.id);setSharesAuto(false);setAddMode('forecast');setAddSymbol(plan.symbol);setAddName(plan.name);
    setAddPaymentDate(plan.paymentDate);setAddPerShare(plan.perShareAmount===null?'':String(plan.perShareAmount));setAddShares(plan.sharesHeld===null?'':String(plan.sharesHeld));
    setAddLastBuyDate(plan.lastBuyDate);setAddExDate(plan.exDate);setAddRecordDate(plan.recordDate);setAddNote(plan.note);setAddOpen(true);
  };
  const postPlan=(plan:DividendPlan)=>Alert.alert('確認實際收到股息',plan.symbol+' 淨入帳 NT$ '+money(calculateLedgerCashFlow(dividendPlanToLedger(plan)))+'。請核對已收款及符合配息股數，再寫入正式帳務。',[
    {text:'取消',style:'cancel'},{text:'確認入帳',onPress:()=>applyPlan({type:'post',id:plan.id})},
  ]);
  const eligibleShares=useMemo(()=>dividendEligibleShares(finance.entries,addSymbol,addLastBuyDate,addExDate,today),[finance.entries,addSymbol,addLastBuyDate,addExDate,today]);
  useEffect(()=>{if(sharesAuto&&eligibleShares!==null)setAddShares(String(eligibleShares));},[sharesAuto,eligibleShares]);
  const addGross=addPreview?Math.floor(addPreview.perShareAmount*addPreview.sharesHeld):0;
  const addNet=addPreview?calculateLedgerCashFlow(addPreview):0;
  const openAddDividend=(symbol?:string)=>{
    setAddMode('receipt');setEditPlanId(null);setSharesAuto(true);
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
    setDatePickerTarget(null);
    setAddOpen(true);
  };
  const updateAddSymbol=(value:string)=>{
    const symbol=value.toUpperCase().replace(/\s/g,'');
    setAddSymbol(symbol);
    if(symbol===addSymbol)return;
    const autofill=dividendAutofill(symbol,finance.holdings);
    const previous=finance.entries.slice().reverse().find(row=>'symbol' in row&&row.symbol===symbol);
    setAddName(autofill.name||(previous&&'name' in previous?previous.name:''));setAddShares(autofill.shares);setSharesAuto(true);
    // Every distribution belongs to one security; none of its previous metadata carries over.
    setAddPerShare('');setAddPaymentDate(addMode==='forecast'?'':today);setAddLastBuyDate('');setAddExDate('');setAddRecordDate('');setAddNote('');

  };
  const saveDividend=()=>{
    if(formError){Alert.alert('請核對股息資料',formError);return;}
    if(addMode==='forecast'){
      const plan={...draftPlan,id:editPlanId??('manual-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8))};
      if(!applyPlan({type:'save',plan}))return;
      const date=plan.paymentDate||plan.exDate||plan.recordDate||plan.lastBuyDate;
      setMonth(date.slice(0,7));setSelectedDate(date);setAddOpen(false);
      Alert.alert('預告已保存','事件已加入月曆與股息清單，尚未增加現金；確認資料後可手動入帳。');return;
    }
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
      ['收益分配基準日',addRecordDate],
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
      addRecordDate.trim()?('收益分配基準日 '+addRecordDate.trim()):'',
      '配發日 '+addPaymentDate,
      addNote.trim(),
    ].filter(Boolean).join('；');
    if(!finance.addDividend({...addPreview,id:'dividend-manual-'+Date.now(),note}))return;
    setMonth(addPaymentDate.slice(0,7));
    setSelectedDate(addPaymentDate);
    setAddOpen(false);
    Alert.alert('新增完成',addPreview.symbol+' 股息紀錄已寫入帳務核心、股息清單與月曆。');
  };
  const datePickerValue=datePickerTarget==='payment'?addPaymentDate:datePickerTarget==='lastBuy'?addLastBuyDate:datePickerTarget==='ex'?addExDate:datePickerTarget==='record'?addRecordDate:today;
  const datePickerTitle=datePickerTarget==='payment'?'選擇股息配發／入帳日':datePickerTarget==='lastBuy'?'選擇最後購買日':datePickerTarget==='ex'?'選擇除息日':'選擇收益分配基準日';
  const updatePickedDate=(value:string)=>{
    if(datePickerTarget==='payment'){setAddPaymentDate(value);if(value>today||!value)setAddMode('forecast');}
    else if(datePickerTarget==='lastBuy')setAddLastBuyDate(value);
    else if(datePickerTarget==='ex')setAddExDate(value);
    else if(datePickerTarget==='record')setAddRecordDate(value);
  };
  const askDividend=async(question:string)=>{
    const q=question.toLowerCase();
    if(q.includes('本月'))return {intent:'dividend' as const,text:month+' 本月淨入帳 NT$ '+money(monthTotal)+'，共 '+monthRows.length+' 筆股息紀錄。'};
    if(q.includes('今年')||q.includes('年度'))return {intent:'dividend' as const,text:year+' 年度淨股息 NT$ '+money(annual)+'，月平均 NT$ '+money(monthlyAverage)+'。'};
    if(q.includes('最高')||q.includes('最多')){const max=Math.max(...monthTotals);const idx=monthTotals.indexOf(max);return {intent:'dividend' as const,text:year+' 年目前最高月份為 '+(idx+1)+' 月，淨股息 NT$ '+money(max)+'。'};}
    return answerAiQuestion(question,finance.holdings,finance.snapshot.portfolio,aiNews.items,finance.entries);
  };
  const runAiAction=(action:AiAssistantAction)=>{if(action.kind==='addDividend'){const error=finance.applyDividendPlan({type:'import',plan:dividendEventToPlan(action.event)});if(error)Alert.alert('未儲存股息預告',error);else Alert.alert('已儲存股息預告','請到股息頁核對日期與符合配息股數，確認實際收到款項後再入帳。');};};

  const dividendPreviewElements = [
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
          <FrameCard title="股息月曆" action={<Text editorId="native:DividendScreen:calendarCount:3" editorReadOnly={true} style={styles.calendarCount}>{monthEvents.length} 項事件</Text>}>
            <View style={styles.calendarTop}>
              <Pressable editorId="native:DividendScreen:arrowButton:4" accessibilityRole="button" accessibilityLabel="上一個月" onPress={()=>shiftMonth(-1)} style={styles.arrowButton}><Text editorId="native:DividendScreen:arrow:5" editorReadOnly={false} style={styles.arrow}>‹</Text></Pressable>
              <View style={styles.monthBlock}>
                <Text editorId="native:DividendScreen:month:6" editorReadOnly={true} style={styles.month}>{month.replace('-',' 年 ')} 月</Text>
                <Text editorId="native:DividendScreen:monthCaption:7" editorReadOnly={true} style={styles.monthCaption}>{month===today.slice(0,7)?'本月':'股息事件月曆'}</Text>
              </View>
              <Pressable editorId="native:DividendScreen:arrowButton:8" accessibilityRole="button" accessibilityLabel="下一個月" onPress={()=>shiftMonth(1)} style={styles.arrowButton}><Text editorId="native:DividendScreen:arrow:9" editorReadOnly={false} style={styles.arrow}>›</Text></Pressable>
            </View>
            <View style={styles.week}>{['日','一','二','三','四','五','六'].map((x,index)=><Text editorId="native:DividendScreen:weekday:10" editorReadOnly={true} key={x} style={[styles.weekday,(index===0||index===6)&&styles.weekend]}>{x}</Text>)}</View>
            <View style={styles.grid}>{Array.from({length:calendarCells},(_,i)=>{
              const day=i-firstWeekday+1;
              const valid=day>=1&&day<=daysInMonth;
              const dayEvents=valid?(events.get(day)??[]):[];
              const date=valid?month+'-'+String(day).padStart(2,'0'):'';
              const holiday=valid?marketCalendarLabel(date):'';
              const selected=valid&&selectedDate===date;
              const isToday=valid&&today===date;
              return <Pressable editorId="native:DividendScreen:day:11"
                key={i}
                disabled={!valid}
                accessibilityRole="button"
                accessibilityLabel={valid?`${date}，${holiday}，${dayEvents.length} 項股息事件`:'空白日期'}
                onPress={()=>valid&&setSelectedDate(date)}
                style={[styles.day,!valid&&styles.dayInvalid,dayEvents.length>0&&styles.eventDay,selected&&styles.selectedDay]}
              >
                <View style={[styles.dayNumberWrap,isToday&&styles.todayNumberWrap,selected&&styles.selectedNumberWrap]}>
                  <Text editorId="native:DividendScreen:dayText:12" editorReadOnly={true} style={[styles.dayText,!valid&&styles.dayGhost,selected&&styles.selectedDayText,Boolean(holiday)&&styles.closedDayText]}>{valid?day:''}</Text>
                </View>
                {dayEvents.length?<View style={styles.eventDots}>
                  {dayEvents.slice(0,3).map(event=><View key={event.id} style={[styles.eventDot,{backgroundColor:calendarEventColor(event.type)}]}/>)}
                  {dayEvents.length>3?<Text editorId="native:DividendScreen:moreEvents:13" editorReadOnly={true} style={styles.moreEvents}>+{dayEvents.length-3}</Text>:null}
                </View>:<View style={styles.eventDotsPlaceholder}/>}
              </Pressable>;
            })}</View>
            {selectedDate.startsWith(month)?<View style={styles.eventDetails}>
              <Text style={[styles.eventDetailTitle,Boolean(marketCalendarLabel(selectedDate))&&styles.closedDayText]}>選取日期備註：{selectedDate}｜{marketCalendarLabel(selectedDate)||'正常交易日'}</Text>
              <View style={styles.eventDetailHeader}>
                <View>
                  <Text editorId="native:DividendScreen:eventDetailDate:14" editorReadOnly={true} style={styles.eventDetailDate}>{shortDate(selectedDate)}</Text>
                  <Text editorId="native:DividendScreen:eventDetailTitle:15" editorReadOnly={true} style={styles.eventDetailTitle}>{selectedDate===today?'今天':'日期事件'}</Text>
                </View>
                <Text editorId="native:DividendScreen:eventDetailCount:16" editorReadOnly={true} style={styles.eventDetailCount}>{selectedEvents.length?selectedEvents.length+' 項':'無事件'}</Text>
              </View>
              {selectedEvents.length?selectedEvents.map(event=><View key={event.id} style={styles.eventDetailRow}>
                <View style={[styles.eventTypeBadge,{backgroundColor:calendarEventColor(event.type)+'18'}]}>
                  <View style={[styles.eventTypeDot,{backgroundColor:calendarEventColor(event.type)}]}/>
                  <Text editorId="native:DividendScreen:eventType:17" editorReadOnly={true} style={[styles.eventType,{color:calendarEventColor(event.type)}]}>{dividendCalendarTypeLabel(event.type)}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text editorId="native:DividendScreen:eventSymbol:18" editorReadOnly={true} style={styles.eventSymbol}>{event.symbol} · {event.name}</Text>
                  <Text editorId="native:DividendScreen:eventText:19" editorReadOnly={true} style={styles.eventText}>{event.date}{event.status?' · '+event.status:''}</Text>
                </View>
              </View>):<Text editorId="native:DividendScreen:noEventText:20" editorReadOnly={false} style={styles.noEventText}>這一天沒有已記錄的股息事件。</Text>}
            </View>:null}
            <View style={styles.legend}>
              <Legend color="#8B5CF6" label="最後購買日"/>
              <Legend color={colors.primary} label="除息日"/>
              <Legend color={colors.warning} label="收益分配基準日"/>
              <Legend color={colors.gain} label="股息配發日"/>
            </View>
          </FrameCard>
        },
        {key:'dividend-list',element:
          <FrameCard title="股息清單">
            {finance.dividendPlanError?<Text editorId="native:DividendScreen:formWarning:21" editorReadOnly={true} style={styles.formWarning}>{finance.dividendPlanError}</Text>:null}
            {monthPlans.map(plan=><View key={plan.id} style={styles.planCard}>
              <Text editorId="native:DividendScreen:stockName:22" editorReadOnly={true} style={styles.stockName}>{plan.symbol} · {plan.name}</Text>
              <Text editorId="native:DividendScreen:eventText:23" editorReadOnly={true} style={styles.eventText}>{plan.status==='confirmed'?'已確定／待入帳':'預告'} · 配發日 {plan.paymentDate||'待公告'}</Text>
              <Text editorId="native:DividendScreen:eventText:24" editorReadOnly={true} style={styles.eventText}>每股 {plan.perShareAmount??'待公告'} · 符合配息 {plan.sharesHeld??'待核對'} 股</Text>
              <Text editorId="native:DividendScreen:formHint:25" editorReadOnly={true} style={styles.formHint}>最後購買日 {plan.lastBuyDate||'待公告'}｜除息日 {plan.exDate||'待公告'}｜基準日 {plan.recordDate||'待公告'}</Text>
              <View style={styles.planActions}>
                <Pressable editorId="native:DividendScreen:planButton:26" accessibilityLabel={'編輯股息預告 '+plan.symbol} onPress={()=>editPlan(plan)} style={styles.planButton}><Text editorId="native:DividendScreen:text:27" editorReadOnly={false}>編輯</Text></Pressable>
                {plan.status==='forecast'?<Pressable editorId="native:DividendScreen:planButton:28" accessibilityLabel={'確認股息預告 '+plan.symbol} onPress={()=>applyPlan({type:'confirm',id:plan.id})} style={styles.planButton}><Text editorId="native:DividendScreen:text:29" editorReadOnly={false}>確認資料</Text></Pressable>:<Pressable editorId="native:DividendScreen:planButton:30" accessibilityLabel={'入帳股息 '+plan.symbol} disabled={!plan.paymentDate||plan.paymentDate>today} onPress={()=>postPlan(plan)} style={[styles.planButton,(!plan.paymentDate||plan.paymentDate>today)&&{opacity:.4}]}><Text editorId="native:DividendScreen:text:31" editorReadOnly={false}>實際入帳</Text></Pressable>}
                <Pressable editorId="native:DividendScreen:planButton:32" accessibilityLabel={'刪除股息預告 '+plan.symbol} onPress={()=>Alert.alert('刪除預告','此操作不會更動正式帳務。',[{text:'取消',style:'cancel'},{text:'刪除',style:'destructive',onPress:()=>applyPlan({type:'delete',id:plan.id})}])} style={styles.planButton}><Text editorId="native:DividendScreen:text:33" editorReadOnly={false}>刪除</Text></Pressable>
              </View>
            </View>)}
            {monthRows.length?monthRows.map(row=>{
              const amount=calculateLedgerCashFlow(row);
              const status=row.date>today?'已入帳（未來日期需核對）':'已入帳';
              return <Pressable editorId="native:DividendScreen:dividendRow:34" key={row.id} accessibilityRole="button" accessibilityLabel={`查看 ${row.symbol} 股息資訊`} onPress={()=>setSelectedDividendId(current=>current===row.id?null:row.id)} style={styles.dividendRow}>
                <View style={styles.dateBadge}><Text editorId="native:DividendScreen:dateBadgeText:35" editorReadOnly={true} style={styles.dateBadgeText}>{row.date.slice(5)}</Text></View>
                <View style={{flex:1}}>
                  <Text editorId="native:DividendScreen:stockName:36" editorReadOnly={true} style={styles.stockName}>{row.name}</Text>
                  <Text editorId="native:DividendScreen:symbol:37" editorReadOnly={true} style={styles.symbol}>{row.symbol} · {row.sharesHeld.toLocaleString('zh-TW')} 股 × {row.perShareAmount}</Text>
                  <Text editorId="native:DividendScreen:symbol:38" editorReadOnly={true} style={styles.symbol}>{selectedDividendId===row.id?'▲ 收合股息資訊':'▼ 查看股息資訊'}</Text>
                  {selectedDividendId===row.id?<View style={styles.eventDetails}>
                    <Text editorId="native:DividendScreen:eventText:39" editorReadOnly={true} style={styles.eventText}>配息股數：{row.sharesHeld.toLocaleString('zh-TW')} 股</Text>
                    <Text editorId="native:DividendScreen:eventText:40" editorReadOnly={true} style={styles.eventText}>每股配息：NT$ {row.perShareAmount}</Text>
                    <Text editorId="native:DividendScreen:eventText:41" editorReadOnly={true} style={styles.eventText}>帳務日期：{row.date}</Text>
                    <Text editorId="native:DividendScreen:eventText:42" editorReadOnly={true} style={styles.eventText}>最後購買日：{noteDate(row.note,['最後購買日','最後買進日'])||'尚未取得可靠公告'}</Text>
                    <Text editorId="native:DividendScreen:eventText:43" editorReadOnly={true} style={styles.eventText}>除息日：{noteDate(row.note,['除息日'])||'尚未取得可靠公告'}</Text>
                    <Text editorId="native:DividendScreen:eventText:44" editorReadOnly={true} style={styles.eventText}>收益分配基準日：{noteDate(row.note,['收益分配基準日','股權登記日'])||'尚未取得可靠公告'}</Text>
                    <Text editorId="native:DividendScreen:eventText:45" editorReadOnly={true} style={styles.eventText}>股息配發日：{noteDate(row.note,['配發日'])||'尚未取得可靠公告'}</Text>
                    <Text editorId="native:DividendScreen:eventText:46" editorReadOnly={true} style={styles.eventText}>資料來源／備註：{row.note??'尚未記錄'}</Text>
                  </View>:null}
                </View>
                <View style={{alignItems:'flex-end'}}>
                  <Text editorId="native:DividendScreen:dividendAmount:47" editorReadOnly={true} style={styles.dividendAmount}>NT$ {money(amount)}</Text>
                  <Text editorId="native:DividendScreen:status:48" editorReadOnly={true} style={[styles.status,{color:status==='已入帳'?colors.gain:colors.warning}]}>{status}</Text>
                </View>
              </Pressable>;
            }):<Text editorId="native:DividendScreen:empty:49" editorReadOnly={true} style={styles.empty}>{monthPlans.length?'本月尚無正式入帳紀錄':'本月尚無股息紀錄'}</Text>}
          </FrameCard>
        },
        {key:'annual-trend',element:
          <FrameCard title="年度趨勢">
            <View style={styles.bars}>{monthTotals.map((amount,index)=>{
              const key=year+'-'+String(index+1).padStart(2,'0');
              const h=Math.max(3,Math.round(amount/maxMonth*82));
              return <Pressable editorId="native:DividendScreen:barCol:50" key={key} onPress={()=>setMonth(key)} style={styles.barCol}>
                <View style={[styles.bar,{height:h}]}/><Text editorId="native:DividendScreen:barLabel:51" editorReadOnly={true} style={styles.barLabel}>{index+1}</Text>
              </Pressable>;
            })}</View>
          </FrameCard>
        },
  ];

  return <>
    <PageShell pageKey="dividend" title="股息中心" subtitle="股息淨額與現金入帳共用正式帳務核心" actions={<View style={styles.headerActions}><Pressable editorId="native:DividendScreen:addHeaderButton:1" accessibilityRole="button" accessibilityLabel="新增股息" onPress={()=>openAddDividend()} style={styles.addHeaderButton}><Text editorId="native:DividendScreen:addHeaderButtonText:2" editorReadOnly={false} style={styles.addHeaderButtonText}>＋ 新增</Text></Pressable><PageGearButton onPress={()=>setSettingsOpen(true)}/></View>}>
      <PageEditorStack pageKey="dividend" frames={dividendPreviewElements}/>
    </PageShell>
    <Modal visible={addOpen} transparent animationType="slide" onRequestClose={()=>setAddOpen(false)}><EditorSurface pageKey="dividend" frameKey="dividend-entry-modal" title="新增股息" visible={addOpen}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={{flex:1}}>
              <Text editorId="native:DividendScreen:modalTitle:52" editorReadOnly={false} style={styles.modalTitle}>新增股息</Text>
              <Text editorId="native:DividendScreen:modalSubtitle:53" editorReadOnly={true} style={styles.modalSubtitle}>{editPlanId?'編輯後需重新確認資料':'預告先保存事件；實際收到股息後才增加現金'}</Text>
            </View>
            <Pressable editorId="native:DividendScreen:modalClose:54" accessibilityRole="button" accessibilityLabel="關閉新增股息" onPress={()=>setAddOpen(false)} style={styles.modalClose}><Text editorId="native:DividendScreen:modalCloseText:55" editorReadOnly={false} style={styles.modalCloseText}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.planActions}>
              <Pressable editorId="native:DividendScreen:planButton:56" accessibilityLabel="登錄股息預告" onPress={()=>setAddMode('forecast')} style={[styles.planButton,addMode==='forecast'&&styles.modeSelected]}><Text editorId="native:DividendScreen:text:57" editorReadOnly={false}>登錄預告</Text></Pressable>
              {!editPlanId?<Pressable editorId="native:DividendScreen:planButton:58" accessibilityLabel="建立實際股息入帳" onPress={()=>setAddMode('receipt')} style={[styles.planButton,addMode==='receipt'&&styles.modeSelected]}><Text editorId="native:DividendScreen:text:59" editorReadOnly={false}>實際入帳</Text></Pressable>:null}
            </View>
            {finance.holdings.length?<View>
              <Text editorId="native:DividendScreen:fieldLabel:60" editorReadOnly={false} style={styles.fieldLabel}>快速選擇目前持股</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.holdingChips}>
                {finance.holdings.map(row=><Pressable editorId="native:DividendScreen:holdingChip:61" key={row.symbol} onPress={()=>openAddDividend(row.symbol)} style={[styles.holdingChip,addSymbol===row.symbol&&styles.holdingChipActive]}>
                  <Text editorId="native:DividendScreen:holdingChipCode:62" editorReadOnly={true} style={[styles.holdingChipCode,addSymbol===row.symbol&&styles.holdingChipCodeActive]}>{row.symbol}</Text>
                  <Text editorId="native:DividendScreen:holdingChipShares:63" editorReadOnly={true} style={styles.holdingChipShares}>{row.shares.toLocaleString('zh-TW')} 股</Text>
                </Pressable>)}
              </ScrollView>
            </View>:null}

            <View style={styles.formGroup}>
              <Text editorId="native:DividendScreen:fieldLabel:64" editorReadOnly={false} style={styles.fieldLabel}>ETF 代號</Text>
              <TextInput editorId="native:DividendScreen:formInput:65" value={addSymbol} onChangeText={updateAddSymbol} autoCapitalize="characters" autoCorrect={false} placeholder="例如 0050" style={styles.formInput}/>
              {addInstrument?<Text editorId="native:DividendScreen:autoFillHint:66" editorReadOnly={true} style={styles.autoFillHint}>已從目前持股帶入：{addInstrument.name} · {addInstrument.shares.toLocaleString('zh-TW')} 股</Text>:null}
            </View>

            <View style={styles.formGroup}>
              <Text editorId="native:DividendScreen:fieldLabel:67" editorReadOnly={false} style={styles.fieldLabel}>ETF 名稱</Text>
              <TextInput editorId="native:DividendScreen:formInput:68" value={addName} onChangeText={setAddName} placeholder="ETF 名稱" style={styles.formInput}/>
            </View>

            <View style={styles.formTwo}>
              <View style={{flex:1}}>
                <Text editorId="native:DividendScreen:fieldLabel:69" editorReadOnly={false} style={styles.fieldLabel}>股息配發／入帳日</Text>
                <Pressable editorId="native:DividendScreen:dateInput:70" accessibilityRole="button" accessibilityLabel="選擇股息配發／入帳日" onPress={()=>setDatePickerTarget('payment')} style={styles.dateInput}>
                  <Text editorId="native:DividendScreen:dateInputText:71" editorReadOnly={true} style={styles.dateInputText}>{addPaymentDate}</Text><Text editorId="native:DividendScreen:dateInputIcon:72" editorReadOnly={false} style={styles.dateInputIcon}>📅</Text>
                </Pressable>
              </View>
              <View style={{flex:1}}>
                <Text editorId="native:DividendScreen:fieldLabel:73" editorReadOnly={false} style={styles.fieldLabel}>每股股息</Text>
                <TextInput editorId="native:DividendScreen:formInput:74" value={addPerShare} onChangeText={setAddPerShare} keyboardType="decimal-pad" placeholder="0" style={styles.formInput}/>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text editorId="native:DividendScreen:fieldLabel:75" editorReadOnly={false} style={styles.fieldLabel}>符合配息股數</Text>
              <TextInput editorId="native:DividendScreen:formInput:76" value={addShares} onChangeText={value=>{setSharesAuto(false);setAddShares(value);}} keyboardType="decimal-pad" placeholder="0" style={styles.formInput}/>
              <Text editorId="native:DividendScreen:formHint:77" editorReadOnly={true} style={styles.formHint}>{sharesAuto&&eligibleShares!==null?'已依公告日期與原帳本帶入 '+eligibleShares+' 股，請核對實際配息資格。':'目前持股僅供快速帶入；尚未到資格日期或資料不足時需另行核對，可手動修正。'}</Text>
            </View>

            <View style={styles.previewCard}>
              <Text editorId="native:DividendScreen:previewTitle:78" editorReadOnly={false} style={styles.previewTitle}>入帳預覽</Text>
              <View style={styles.previewRow}><Text editorId="native:DividendScreen:previewLabel:79" editorReadOnly={false} style={styles.previewLabel}>股息總額</Text><Text editorId="native:DividendScreen:previewValue:80" editorReadOnly={true} style={styles.previewValue}>NT$ {money(addGross)}</Text></View>
              <View style={styles.previewRow}><Text editorId="native:DividendScreen:previewLabel:81" editorReadOnly={false} style={styles.previewLabel}>正式帳務淨入帳</Text><Text editorId="native:DividendScreen:previewValueStrong:82" editorReadOnly={true} style={styles.previewValueStrong}>NT$ {money(addNet)}</Text></View>
              <Text editorId="native:DividendScreen:formHint:83" editorReadOnly={false} style={styles.formHint}>淨入帳沿用既有股息核心規則計算，不在此表單另造公式。</Text>
            </View>

            <Text editorId="native:DividendScreen:formSectionTitle:84" editorReadOnly={false} style={styles.formSectionTitle}>股息事件日期（選填）</Text>
            <DateField label="最後購買日" value={addLastBuyDate} onPress={()=>setDatePickerTarget('lastBuy')}/>
            <DateField label="除息日" value={addExDate} onPress={()=>setDatePickerTarget('ex')}/>
            <DateField label="收益分配基準日" value={addRecordDate} onPress={()=>setDatePickerTarget('record')}/>

            <View style={styles.formGroup}>
              <Text editorId="native:DividendScreen:fieldLabel:85" editorReadOnly={false} style={styles.fieldLabel}>備註</Text>
              <TextInput editorId="native:DividendScreen:formInput:86" value={addNote} onChangeText={setAddNote} placeholder="資料來源、入帳備註等" multiline style={[styles.formInput,styles.formInputMultiline]}/>
            </View>

            {formError?<Text editorId="native:DividendScreen:formWarning:87" editorReadOnly={true} style={styles.formWarning}>{formError}</Text>:null}
            <Pressable editorId="native:DividendScreen:saveDividendButton:88" disabled={!canSave} onPress={saveDividend} style={[styles.saveDividendButton,!canSave&&styles.saveDividendButtonDisabled]}>
              <Text editorId="native:DividendScreen:saveDividendButtonText:89" editorReadOnly={true} style={styles.saveDividendButtonText}>{addMode==='forecast'?(editPlanId?'儲存預告修改':'儲存股息預告'):'確認新增股息紀錄'}</Text>
            </Pressable>
            <Text editorId="native:DividendScreen:formWarning:90" editorReadOnly={false} style={styles.formWarning}>未來配發日不直接寫入現金帳務；可先登錄預告，確認資料並實際收到股息後再入帳。</Text>
          </ScrollView>
        </View>
      </View>
    </EditorSurface></Modal>
    <CalendarDatePickerModal
      visible={datePickerTarget!==null}
      value={datePickerValue}
      title={datePickerTitle}
      allowClear={datePickerTarget!==null&&(datePickerTarget!=='payment'||addMode==='forecast')}
      onChange={updatePickedDate}
      onClose={()=>setDatePickerTarget(null)}
    />
    <PageFrameSettingsModal previewElements={dividendPreviewElements} visible={settingsOpen} pageKey="dividend" title="股息" frames={PAGE_FRAMES.dividend} onClose={()=>setSettingsOpen(false)}/>
  </>;
}
function DateField({label,value,onPress}:{label:string;value:string;onPress:()=>void}){
  return <View style={styles.formGroup}><Text editorId="native:DividendScreen:fieldLabel:91" editorReadOnly={false} style={styles.fieldLabel}>{label}</Text><Pressable editorId="native:DividendScreen:dateInput:92" accessibilityRole="button" accessibilityLabel={'選擇'+label} onPress={onPress} style={styles.dateInput}><Text editorId="native:DividendScreen:dateInputText:93" editorReadOnly={true} style={[styles.dateInputText,!value&&styles.dateInputPlaceholder]}>{value||'選擇日期'}</Text><Text editorId="native:DividendScreen:dateInputIcon:94" editorReadOnly={false} style={styles.dateInputIcon}>📅</Text></Pressable></View>;
}
function Legend({color,label}:{color:string;label:string}){return <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:color}]}/><Text editorId="native:DividendScreen:legendText:95" editorReadOnly={false} style={styles.legendText}>{label}</Text></View>}
const styles=StyleSheet.create({
  planCard:{padding:12,borderWidth:1,borderColor:colors.border,borderRadius:12,marginBottom:10,gap:5},
  planActions:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:8},
  planButton:{paddingHorizontal:12,paddingVertical:9,borderRadius:9,backgroundColor:colors.surfaceMuted},
  modeSelected:{borderWidth:1,borderColor:colors.primary},
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
  dateInput:{minHeight:42,borderWidth:1,borderColor:colors.border,borderRadius:12,backgroundColor:colors.background,paddingHorizontal:11,paddingVertical:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  dateInputText:{fontSize:12,color:colors.text,fontWeight:'700'},
  dateInputPlaceholder:{color:colors.textSecondary,fontWeight:'600'},
  dateInputIcon:{fontSize:16,color:colors.primary,fontWeight:'900'},
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
  weekend:{color:'#DC2626'},
  closedDayText:{color:'#DC2626',fontWeight:'800'},
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
