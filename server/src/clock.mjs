export const ZONE='Asia/Taipei';
const parts=(now)=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
  timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',
  weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
}).formatToParts(new Date(now)).map(p=>[p.type,p.value]));
export function taipeiClock(now=Date.now()){
  const p=parts(now);
  return {
    date:p.year+'-'+p.month+'-'+p.day,
    hour:Number(p.hour),minute:Number(p.minute),weekday:p.weekday,
    workingDay:p.weekday!=='Sat'&&p.weekday!=='Sun',
  };
}
export function isSession(now=Date.now()){
  const p=taipeiClock(now),min=p.hour*60+p.minute;
  // Official holiday tables can further restrict the scheduler; a closed
  // exchange returns no new source ticks even if an ordinary weekday.
  return p.workingDay&&min>=540&&min<=810;
}
export function canPublishDailyClose(day,now=Date.now()){
  const p=taipeiClock(now);
  if(day>p.date)return false;
  return day!==p.date||(p.hour*60+p.minute)>=815; // 13:35 Taiwan local
}
export function closeTimeMs(day){
  const [y,m,d]=day.split('-').map(Number);
  return Date.UTC(y,m-1,d,5,30,0);
}
export function officialDay(value){
  const raw=String(value??'').trim().replace(/[/-]/g,'');
  if(!/^\d{7,8}$/.test(raw))return null;
  const yyyy=raw.length===7?Number(raw.slice(0,3))+1911:Number(raw.slice(0,4));
  const mm=Number(raw.slice(-4,-2)),dd=Number(raw.slice(-2));
  const check=new Date(Date.UTC(yyyy,mm-1,dd));
  if(check.getUTCFullYear()!==yyyy||check.getUTCMonth()!==mm-1||check.getUTCDate()!==dd)return null;
  return [yyyy,String(mm).padStart(2,'0'),String(dd).padStart(2,'0')].join('-');
}
