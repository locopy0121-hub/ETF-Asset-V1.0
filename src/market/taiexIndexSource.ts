import {parseTaiexMis,parseTaiexFmtqik,type IndexClose,type IndexSnapshot} from './taiexIndex';
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
