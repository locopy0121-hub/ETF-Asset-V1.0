import assert from 'node:assert/strict';

import {buildDividendCalendarEvents,filterDividendCalendarEvents} from '../src/dividend/dividendCalendar';

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

console.log('V1.1.3 dividend calendar events: PASS');
