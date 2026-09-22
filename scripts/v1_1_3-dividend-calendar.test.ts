import assert from 'node:assert/strict';

import {buildDividendCalendarEvents,deviceLocalCalendarDate,filterDividendCalendarEvents} from '../src/dividend/dividendCalendar';
import {dividendEventToLedger} from '../src/ai/dividendAssistant';

const entries=[
  {
    id:'d1',date:'2026-10-15',kind:'dividend',symbol:'0050',name:'元大台灣50',
    perShareAmount:1.2,sharesHeld:170,
    note:'TWSE 配息事件；除息日 2026-09-20；股權登記日 2026-09-21；配發日 2026-10-15；最後購買日 2026-09-19',
  },
  {
    id:'d2',date:'2026-10-15',kind:'dividend',symbol:'0056',name:'元大高股息',
    perShareAmount:0.8,sharesHeld:800,note:'手動輸入',
  },
] as any;

const events=buildDividendCalendarEvents(entries,'2026-09-22');
assert.deepEqual(events.map(event=>({symbol:event.symbol,type:event.type,date:event.date,status:event.status})),[
  {symbol:'0050',type:'exDate',date:'2026-09-20',status:'已完成'},
  {symbol:'0050',type:'recordDate',date:'2026-09-21',status:'已完成'},
  {symbol:'0050',type:'paymentDate',date:'2026-10-15',status:'預定'},
  {symbol:'0056',type:'paymentDate',date:'2026-10-15',status:'預定'},
]);
assert.equal(events.some(event=>event.symbol==='0056'&&event.type!=='paymentDate'),false,'must not invent missing dates');

const onlyEx=filterDividendCalendarEvents(events,{showExDate:true,showRecordDate:false,showPaymentDate:false,showStatus:true});
assert.deepEqual(onlyEx.map(event=>event.type),['exDate']);
assert.equal(filterDividendCalendarEvents(events,{showExDate:true,showRecordDate:true,showPaymentDate:true,showStatus:false}).every(event=>event.status===''),true);

const aiWithoutPayment=dividendEventToLedger({
  id:'twse-pending',symbol:'00878',name:'國泰永續高股息',
  exDate:'2026-09-22',lastPurchaseDate:'2026-09-21',
  recordDate:'2026-09-23',paymentDate:'',perShareAmount:0.42,
  eligibleShares:1000,estimatedDividend:420,distributionYield:1.2,
  status:'待配發',alreadyRecorded:false,
});
assert.equal(aiWithoutPayment.date,'2026-09-22','AI source stores an ex-date in the ledger fallback');
const pendingEvents=buildDividendCalendarEvents([aiWithoutPayment],'2026-09-22');
assert.deepEqual(pendingEvents.map(event=>event.type),['exDate','recordDate'],
  'an unknown TWSE payment date must remain absent even when ledger date equals ex-date');
assert.equal(pendingEvents.some(event=>event.type==='paymentDate'),false);

const aiWithPayment=dividendEventToLedger({
  id:'twse-paid',symbol:'00878',name:'國泰永續高股息',
  exDate:'2026-09-22',lastPurchaseDate:'2026-09-21',
  recordDate:'2026-09-23',paymentDate:'2026-10-18',perShareAmount:0.42,
  eligibleShares:1000,estimatedDividend:420,distributionYield:1.2,
  status:'待配發',alreadyRecorded:false,
});
assert.equal(buildDividendCalendarEvents([aiWithPayment],'2026-09-22')
  .find(event=>event.type==='paymentDate')?.date,'2026-10-18',
  'an explicitly announced payment date must remain visible');

const manualReceipt={
  id:'manual-receipt',date:'2026-09-22',kind:'dividend' as const,
  symbol:'0056',name:'元大高股息',perShareAmount:0.3,sharesHeld:800,
  note:'手動輸入',
};
const sameDay=buildDividendCalendarEvents([aiWithoutPayment,manualReceipt],'2026-09-22')
  .filter(event=>event.date==='2026-09-22');
assert.equal(sameDay.length,2,'different same-day dividend events must not overwrite each other');
assert.deepEqual(sameDay.map(event=>event.type),['exDate','paymentDate']);

const savedTZ=process.env.TZ;
try{
  process.env.TZ='Asia/Taipei';
  const localMidnight=new Date('2026-09-21T16:30:00Z'); // 2026-09-22 00:30 in Taiwan
  assert.equal(deviceLocalCalendarDate(localMidnight),'2026-09-22');
  assert.equal(deviceLocalCalendarDate(new Date('2026-09-30T16:30:00Z')),'2026-10-01',
    'local month transition cannot use the preceding UTC month');
  const localTodayStatus=buildDividendCalendarEvents([{
    id:'local-day',date:'2026-09-22',kind:'dividend',
    symbol:'0056',name:'元大高股息',perShareAmount:0.5,sharesHeld:100,note:'手動輸入',
  }],deviceLocalCalendarDate(localMidnight));
  assert.equal(localTodayStatus[0]?.status,'今日',
    'a same-day dividend at Taiwan 00:30 must not remain marked as future');
}finally{
  if(savedTZ===undefined)delete process.env.TZ;
  else process.env.TZ=savedTZ;
}

console.log('V1.1.3 dividend calendar events: PASS');
