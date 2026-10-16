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

/** Historical index OHLC comes from TWSE's separate official index history;
 * FMTQIK closes and individual-stock candles are NOT valid substitutes. */
export type TaiexDailyOhlc=Readonly<{
  date:string;open:number;high:number;low:number;close:number;source:'TWSE MI_5MINS_HIST'
}>;
export type IndexThreeGates=Readonly<{referenceDate:string;upper:number;middle:number;lower:number}>;

export function parseTaiexDailyOhlc(raw:unknown):TaiexDailyOhlc[]{
  if(!raw||typeof raw!=='object')return [];
  const payload=raw as {stat?:unknown;fields?:unknown;data?:unknown};
  if(payload.stat!=='OK'||!Array.isArray(payload.fields)||!Array.isArray(payload.data))return [];
  const labels=payload.fields.map(x=>String(x).replace(/\s+/g,'').trim());
  const columns=['日期','開盤指數','最高指數','最低指數','收盤指數'].map(x=>labels.indexOf(x));
  if(columns.some(x=>x<0))return [];
  const [d,o,h,l,c]=columns;
  const result=new Map<string,TaiexDailyOhlc>();
  for(const row of payload.data){
    if(!Array.isArray(row))continue;
    const date=rocDate(row[d!]),open=positive(row[o!]),high=positive(row[h!]),low=positive(row[l!]),close=positive(row[c!]);
    if(!date||open===null||high===null||low===null||close===null)continue;
    if(high<low||open<low||open>high||close<low||close>high)continue;
    result.set(date,{date,open,high,low,close,source:'TWSE MI_5MINS_HIST'});
  }
  return [...result.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

/** Today's three levels are computed from the PREVIOUS completed trading day,
 * never from today's partial high/low or a different day's market snapshot. */
export function indexThreeGates(rows:readonly TaiexDailyOhlc[],tradeDate:string):IndexThreeGates|null{
  if(!isoValid(tradeDate))return null;
  const prior=[...rows].filter(x=>x.date<tradeDate).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
  if(!prior||!(prior.high>=prior.low&&prior.low>0))return null;
  const span=prior.high-prior.low;
  return {referenceDate:prior.date,upper:prior.low+span*1.382,
    middle:(prior.high+prior.low)/2,lower:prior.high-span*1.382};
}

/** Avoid showing the same trading date twice (ISO date plus localized timestamp). */
export function taiexStatusLabel(status:string,display:Readonly<{
  date:string;sourceAt:number;source:string;live:boolean
}>|null):string{
  if(!display)return status+'｜交易日尚未確認';
  const time=Number.isFinite(display.sourceAt)&&taipeiIndexDate(new Date(display.sourceAt))===display.date?
    new Date(display.sourceAt).toLocaleTimeString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'時間待核實';
  return status+'｜交易日 '+display.date+'｜'+(display.live?'報價':'收盤')+' '+time+'｜'+display.source;
}
