/** TAIEX is a read-only market index, never a portfolio security. */
export type IndexClose=Readonly<{date:string;close:number;change:number|null;volume:number|null;source:'TWSE FMTQIK'}>;
export type IndexSnapshot=Readonly<{date:string;value:number;previousClose:number|null;open:number|null;high:number|null;low:number|null;sourceAt:number;source:'TWSE MIS'}>;
export type IndexRange='d1'|'d5'|'m1'|'m6'|'ytd'|'y1';
export type IndexPoint=Readonly<{at:number;value:number}>;
const numeric=(x:unknown)=>{
  const s=String(x??'').replace(/,/g,'').trim();
  if(!/^[-+]?\d+(\.\d+)?$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)?n:null;
};
const positive=(x:unknown)=>{const n=numeric(x);return n!==null&&n>0?n:null};
const isoValid=(v:string)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  const [y,m,d]=v.split('-').map(Number);
  const t=new Date(Date.UTC(y!,m!-1,d!));
  return y===t.getUTCFullYear()&&m===t.getUTCMonth()+1&&d===t.getUTCDate();
};
const rocDate=(v:unknown)=>{
  const m=/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/.exec(String(v??'').trim());
  if(!m)return null;
  const s=(Number(m[1])+1911)+'-'+String(Number(m[2])).padStart(2,'0')+'-'+String(Number(m[3])).padStart(2,'0');
  return isoValid(s)?s:null;
};
const ymd=(v:unknown)=>{
  const s=String(v??'').trim();
  if(!/^\d{8}$/.test(s))return null;
  const date=s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6);
  return isoValid(date)?date:null;
};
export function taipeiIndexDate(now=new Date()):string{
  const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const v=(s:string)=>p.find(x=>x.type===s)?.value??'';
  return v('year')+'-'+v('month')+'-'+v('day');
}
export function parseTaiexMis(raw:unknown):IndexSnapshot|null{
  if(!raw||typeof raw!=='object')return null;
  const rows=(raw as {msgArray?:unknown}).msgArray;
  if(!Array.isArray(rows))return null;
  for(const obj of rows){
    if(!obj||typeof obj!=='object')continue;
    const x=obj as Record<string,unknown>;
    if(String(x.c??'').toLowerCase()!=='t00'&&String(x.ch??'').toLowerCase()!=='t00.tw')continue;
    const date=ymd(x.d),v=positive(x.z);
    if(!date||v===null)continue;
    const high=positive(x.h),low=positive(x.l);
    if(high!==null&&low!==null&&high<low)continue;
    const clock=/^\d{2}:\d{2}:\d{2}$/.test(String(x.t??''))?String(x.t):'13:30:00';
    const at=new Date(date+'T'+clock+'+08:00').getTime();
    if(!Number.isFinite(at))continue;
    const ts=numeric(x.tlong);
    return {date,value:v,previousClose:positive(x.y),open:positive(x.o),high,low,
      sourceAt:ts!==null&&ts>1e12&&Math.abs(ts-at)<86400000?ts:at,source:'TWSE MIS'};
  }
  return null;
}
export function parseTaiexFmtqik(raw:unknown):IndexClose[]{
  if(!raw||typeof raw!=='object')return [];
  const p=raw as {stat?:unknown;fields?:unknown;data?:unknown};
  if(p.stat!=='OK'||!Array.isArray(p.fields)||!Array.isArray(p.data))return [];
  const labels=p.fields.map(x=>String(x).replace(/\s+/g,'').trim());
  const d=labels.indexOf('日期'),c=labels.indexOf('發行量加權股價指數'),delta=labels.indexOf('漲跌點數'),vol=labels.indexOf('成交股數');
  if([d,c,delta,vol].some(x=>x<0))return [];
  const map=new Map<string,IndexClose>();
  for(const item of p.data){
    if(!Array.isArray(item))continue;
    const date=rocDate(item[d]),close=positive(item[c]);
    if(date&&close!==null)map.set(date,{date,close,change:numeric(item[delta]),volume:positive(item[vol]),source:'TWSE FMTQIK'});
  }
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function pickTaiexDisplay(mis:IndexSnapshot|null,history:readonly IndexClose[],today:string,phase:'live'|'afterHours'|'offline'){
  const sorted=[...history].sort((a,b)=>a.date.localeCompare(b.date));
  const end=sorted[sorted.length-1]??null;
  const fresh=!!mis&&mis.date<=today&&mis.date>=(end?.date??'')&&
    (phase==='live'||!end||mis.date>end.date);
  if(fresh&&mis){
    const delta=mis.previousClose===null?null:mis.value-mis.previousClose;
    return {date:mis.date,value:mis.value,change:delta,
      percent:delta===null?null:delta/mis.previousClose!*100,previousClose:mis.previousClose,
      open:mis.open,high:mis.high,low:mis.low,source:mis.source,
      sourceAt:mis.sourceAt,live:phase==='live'&&mis.date===today,fromClose:false};
  }
  if(!end)return null;
  const prior=end.change!==null?end.close-end.change:null;
  return {date:end.date,value:end.close,change:end.change,
    percent:prior!==null&&prior>0&&end.change!==null?end.change/prior*100:null,
    previousClose:prior!==null&&prior>0?prior:null,
    open:null,high:null,low:null,source:end.source,
    sourceAt:new Date(end.date+'T13:30:00+08:00').getTime(),live:false,fromClose:true};
}
export function selectTaiexHistory(history:readonly IndexClose[],range:IndexRange,today:string){
  const rows=[...history].filter(x=>x.date<=today).sort((a,b)=>a.date.localeCompare(b.date));
  if(range==='d5')return rows.slice(-5);
  const epoch=Date.parse(today+'T00:00:00Z');
  if(range==='m1')return rows.filter(x=>Date.parse(x.date+'T00:00:00Z')>=epoch-31*86400000);
  if(range==='m6')return rows.filter(x=>Date.parse(x.date+'T00:00:00Z')>=epoch-183*86400000);
  if(range==='ytd')return rows.filter(x=>x.date>=today.slice(0,4)+'-01-01');
  if(range==='y1')return rows.filter(x=>Date.parse(x.date+'T00:00:00Z')>=epoch-365*86400000);
  return [];
}
export function taiex52WeekCloseRange(history:readonly IndexClose[],today:string){
  const x=selectTaiexHistory(history,'y1',today);
  return x.length<180?null:{high:Math.max(...x.map(v=>v.close)),low:Math.min(...x.map(v=>v.close)),days:x.length};
}
