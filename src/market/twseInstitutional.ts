/**
 * TWSE T86 daily institutional net trading. This is exchange EOD data, not
 * tick/live Fugle price data. Keep it outside market-quote SSOT and the ledger.
 */
export type InstitutionalRecord=Readonly<{
  date:string;symbol:string;name:string;
  foreign:number;trust:number;dealer:number;total:number;
  source:'TWSE T86'|'TPEx 三大法人日報';fetchedAt:number;
}>;
type Payload={stat?:unknown;date?:unknown;fields?:unknown;data?:unknown};
const tidy=(s:unknown)=>String(s??'').replace(/<[^>]*>/g,'').replace(/\s+/g,'').replace(/（/g,'(').replace(/）/g,')');
const integer=(v:unknown):number|null=>{
  const n=String(v??'').replace(/,/g,'').trim();
  return /^[-+]?\d+$/.test(n)&&Number.isSafeInteger(Number(n))?Number(n):null;
};
const normalizeDate=(v:unknown):string|null=>{
  const raw=String(v??'').trim();
  if(/^\d{8}$/.test(raw))return raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6);
  if(/^\d{4}[/-]\d\d[/-]\d\d$/.test(raw))return raw.replaceAll('/','-');
  return null;
};
/** Match exact header semantics, never hard-code column indices or prefix-match buy totals. */
export function parseTwseInstitutional(payload:unknown,symbol:string,requestedDate:string,now=Date.now()):InstitutionalRecord|null{
  if(!payload||typeof payload!=='object')return null;
  const p=payload as Payload;
  if(p.stat!=='OK'||!Array.isArray(p.fields)||!Array.isArray(p.data)||!normalizeDate(requestedDate))return null;
  const announced=p.date===undefined?requestedDate:normalizeDate(p.date);
  if(!announced||announced!==requestedDate)return null;
  const headers=p.fields.map(tidy);
  const exact=(v:string)=>headers.indexOf(v);
  const code=exact('證券代號'),name=exact('證券名稱');
  const foreign=exact('外陸資買賣超股數(不含外資自營商)');
  const trust=exact('投信買賣超股數'),dealer=exact('自營商買賣超股數'),total=exact('三大法人買賣超股數');
  if([code,name,foreign,trust,dealer,total].some(i=>i<0))return null;
  const wanted=symbol.trim().toUpperCase();
  for(const candidate of p.data){
    if(!Array.isArray(candidate)||String(candidate[code]??'').trim().toUpperCase()!==wanted)continue;
    const a=integer(candidate[foreign]),b=integer(candidate[trust]),c=integer(candidate[dealer]),d=integer(candidate[total]);
    if(a===null||b===null||c===null||d===null)return null;
    return {date:requestedDate,symbol:wanted,name:String(candidate[name]??'').trim(),
      foreign:a,trust:b,dealer:c,total:d,source:'TWSE T86',fetchedAt:now};
  }
  return null;
}
const cache=new Map<string,{expires:number;record:InstitutionalRecord|null}>();
const DAY_MS=86400000;
const ymd=(date:Date)=>date.toISOString().slice(0,10);
export function taipeiCalendarDate(now=new Date()):string{
  // Determine Taiwan calendar day without changing the clock or trusting the device timezone.
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const item=(kind:string)=>parts.find(p=>p.type===kind)?.value??'';
  return item('year')+'-'+item('month')+'-'+item('day');
}
export async function fetchTwseInstitutionalDay(symbol:string,date:string,signal?:AbortSignal):Promise<InstitutionalRecord|null>{
  if(!/^[0-9A-Z]{4,8}$/.test(symbol)||!normalizeDate(date))throw new Error('無效的標的代號或查詢日期');
  const key=date+'@'+symbol,stored=cache.get(key);
  if(stored&&stored.expires>Date.now())return stored.record;
  const day=date.replaceAll('-','');
  const url='https://www.twse.com.tw/rwd/zh/fund/T86?response=json&selectType=ALL&date='+day;
  const response=await fetch(url,{headers:{Accept:'application/json','Cache-Control':'no-cache'},...(signal?{signal}:{})});
  if(!response.ok)throw new Error('T86 HTTP '+response.status);
  const record=parseTwseInstitutional(await response.json(),symbol,date);
  // Empty/holiday results short-lived; historical rows keep a little longer.
  cache.set(key,{record,expires:Date.now()+(record?60*60*1000:10*60*1000)});
  return record;
}
export async function fetchTwseInstitutionalSeries(symbol:string,count=5,now=new Date(),signal?:AbortSignal):Promise<InstitutionalRecord[]>{
  if(!Number.isInteger(count)||count<1||count>10)throw new Error('法人查詢交易日數無效');
  const today=taipeiCalendarDate(now);
  const base=new Date(today+'T00:00:00Z').getTime();
  const found:InstitutionalRecord[]=[];
  let fail:Error|null=null,responses=0;
  // No more than 15 requests, and stop after collecting requested trading dates.
  for(let age=0;age<15&&found.length<count;age++){
    if(signal?.aborted)throw new Error('查詢已取消');
    const day=new Date(base-age*DAY_MS),weekday=day.getUTCDay();
    if(weekday===0||weekday===6)continue;
    try{
      const record=await fetchTwseInstitutionalDay(symbol,ymd(day),signal);responses++;
      if(record)found.push(record);
    }catch(e){if(signal?.aborted)throw new Error('查詢已取消');fail=e instanceof Error?e:new Error(String(e));}
  }
  if(!found.length&&responses===0&&fail)throw fail;
  return found;
}
