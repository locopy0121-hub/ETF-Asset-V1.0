import {isIsoCalendarDate,validateDividendDates,type DividendPlan} from './dividendPlans';
import {buildDividendPlanCalendarEvents,type DividendCalendarEvent} from './dividendCalendar';

/** Public announcements are an independent read-only cache, never ledger entries. */
export type DividendAnnouncement=Readonly<{
 symbol:string;name:string;exDate:string;recordDate:string;paymentDate:string;
 perShareAmount:number|null;source:string;updatedAt:number;
}>;
export type DividendAnnouncementCache=Readonly<{schema:1;rows:readonly DividendAnnouncement[];updatedAt:number|null}>;
export const DIVIDEND_ANNOUNCEMENT_KEY='@tf-asset/dividend-announcements-v1';
const EX_URL='https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL';
const ETF_URLS=['https://www.twse.com.tw/zh/ETFortune/dividendList','https://wwwc.twse.com.tw/zh/ETFortune/dividendList'];
const clean=(value:string)=>value.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
function dateValue(value:unknown):string{
 const text=String(value??'').trim();
 if(isIsoCalendarDate(text))return text;
 const parts=text.match(/^(\d{3,4})\s*[年/.-]\s*(\d{1,2})\s*[月/.-]\s*(\d{1,2})日?$/);
 const compact=text.match(/^(\d{3,4})(\d{2})(\d{2})$/);
 const m=parts??compact;if(!m)return '';
 const y=Number(m[1])+(m[1]!.length===3?1911:0);
 const iso=`${y}-${m[2]!.padStart(2,'0')}-${m[3]!.padStart(2,'0')}`;
 return isIsoCalendarDate(iso)?iso:'';
}
const amount=(value:unknown):number|null=>{
 const text=String(value??'').replace(/,/g,'').trim();
 if(!/^\d+(?:\.\d+)?$/.test(text))return null;
 const n=Number(text);return Number.isFinite(n)&&n>0?n:null;
};
const valid=(row:DividendAnnouncement)=>/^[0-9A-Z]{4,8}$/.test(row.symbol)&&Boolean(row.name)&&
 isIsoCalendarDate(row.exDate)&&!validateDividendDates({...row,lastBuyDate:''})&&
 Number.isFinite(row.updatedAt)&&row.updatedAt>0;
