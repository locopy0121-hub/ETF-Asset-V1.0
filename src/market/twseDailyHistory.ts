/**
 * TWSE monthly official daily OHLCV endpoint. Never synthesize candles from
 * single quotes, a display sparkline or local ledger transactions.
 * An unavailable response is an explicit missing-history state.
 */
export type DailyCandle=Readonly<{date:string;open:number;high:number;low:number;close:number;volume:number;source:'TWSE'}>;
const positive=(raw:unknown):number|null=>{
  const n=Number(String(raw??'').replace(/,/g,'').trim());
  return Number.isFinite(n)&&n>0?n:null;
};
const quantity=(raw:unknown):number|null=>{
  const n=Number(String(raw??'').replace(/,/g,'').trim());
  return Number.isSafeInteger(n)&&n>=0?n:null;
};
export function parseTwseDailyRow(raw:unknown):DailyCandle|null{
  if(!Array.isArray(raw)||raw.length<7)return null;
  const match=/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/.exec(String(raw[0]??'').trim());
  if(!match)return null;
  const year=Number(match[1])+1911,month=Number(match[2]),day=Number(match[3]);
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  const volume=quantity(raw[1]),open=positive(raw[3]),high=positive(raw[4]),low=positive(raw[5]),close=positive(raw[6]);
  if(volume===null||open===null||high===null||low===null||close===null||high<Math.max(open,close)||low>Math.min(open,close)||low>high)return null;
  return {date:`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,open,high,low,close,volume,source:'TWSE'};
}
export function parseTwseMonthly(payload:unknown):DailyCandle[]{
  if(!payload||typeof payload!=='object')return [];
  const data=payload as {stat?:unknown;data?:unknown};
  if(data.stat!=='OK'||!Array.isArray(data.data))return [];
  return data.data.map(parseTwseDailyRow).filter((item):item is DailyCandle=>item!==null);
}
export async function fetchOfficialDailyHistory(symbol:string,months:number,now=new Date(),signal?:AbortSignal):Promise<DailyCandle[]>{
  if(!/^\d{4,6}$/.test(symbol)||months<1||months>12)throw new Error('無效的歷史行情查詢');
  const all=new Map<string,DailyCandle>();
  for(let offset=0;offset<months;offset++){
    if(signal?.aborted)throw new Error('查詢已取消');
    const day=new Date(Date.UTC(now.getFullYear(),now.getMonth()-offset,1));
    const date=`${day.getUTCFullYear()}${String(day.getUTCMonth()+1).padStart(2,'0')}01`;
    const url=`https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${date}&stockNo=${symbol}`;
    const response=await fetch(url,{headers:{Accept:'application/json'},...(signal?{signal}:{})});
    if(!response.ok)throw new Error(`TWSE 歷史行情 HTTP ${response.status}`);
    const parsed=parseTwseMonthly(await response.json());
    for(const candle of parsed)all.set(candle.date,candle);
  }
  return [...all.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
