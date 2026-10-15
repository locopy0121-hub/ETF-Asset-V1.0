/**
 * Official TWSE / TPEx historical daily OHLCV source.
 *
 * V3.2.9 uses this module to rebuild portfolio history from the user's first
 * trade date. Historical records are exchange-close data, not cached MIS
 * snapshots. A symbol is probed on TWSE first and then TPEx when TWSE has no
 * rows, so listed and OTC ETFs share one history API.
 */
export type DailyCandle=Readonly<{
  date:string;
  open:number;
  high:number;
  low:number;
  close:number;
  volume:number;
  source:'TWSE'|'TPEX';
}>;

export const normalizeHistorySymbol=(raw:string)=>String(raw??'').trim().toUpperCase();
export const isValidHistorySymbol=(raw:string)=>/^[0-9A-Z]{4,8}$/.test(normalizeHistorySymbol(raw));

const positive=(raw:unknown):number|null=>{
  const n=Number(String(raw??'').replace(/,/g,'').trim());
  return Number.isFinite(n)&&n>0?n:null;
};
const quantity=(raw:unknown):number|null=>{
  const n=Number(String(raw??'').replace(/,/g,'').trim());
  return Number.isFinite(n)&&n>=0?Math.floor(n):null;
};
const iso=(year:number,month:number,day:number)=>
  `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

function parseRocDate(raw:unknown):string|null{
  const match=/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/.exec(String(raw??'').trim());
  if(!match)return null;
  const year=Number(match[1])+1911,month=Number(match[2]),day=Number(match[3]);
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return iso(year,month,day);
}

export function parseTwseDailyRow(raw:unknown):DailyCandle|null{
  if(!Array.isArray(raw)||raw.length<7)return null;
  const date=parseRocDate(raw[0]);
  if(!date)return null;
  const volume=quantity(raw[1]),open=positive(raw[3]),high=positive(raw[4]),low=positive(raw[5]),close=positive(raw[6]);
  if(volume===null||open===null||high===null||low===null||close===null||
    high<Math.max(open,close)||low>Math.min(open,close)||low>high)return null;
  return {date,open,high,low,close,volume,source:'TWSE'};
}

export function parseTwseMonthly(payload:unknown):DailyCandle[]{
  if(!payload||typeof payload!=='object')return [];
  const data=payload as {stat?:unknown;data?:unknown};
  if(data.stat!=='OK'||!Array.isArray(data.data))return [];
  return data.data.map(parseTwseDailyRow).filter((item):item is DailyCandle=>item!==null);
}

export function parseTpexDailyRow(raw:unknown):DailyCandle|null{
  if(!Array.isArray(raw)||raw.length<7)return null;
  const date=parseRocDate(raw[0]);
  if(!date)return null;
  // TPEx monthly rows publish 成交仟股 / 成交仟元. Only volume needs
  // normalization here; prices are already per-share NTD.
  const volumeThousands=quantity(raw[1]),open=positive(raw[3]),high=positive(raw[4]),low=positive(raw[5]),close=positive(raw[6]);
  if(volumeThousands===null||open===null||high===null||low===null||close===null||
    high<Math.max(open,close)||low>Math.min(open,close)||low>high)return null;
  return {date,open,high,low,close,volume:volumeThousands*1000,source:'TPEX'};
}

export function parseTpexMonthly(payload:unknown):DailyCandle[]{
  if(!payload||typeof payload!=='object')return [];
  const data=payload as {stat?:unknown;tables?:unknown};
  if(String(data.stat??'').toLowerCase()!=='ok'||!Array.isArray(data.tables))return [];
  const table=data.tables[0] as {data?:unknown}|undefined;
  if(!table||!Array.isArray(table.data))return [];
  return table.data.map(parseTpexDailyRow).filter((item):item is DailyCandle=>item!==null);
}

const twseEndpoints=(date:string,symbol:string)=>[
  `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${date}&stockNo=${encodeURIComponent(symbol)}`,
  `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?response=json&date=${date}&stockNo=${encodeURIComponent(symbol)}`,
] as const;

async function fetchTwseMonth(date:string,symbol:string,signal?:AbortSignal):Promise<{rows:DailyCandle[];hadResponse:boolean;errors:string[]}>{
  const errors:string[]=[];
  let hadResponse=false;
  for(const url of twseEndpoints(date,symbol)){
    if(signal?.aborted)throw new Error('查詢已取消');
    try{
      const response=await fetch(url,{headers:{Accept:'application/json','Cache-Control':'no-cache'},...(signal?{signal}:{})});
      if(!response.ok){errors.push('TWSE HTTP '+response.status);continue;}
      hadResponse=true;
      const payload=await response.json();
      const rows=parseTwseMonthly(payload);
      if(rows.length)return {rows,hadResponse:true,errors};
    }catch(error){
      if(signal?.aborted)throw new Error('查詢已取消');
      errors.push(error instanceof Error?error.message:String(error));
    }
  }
  return {rows:[],hadResponse,errors};
}

async function fetchTpexMonth(date:string,symbol:string,signal?:AbortSignal):Promise<{rows:DailyCandle[];hadResponse:boolean;errors:string[]}>{
  const errors:string[]=[];
  try{
    if(signal?.aborted)throw new Error('查詢已取消');
    const year=date.slice(0,4),month=date.slice(4,6);
    const body='response=json&code='+encodeURIComponent(symbol)+'&date='+encodeURIComponent(`${year}/${month}/01`);
    const response=await fetch('https://www.tpex.org.tw/www/zh-tw/afterTrading/tradingStock',{
      method:'POST',
      headers:{
        Accept:'application/json, text/javascript, */*; q=0.01',
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
        'Cache-Control':'no-cache',
      },
      body,
      ...(signal?{signal}:{}),
    });
    if(!response.ok)return {rows:[],hadResponse:false,errors:['TPEx HTTP '+response.status]};
    const payload=await response.json();
    const rows=parseTpexMonthly(payload);
    return {rows,hadResponse:true,errors};
  }catch(error){
    if(signal?.aborted)throw new Error('查詢已取消');
    errors.push(error instanceof Error?error.message:String(error));
    return {rows:[],hadResponse:false,errors};
  }
}

async function fetchOfficialMonth(date:string,symbol:string,signal?:AbortSignal,preferred?:DailyCandle['source']|null){
  if(preferred==='TWSE')return fetchTwseMonth(date,symbol,signal);
  if(preferred==='TPEX')return fetchTpexMonth(date,symbol,signal);
  const twse=await fetchTwseMonth(date,symbol,signal);
  if(twse.rows.length)return twse;
  const tpex=await fetchTpexMonth(date,symbol,signal);
  if(tpex.rows.length)return tpex;
  return {
    rows:[] as DailyCandle[],
    hadResponse:twse.hadResponse||tpex.hadResponse,
    errors:[...twse.errors,...tpex.errors],
  };
}

const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;
const MAX_HISTORY_MONTHS=360;

function parseIsoDate(value:string){
  if(!ISO_DATE.test(value))return null;
  const parts=value.split('-').map(Number);
  const year=parts[0]??NaN,month=parts[1]??NaN,day=parts[2]??NaN;
  if(!Number.isInteger(year)||!Number.isInteger(month)||!Number.isInteger(day))return null;
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return {year,month,day,date};
}

function monthCount(start:{year:number;month:number},end:{year:number;month:number}){
  return (end.year-start.year)*12+(end.month-start.month)+1;
}

/**
 * Fetches exchange-close history for one symbol over an explicit date range.
 * The range is capped at 30 years to prevent an accidental unbounded mobile
 * request storm while still covering the full lifetime of Taiwan ETFs.
 */
export async function fetchOfficialDailyHistoryRange(
  symbol:string,
  startDate:string,
  endDate:string,
  signal?:AbortSignal,
):Promise<DailyCandle[]>{
  const code=normalizeHistorySymbol(symbol);
  const start=parseIsoDate(startDate),end=parseIsoDate(endDate);
  if(!isValidHistorySymbol(code)||!start||!end||startDate>endDate)throw new Error('無效的歷史行情查詢');
  const months=monthCount(start,end);
  if(months<1||months>MAX_HISTORY_MONTHS)throw new Error('歷史行情查詢範圍超過 30 年');

  const all=new Map<string,DailyCandle>();
  const failures:string[]=[];
  let successfulResponses=0;
  let preferredSource:DailyCandle['source']|null=null;
  for(let offset=0;offset<months;offset++){
    if(signal?.aborted)throw new Error('查詢已取消');
    const cursor=new Date(Date.UTC(end.year,end.month-1-offset,1));
    const monthDate=`${cursor.getUTCFullYear()}${String(cursor.getUTCMonth()+1).padStart(2,'0')}01`;
    const month=await fetchOfficialMonth(monthDate,code,signal,preferredSource);
    if(month.hadResponse)successfulResponses+=1;
    if(!preferredSource&&month.rows.length)preferredSource=month.rows[0]?.source??null;
    if(month.errors.length&&!month.hadResponse)failures.push(...month.errors);
    for(const candle of month.rows){
      if(candle.date>=startDate&&candle.date<=endDate)all.set(candle.date,candle);
    }
  }
  const rows=[...all.values()].sort((a,b)=>a.date.localeCompare(b.date));
  if(rows.length)return rows;
  if(successfulResponses>0)return [];
  throw new Error(failures[0]?'歷史資料來源暫時無法連線：'+failures[0]:'歷史資料來源暫時無法連線');
}

/** Existing chart API retained for compatibility. */
export async function fetchOfficialDailyHistory(symbol:string,months:number,now=new Date(),signal?:AbortSignal):Promise<DailyCandle[]>{
  if(!Number.isInteger(months)||months<1||months>12)throw new Error('無效的歷史行情查詢');
  const endDate=iso(now.getFullYear(),now.getMonth()+1,now.getDate());
  const startMonth=new Date(Date.UTC(now.getFullYear(),now.getMonth()-(months-1),1));
  const startDate=iso(startMonth.getUTCFullYear(),startMonth.getUTCMonth()+1,1);
  return fetchOfficialDailyHistoryRange(symbol,startDate,endDate,signal);
}