export function parseExchangeDividendRows(payload:unknown,updatedAt:number):DividendAnnouncement[]{
 if(!Array.isArray(payload))throw Error('證交所除息資料格式錯誤');
 return payload.flatMap(raw=>{
  if(!raw||typeof raw!=='object')return [];
  const x=raw as Record<string,unknown>;
  // The exchange report includes capital increases/ex-rights; those are not cash-dividend events.
  if(!String(x.Exdividend??'').includes('息'))return [];
  const row:DividendAnnouncement={symbol:String(x.Code??'').trim().toUpperCase(),name:String(x.Name??'').trim(),
   exDate:dateValue(x.Date),recordDate:'',paymentDate:'',perShareAmount:amount(x.CashDividend),source:'TWSE 除權息預告',updatedAt};
  return valid(row)?[row]:[];
 });
}
export function parseEtfDividendHtml(html:string,updatedAt:number):DividendAnnouncement[]{
 return (html.match(/<tr[\s\S]*?<\/tr>/gi)??[]).flatMap(tr=>{
  const cells=(tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi)??[]).map(clean);
  if(cells.length<6)return [];
  const row:DividendAnnouncement={symbol:(cells[0]??'').trim(),name:cells[1]??'',exDate:dateValue(cells[2]),
   recordDate:dateValue(cells[3]),paymentDate:dateValue(cells[4]),perShareAmount:amount(cells[5]),source:'TWSE ETF 配息公告',updatedAt};
  return valid(row)?[row]:[];
 });
}
export function mergeDividendAnnouncements(previous:readonly DividendAnnouncement[],incoming:readonly DividendAnnouncement[]):DividendAnnouncement[]{
 const map=new Map<string,DividendAnnouncement>();
 for(const row of [...previous,...incoming]){
  if(!valid(row))continue;
  const key=row.symbol+'|'+row.exDate,old=map.get(key);
  const newer=old&&old.updatedAt>row.updatedAt?old:row;
  const other=newer===row?old:row;
  const combined=other?{...newer,recordDate:newer.recordDate||other.recordDate,paymentDate:newer.paymentDate||other.paymentDate,
   perShareAmount:newer.perShareAmount??other.perShareAmount}:newer;
  // A revised ex/record date must never combine with an incompatible older payment date.
  map.set(key,valid(combined)?combined:newer);
 }
 return [...map.values()].sort((a,b)=>a.exDate.localeCompare(b.exDate)||a.symbol.localeCompare(b.symbol));
}
export function restoreDividendAnnouncementCache(raw:string|null):DividendAnnouncementCache{
 if(!raw)return {schema:1,rows:[],updatedAt:null};
 const x=JSON.parse(raw) as DividendAnnouncementCache;
 if(x.schema!==1||!Array.isArray(x.rows)||!(x.updatedAt===null||Number.isFinite(x.updatedAt)))throw Error('公告快取格式錯誤');
 const rows=x.rows.filter(row=>row&&typeof row.symbol==='string'&&typeof row.name==='string'&&typeof row.source==='string'&&
  typeof row.recordDate==='string'&&typeof row.paymentDate==='string'&&(row.perShareAmount===null||(typeof row.perShareAmount==='number'&&row.perShareAmount>0&&Number.isFinite(row.perShareAmount)))&&valid(row));
 if(rows.length!==x.rows.length)throw Error('公告快取含無效資料');
 return {schema:1,rows:mergeDividendAnnouncements([],rows),updatedAt:x.updatedAt};
}
export function announcementCalendarEvents(rows:readonly DividendAnnouncement[],_today:string):DividendCalendarEvent[]{
 const plans:DividendPlan[]=rows.map(row=>({id:'public-'+row.symbol+'-'+row.exDate,symbol:row.symbol,name:row.name,
  status:'forecast',lastBuyDate:'',exDate:row.exDate,recordDate:row.recordDate,paymentDate:row.paymentDate,
  perShareAmount:row.perShareAmount,sharesHeld:null,note:row.source}));
 const published=new Set(rows.filter(row=>row.perShareAmount!==null).map(row=>'plan-public-'+row.symbol+'-'+row.exDate));
 return buildDividendPlanCalendarEvents(plans,[]).map(event=>published.has(event.ledgerId)?{...event,status:'已公告' as const}:event);
}
/** Local receipt/plan wins on the same symbol/date/type, without hiding other dates. */
export function mergeCalendarCoverage(local:readonly DividendCalendarEvent[],announced:readonly DividendCalendarEvent[]):DividendCalendarEvent[]{
 const map=new Map<string,DividendCalendarEvent>();
 for(const event of [...local,...announced]){
  const key=[event.symbol,event.date,event.type].join('|');if(!map.has(key))map.set(key,event);
 }
 return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.type.localeCompare(b.type)||a.symbol.localeCompare(b.symbol));
}
async function readSource(url:string,html:boolean,request:typeof fetch,stamp:number):Promise<DividendAnnouncement[]>{
 const controller=new AbortController();
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  // Bound the whole response, including body reads, even when a native fetch ignores abort.
  return await Promise.race([(async()=>{
   const response=await request(url,{headers:{Accept:html?'text/html':'application/json'},signal:controller.signal});
   if(!response.ok)throw Error('HTTP '+response.status);
   const rows=html?parseEtfDividendHtml(await response.text(),stamp):parseExchangeDividendRows(await response.json(),stamp);
   if(!rows.length)throw Error('未取得可核實的股息公告');return rows;
  })(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('連線逾時'));},15000);})]);
 }finally{if(timer)clearTimeout(timer);}
}
export async function fetchDividendAnnouncements(request:typeof fetch=fetch):Promise<{rows:DividendAnnouncement[];warnings:string[]}>{
 // One acquisition revision for both feeds: detailed ETF fields win ties, independent of response order.
 const stamp=Date.now();
 const [exchange,etf]=await Promise.allSettled([
  readSource(EX_URL,false,request,stamp),
  (async()=>{let last:unknown;for(const url of ETF_URLS){try{return await readSource(url,true,request,stamp);}catch(error){last=error;}}throw last;})(),
 ]);
 const results=[exchange,etf],labels=['TWSE 除權息預告','TWSE ETF 配息公告'];
 const warnings=results.flatMap((result,i)=>result.status==='rejected'?[labels[i]+'：'+(result.reason instanceof Error?result.reason.message:'取得失敗')]:[]);
 const rows=mergeDividendAnnouncements(exchange.status==='fulfilled'?exchange.value:[],etf.status==='fulfilled'?etf.value:[]);
 if(!rows.length)throw Error('無法取得股息公告。'+warnings.join('；'));
 return {rows,warnings};
}
