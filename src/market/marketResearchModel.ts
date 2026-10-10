
import type {TaiwanSecurityInfo} from './TaiwanSecurityCatalog';
import type {DailyCandle} from './twseDailyHistory';

export type ResearchPeriod='day'|'week'|'month';
export type ResearchTab='chart'|'profile'|'etf'|'institution'|'premium'|'news';

export function searchTaiwanSecurities(items:readonly TaiwanSecurityInfo[],text:string,max=40){
  const q=text.trim().toLocaleLowerCase('zh-TW');
  if(!q)return [];
  const score=(row:TaiwanSecurityInfo)=>{
    const symbol=row.symbol.toLowerCase(),name=row.name.toLocaleLowerCase('zh-TW');
    if(symbol===q)return 0;
    if(symbol.startsWith(q))return 1;
    if(name===q)return 2;
    if(name.startsWith(q))return 3;
    return 4;
  };
  return items.filter(x=>x.symbol.toLowerCase().includes(q)||x.name.toLocaleLowerCase('zh-TW').includes(q)||
    (x.companyName??'').toLocaleLowerCase('zh-TW').includes(q))
    .sort((a,b)=>score(a)-score(b)||a.symbol.localeCompare(b.symbol))
    .slice(0,Math.max(0,Math.min(max,100)));
}
function weekKey(iso:string){
  const date=new Date(iso+'T12:00:00Z');
  if(!Number.isFinite(date.getTime()))return iso;
  date.setUTCDate(date.getUTCDate()+3-(date.getUTCDay()+6)%7);
  const thursday=new Date(Date.UTC(date.getUTCFullYear(),0,4));
  const week=1+Math.round(((date.getTime()-thursday.getTime())/86400000-3+(thursday.getUTCDay()+6)%7)/7);
  return date.getUTCFullYear()+'W'+String(week).padStart(2,'0');
}
export function aggregateMarketCandles(input:readonly DailyCandle[],period:ResearchPeriod):DailyCandle[]{
  const ordered=[...input].sort((a,b)=>a.date.localeCompare(b.date));
  if(period==='day')return ordered;
  const buckets=new Map<string,DailyCandle>();
  for(const row of ordered){
    if(!Number.isFinite(row.close)||row.close<=0)continue;
    const key=period==='month'?row.date.slice(0,7):weekKey(row.date);
    const old=buckets.get(key);
    buckets.set(key,old?{...old,date:row.date,high:Math.max(old.high,row.high),low:Math.min(old.low,row.low),
      close:row.close,volume:old.volume+row.volume}:{...row});
  }
  return [...buckets.values()];
}
export function marketIndicators(rows:readonly DailyCandle[]){
  const close=rows.map(x=>x.close).filter(x=>Number.isFinite(x)&&x>0);
  const mean=(n:number)=>close.length<n?null:close.slice(-n).reduce((s,v)=>s+v,0)/n;
  let rsi14:number|null=null;
  if(close.length>=15){
    let gains=0,losses=0;
    for(let i=close.length-14;i<close.length;i++){
      const change=close[i]!-close[i-1]!;
      gains+=Math.max(0,change);losses+=Math.max(0,-change);
    }
    rsi14=losses===0?(gains===0?50:100):100-100/(1+gains/losses);
  }
  return {ma5:mean(5),ma10:mean(10),ma20:mean(20),rsi14};
}
export function premiumDiscount(price:number|null,nav:number|null){
  if(price===null||nav===null||!Number.isFinite(price)||!Number.isFinite(nav)||price<=0||nav<=0)return null;
  return (price/nav-1)*100;
}
