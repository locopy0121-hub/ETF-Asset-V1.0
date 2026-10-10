/**
 * TWSE e添富 reference NAV chart. Market close and NAV must share a trading day
 * before calculating premium. This is historical reference, NOT live iNAV.
 */
import type {DailyCandle} from './twseDailyHistory';
import {premiumDiscount} from './marketResearchModel';
export type NavRecord=Readonly<{date:string;nav:number;source:'TWSE e添富';reportedPct:number|null}>;
export type NavComparison=Readonly<{date:string;nav:number;close:number|null;premiumPct:number|null;reportedPct:number|null;source:'TWSE e添富'}>;
function dateOf(raw:unknown):string|null{
  const input=String(raw??'').trim();
  if(/^\d{8}$/.test(input))return input.slice(0,4)+'-'+input.slice(4,6)+'-'+input.slice(6,8);
  if(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(input)){
    const [year,month,day]=input.split(/[-/]/).map(Number);
    const dt=new Date(Date.UTC(year!,month!-1,day!));
    if(dt.getUTCFullYear()===year&&dt.getUTCMonth()+1===month&&dt.getUTCDate()===day)
      return String(year)+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  }
  return null;
}
const finite=(v:unknown):number|null=>{
  const raw=String(v??'').replace(/,/g,'').trim();
  if(!raw||raw==='--'||raw==='-')return null;
  const n=Number(raw);return Number.isFinite(n)?n:null;
};
export function parseEtfNavRows(payload:unknown):NavRecord[]{
  if(!payload||typeof payload!=='object')return [];
  const p=payload as {netPrice?:unknown;atmps?:unknown};
  if(!Array.isArray(p.netPrice))return [];
  const atmps=new Map<string,number>();
  if(Array.isArray(p.atmps))for(const row of p.atmps){
    if(!row||typeof row!=='object')continue;
    const x=row as {date?:unknown;count?:unknown};
    const date=dateOf(x.date),v=finite(x.count);
    if(date&&v!==null)atmps.set(date,v);
  }
  const rows=new Map<string,NavRecord>();
  for(const row of p.netPrice){
    if(!row||typeof row!=='object')continue;
    const x=row as {date?:unknown;count?:unknown};
    const date=dateOf(x.date),nav=finite(x.count);
    if(date&&nav!==null&&nav>0)rows.set(date,{date,nav,reportedPct:atmps.get(date)??null,source:'TWSE e添富'});
  }
  return [...rows.values()].sort((a,b)=>b.date.localeCompare(a.date));
}
export function matchOfficialNavToClose(nav:readonly NavRecord[],history:readonly DailyCandle[]):NavComparison[]{
  const close=new Map(history.filter(x=>x.close>0).map(x=>[x.date,x.close]));
  return nav.map(x=>{
    const value=close.get(x.date)??null;
    return {date:x.date,nav:x.nav,reportedPct:x.reportedPct,close:value,
      premiumPct:value===null?null:premiumDiscount(value,x.nav),source:x.source};
  });
}
export async function fetchOfficialEtfNavHistory(symbol:string,months=3,now=new Date(),signal?:AbortSignal):Promise<NavRecord[]>{
  if(!/^\d{4,8}[A-Z]?$/.test(symbol)||!Number.isInteger(months)||months<1||months>12)throw new Error('無效的 ETF NAV 查詢');
  const fmt=(d:Date)=>d.getUTCFullYear()+'/'+String(d.getUTCMonth()+1).padStart(2,'0')+'/'+String(d.getUTCDate()).padStart(2,'0');
  const end=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
  const start=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()-(months-1),1));
  const body=new URLSearchParams({id:symbol,startDate:fmt(start),endDate:fmt(end),type:'fundPric'}).toString();
  const response=await fetch('https://www.twse.com.tw/zh/ETFortune/ajaxEtfInfoChart',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8',Accept:'application/json'},body,
    ...(signal?{signal}:{})});
  if(!response.ok)throw new Error('TWSE ETF NAV HTTP '+response.status);
  const data=parseEtfNavRows(await response.json());
  return data.filter(x=>x.date>=fmt(start).replaceAll('/','-')&&x.date<=fmt(end).replaceAll('/','-'));
}
