import {parseTaiexMis,parseTaiexFmtqik,parseTaiexDailyOhlc,parseTaiexIntraday,type TaiexIntraday,type IndexClose,type IndexSnapshot,type TaiexDailyOhlc} from './taiexIndex';
const monthCache=new Map<string,{at:number;rows:IndexClose[]}>();
export async function fetchTaiexMis(signal?:AbortSignal):Promise<IndexSnapshot|null>{
  const response=await fetch('https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_t00.tw&json=1&delay=0',
    {headers:{Accept:'application/json','Cache-Control':'no-cache'},...(signal?{signal}:{})});
  if(!response.ok)throw new Error('TWSE MIS HTTP '+response.status);
  const payload:unknown=await response.json();
  if(!payload||typeof payload!=='object'||!Array.isArray((payload as {msgArray?:unknown}).msgArray))
    throw new Error('TWSE MIS 指數格式無法辨識');
  return parseTaiexMis(payload);
}
export async function fetchTaiexMonth(month:string,signal?:AbortSignal):Promise<IndexClose[]>{
  if(!/^\d{6}$/.test(month))throw new Error('指數月份不合法');
  const cache=monthCache.get(month);
  if(cache&&Date.now()-cache.at<6*60*60*1000)return cache.rows;
  const response=await fetch('https://www.twse.com.tw/rwd/zh/afterTrading/FMTQIK?response=json&date='+month+'01',
    {headers:{Accept:'application/json','Cache-Control':'no-cache'},...(signal?{signal}:{})});
  if(!response.ok)throw new Error('TWSE FMTQIK HTTP '+response.status);
  const payload:unknown=await response.json();
  if(!payload||typeof payload!=='object'||!Array.isArray((payload as {data?:unknown}).data))
    throw new Error('TWSE FMTQIK 來源格式已變更');
  const rows=parseTaiexFmtqik(payload);
  if(rows.length)monthCache.set(month,{at:Date.now(),rows});
  return rows;
}
export async function fetchTaiexHistory(months:number,now=new Date(),signal?:AbortSignal):Promise<IndexClose[]>{
  if(!Number.isInteger(months)||months<1||months>13)throw new Error('查詢月份不合法');
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit'}).formatToParts(now);
  const year=Number(parts.find(x=>x.type==='year')?.value),month=Number(parts.find(x=>x.type==='month')?.value);
  const data:IndexClose[]=[];
  let success=0,error:Error|null=null;
  for(let i=0;i<months;i++){
    if(signal?.aborted)throw new Error('指數查詢已取消');
    const d=new Date(Date.UTC(year,month-1-i,1));
    const ym=d.getUTCFullYear()+String(d.getUTCMonth()+1).padStart(2,'0');
    try{data.push(...await fetchTaiexMonth(ym,signal));success++;}
    catch(e){if(signal?.aborted)throw new Error('指數查詢已取消');error=e instanceof Error?e:new Error(String(e));}
  }
  if(success===0&&error)throw error;
  return [...new Map(data.map(x=>[x.date,x] as const)).values()].sort((a,b)=>a.date.localeCompare(b.date));
}

const ohlcCache=new Map<string,{at:number;rows:TaiexDailyOhlc[]}>();
export async function fetchTaiexOhlcMonth(month:string,signal?:AbortSignal):Promise<TaiexDailyOhlc[]>{
  if(!/^\d{6}$/.test(month))throw new Error('指數 OHLC 月份不合法');
  const cached=ohlcCache.get(month);
  if(cached&&Date.now()-cached.at<6*60*60*1000)return cached.rows;
  const response=await fetch('https://www.twse.com.tw/rwd/zh/TAIEX/MI_5MINS_HIST?response=json&date='+month+'01',
    {headers:{Accept:'application/json','Cache-Control':'no-cache'},...(signal?{signal}:{})});
  if(!response.ok)throw new Error('TWSE MI_5MINS_HIST HTTP '+response.status);
  const payload:unknown=await response.json();
  if(!payload||typeof payload!=='object'||!Array.isArray((payload as {data?:unknown}).data))
    throw new Error('TWSE 指數開高低收格式無法辨識');
  const rows=parseTaiexDailyOhlc(payload);
  if(rows.length)ohlcCache.set(month,{at:Date.now(),rows});
  return rows;
}
export async function fetchTaiexRecentOhlc(now=new Date(),signal?:AbortSignal):Promise<TaiexDailyOhlc[]>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit'}).formatToParts(now);
  const year=Number(parts.find(x=>x.type==='year')?.value);
  const month=Number(parts.find(x=>x.type==='month')?.value);
  const all:TaiexDailyOhlc[]=[];let successes=0;let lastError:Error|null=null;
  for(let i=0;i<2;i++){
    if(signal?.aborted)throw new Error('指數 OHLC 查詢已取消');
    const d=new Date(Date.UTC(year,month-1-i,1));
    try{
      all.push(...await fetchTaiexOhlcMonth(d.getUTCFullYear()+String(d.getUTCMonth()+1).padStart(2,'0'),signal));
      successes++;
    }catch(e){if(signal?.aborted)throw new Error('指數 OHLC 查詢已取消');
      lastError=e instanceof Error?e:new Error(String(e));}
  }
  if(successes===0&&lastError)throw lastError;
  return [...new Map(all.map(x=>[x.date,x] as const)).values()].sort((a,b)=>a.date.localeCompare(b.date));
}

const tapeCache=new Map<string,{at:number;data:TaiexIntraday}>();
export async function fetchTaiexIntraday(date:string,signal?:AbortSignal):Promise<TaiexIntraday|null>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('指數日期格式不合法');
  const cached=tapeCache.get(date);
  if(cached&&Date.now()-cached.at<5*60*1000)return cached.data;
  const response=await fetch('https://www.twse.com.tw/exchangeReport/MI_5MINS_INDEX?response=json&date='+date.replace(/-/g,''),
    {headers:{Accept:'application/json'},...(signal?{signal}:{})});
  if(!response.ok)throw new Error('TWSE MI_5MINS_INDEX HTTP '+response.status);
  const payload:unknown=await response.json();
  const data=parseTaiexIntraday(payload,date);
  if(data)tapeCache.set(date,{at:Date.now(),data});
  return data;
}
