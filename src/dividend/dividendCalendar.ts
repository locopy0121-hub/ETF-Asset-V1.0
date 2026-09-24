import type {DividendLedgerEntry} from '../finance/canonicalLedger';

export type DividendCalendarEventType='lastBuyDate'|'exDate'|'recordDate'|'paymentDate';
export type DividendCalendarStatus=''|'已完成'|'今日'|'預定';
export type DividendCalendarPrefs=Readonly<{
  showLastBuyDate?:boolean;
  showExDate:boolean;
  showRecordDate:boolean;
  showPaymentDate:boolean;
  showStatus:boolean;
}>;
export type DividendCalendarEvent=Readonly<{
  id:string;
  ledgerId:string;
  symbol:string;
  name:string;
  date:string;
  type:DividendCalendarEventType;
  status:DividendCalendarStatus;
}>;

/** Device-local calendar day, not the UTC day returned by toISOString(). */
export function deviceLocalCalendarDate(now:Date=new Date()):string{
  const year=now.getFullYear();
  const month=String(now.getMonth()+1).padStart(2,'0');
  const day=String(now.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

const DATE_PATTERN='(\\d{4}-\\d{2}-\\d{2})';
const dateFromNote=(note:string|undefined,label:string)=>{
  const match=String(note??'').match(new RegExp(label+'\\s*'+DATE_PATTERN));
  return match?.[1]??'';
};
const eventStatus=(date:string,today:string):DividendCalendarStatus=>date<today?'已完成':date===today?'今日':'預定';
const TYPE_ORDER:Record<DividendCalendarEventType,number>={lastBuyDate:0,exDate:1,recordDate:2,paymentDate:3};

export function buildDividendCalendarEvents(
  entries:readonly DividendLedgerEntry[],
  today:string,
):DividendCalendarEvent[]{
  const events:DividendCalendarEvent[]=[];
  for(const entry of entries){
    const declared=[
      // Never infer this from ex-date minus a calendar day: TWSE holidays and settlement rules matter.
      {type:'lastBuyDate' as const,date:dateFromNote(entry.note,'最後購買日')||dateFromNote(entry.note,'最後買進日')},
      {type:'exDate' as const,date:dateFromNote(entry.note,'除息日')},
      {type:'recordDate' as const,date:dateFromNote(entry.note,'股權登記日')},
      // AI-imported TWSE events may use an ex-date as the ledger date while payment is unannounced.
      // Only manual/receipt ledger entries may use their ledger date as a payment-date fallback.
      {type:'paymentDate' as const,date:dateFromNote(entry.note,'配發日')||
        (String(entry.note??'').includes('TWSE 配息事件')?'':entry.date)},
    ];
    for(const item of declared){
      if(!item.date)continue;
      events.push({
        id:entry.id+'-'+item.type,
        ledgerId:entry.id,
        symbol:entry.symbol,
        name:entry.name,
        date:item.date,
        type:item.type,
        status:eventStatus(item.date,today),
      });
    }
  }
  return events.sort((a,b)=>a.date.localeCompare(b.date)||TYPE_ORDER[a.type]-TYPE_ORDER[b.type]||a.symbol.localeCompare(b.symbol));
}

export function filterDividendCalendarEvents(
  events:readonly DividendCalendarEvent[],
  prefs:DividendCalendarPrefs,
):DividendCalendarEvent[]{
  return events
    .filter(event=>
      (event.type==='lastBuyDate'&&prefs.showLastBuyDate!==false)||
      (event.type==='exDate'&&prefs.showExDate)||
      (event.type==='recordDate'&&prefs.showRecordDate)||
      (event.type==='paymentDate'&&prefs.showPaymentDate)
    )
    .map(event=>prefs.showStatus?event:{...event,status:''});
}

export function dividendCalendarTypeLabel(type:DividendCalendarEventType){
  if(type==='lastBuyDate')return '最後購買日';
  if(type==='exDate')return '除息日';
  if(type==='recordDate')return '股權登記日';
  return '股息配發日';
}
