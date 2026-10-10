/**
 * TAIEX market overview uses index-specific, read-only feeds.
 * Official TWSE monthly historical OHLC is the stable EOD source.
 * Yahoo ^TWII is an OPTIONAL labelled intraday indication, never an
 * unlabelled replacement for the official quote or SaiETF holding SSOT.
 */
export type TaiexDaily=Readonly<{
 date:string;open:number;high:number;low:number;close:number;source:'TWSE 官方日資料';
}>;
export type TaiexIntraday=Readonly<{
 date:string;points:readonly {at:number;price:number}[];
 asOf:number;source:'Yahoo ^TWII 分時（可能延遲）';
}>;
export type TaiexSnapshot=Readonly<{
 date:string;value:number;previousClose:number|null;change:number|null;changePct:number|null;
 open:number;high:number;low:number;source:'TWSE 官方日資料'|'Yahoo ^TWII 分時（可能延遲）';asOf:number|null;
}>;
const num=(raw:unknown):number|null=>{
 const text=String(raw??'').replace(/,/g,'').trim();
 if(text===''||!/^[-+]?(?:\d+|\d+\.\d+)$/.test(text))return null;
 const value=Number(text);return Number.isFinite(value)&&value>0?value:null;
};
function rocDate(raw:unknown):string|null{
 const m=/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/.exec(String(raw??'').trim());
 if(!m)return null;
 const year=1911+Number(m[1]),month=Number(m[2]),day=Number(m[3]);
 const dt=new Date(Date.UTC(year,month-1,day));
 if(dt.getUTCFullYear()!==year||dt.getUTCMonth()+1!==month||dt.getUTCDate()!==day)return null;
 return year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
}
export function parseTwseTaiexHistory(payload:unknown):TaiexDaily[]{
 if(!payload||typeof payload!=='object')return [];
 const p=payload as {stat?:unknown;fields?:unknown;data?:unknown};
 if(p.stat!=='OK'||!Array.isArray(p.fields)||!Array.isArray(p.data))return [];
 const keys=['日期','開盤指數','最高指數','最低指數','收盤指數'];
 const columns=keys.map(key=>p.fields!.indexOf(key));
 if(columns.some(x=>x<0))return [];
 const results=new Map<string,TaiexDaily>();
 for(const row of p.data){
   if(!Array.isArray(row))continue;
   const date=rocDate(row[columns[0]!]);
   const open=num(row[columns[1]!]),high=num(row[columns[2]!]),
     low=num(row[columns[3]!]),close=num(row[columns[4]!]);
   if(!date||open===null||high===null||low===null||close===null
    ||high<Math.max(open,close)||low>Math.min(open,close)||high<low)continue;
   results.set(date,{date,open,high,low,close,source:'TWSE 官方日資料'});
 }
 return [...results.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function taipeiDateFromEpoch(at:number):string{
 if(!Number.isFinite(at)||at<=0)return '';
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(at));
 const by=(type:string)=>parts.find(x=>x.type===type)?.value??'';
 return by('year')+'-'+by('month')+'-'+by('day');
}
export function taipeiClock(at:number):number{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(at));
 return Number(parts.find(x=>x.type==='hour')?.value??-1)*60+Number(parts.find(x=>x.type==='minute')?.value??-1);
}
export function parseYahooTaiexIntraday(payload:unknown):TaiexIntraday|null{
 if(!payload||typeof payload!=='object')return null;
 const chart=(payload as {chart?:unknown}).chart as {result?:unknown}|undefined;
 if(!Array.isArray(chart?.result)||chart.result.length!==1)return null;
 const row=chart.result[0] as {meta?:{symbol?:unknown};timestamp?:unknown;indicators?:{quote?:unknown}}|undefined;
 if(!row||row.meta?.symbol!=='^TWII'||!Array.isArray(row.timestamp)||!Array.isArray(row.indicators?.quote))return null;
 const quote=row.indicators.quote[0] as {close?:unknown}|undefined;
 if(!quote||!Array.isArray(quote.close)||quote.close.length!==row.timestamp.length)return null;
 const byDate=new Map<string,{at:number;price:number}[]>();
 for(let i=0;i<row.timestamp.length;i++){
   const unix=Number(row.timestamp[i]),point=num(quote.close[i]);
   if(!Number.isSafeInteger(unix)||unix<1_000_000_000||point===null||point<1000)continue;
   const at=unix*1000,minute=taipeiClock(at);
   if(minute<9*60||minute>13*60+35)continue;
   const date=taipeiDateFromEpoch(at);
   const points=byDate.get(date)??[];
   points.push({at,price:point});byDate.set(date,points);
 }
 const dates=[...byDate.keys()].sort();
 const latest=dates[dates.length-1];
 if(!latest)return null;
 const points=[...new Map(byDate.get(latest)!.sort((a,b)=>a.at-b.at).map(p=>[p.at,p] as const)).values()];
 if(points.length<2)return null;
 return {date:latest,points,asOf:points[points.length-1]!.at,source:'Yahoo ^TWII 分時（可能延遲）'};
}
export function taiexSnapshot(history:readonly TaiexDaily[],intraday:TaiexIntraday|null,now=Date.now()):TaiexSnapshot|null{
 const rows=[...history].sort((a,b)=>a.date.localeCompare(b.date));
 const latest=rows[rows.length-1];if(!latest)return null;
 const prior=rows.length>1?rows[rows.length-2]!.close:null;
 let value=latest.close,open=latest.open,high=latest.high,low=latest.low,date=latest.date;
 let source:TaiexSnapshot['source']='TWSE 官方日資料',asOf:number|null=null;
 // A same-day fresh indicative intraday snapshot may supersede yesterday's
 // official EOD close, but never override same-date official closing values.
 const taipeiToday=taipeiDateFromEpoch(now);
 if(intraday&&intraday.date===taipeiToday&&intraday.date>latest.date&&
    now>=intraday.asOf&&now-intraday.asOf<=30*60*1000){
   date=intraday.date;value=intraday.points[intraday.points.length-1]!.price;
   high=Math.max(...intraday.points.map(x=>x.price));
   low=Math.min(...intraday.points.map(x=>x.price));
   open=intraday.points[0]!.price;
   source=intraday.source;asOf=intraday.asOf;
 }
 const baseline=date===latest.date?prior:latest.close;
 const change=baseline===null?null:value-baseline;
 return {date,value,open,high,low,previousClose:baseline,change,
  changePct:change===null||baseline===null?null:change/baseline*100,source,asOf};
}
const monthlyCache=new Map<string,{until:number;rows:TaiexDaily[]}>();
const currentMonth=(now:Date,offset:number)=>{
 const local=taipeiDateFromEpoch(now.getTime());
 const [year,month]=local.split('-').map(Number);
 const dt=new Date(Date.UTC(year!,month!-1+offset,1));
 return dt.getUTCFullYear()+String(dt.getUTCMonth()+1).padStart(2,'0')+'01';
};
export async function fetchOfficialTaiexHistory(months=2,now=new Date(),signal?:AbortSignal):Promise<TaiexDaily[]>{
 if(!Number.isInteger(months)||months<1||months>12)throw new Error('無效的加權指數查詢期間');
 const result=new Map<string,TaiexDaily>();
 let failures=0;
 for(let i=0;i<months;i++){
  if(signal?.aborted)throw new Error('查詢已取消');
  const month=currentMonth(now,-i);
  const cached=monthlyCache.get(month);
  if(cached&&cached.until>Date.now()){cached.rows.forEach(x=>result.set(x.date,x));continue;}
  try{
   const url='https://www.twse.com.tw/rwd/zh/TAIEX/MI_5MINS_HIST?response=json&date='+month;
   const response=await fetch(url,{headers:{Accept:'application/json','Cache-Control':'no-cache'},...(signal?{signal}:{})});
   if(!response.ok)throw new Error('官方指數 HTTP '+response.status);
   const rows=parseTwseTaiexHistory(await response.json());
   if(!rows.length){failures++;continue;}
   monthlyCache.set(month,{rows,until:Date.now()+10*60*1000});
   rows.forEach(x=>result.set(x.date,x));
  }catch(error){if(signal?.aborted)throw new Error('查詢已取消');failures++;}
 }
 const sorted=[...result.values()].sort((a,b)=>a.date.localeCompare(b.date));
 if(!sorted.length)throw new Error('證交所指數資料暫時無法取得（'+failures+' 個月份失敗）');
 return sorted;
}
export async function fetchYahooTaiexIntraday(signal?:AbortSignal):Promise<TaiexIntraday|null>{
 const url='https://query1.finance.yahoo.com/v8/finance/chart/%5ETWII?range=5d&interval=5m';
 const response=await fetch(url,{headers:{Accept:'application/json'},...(signal?{signal}:{})});
 if(!response.ok)throw new Error('Yahoo 指數圖表 HTTP '+response.status);
 return parseYahooTaiexIntraday(await response.json());
}
