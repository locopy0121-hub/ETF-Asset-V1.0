/**
 * Taipei Exchange official daily institutional detail for TPEx (OTC) symbols.
 * The JSON aaData report is end-of-day only. Never use it as a live quote.
 *
 * Shape in TPEx 3itrade_hedge_result daily report:
 * [symbol,name, seven blocks of (buy,sell,net), overall institutional net]
 * Blocks: foreign ex dealer, foreign dealer, foreign combined, trust,
 *         proprietary dealer, hedging dealer, dealer combined.
 */
import {taipeiCalendarDate,type InstitutionalRecord} from './twseInstitutional';
const DAY_MS=86400000;
type TpexPayload={aaData?:unknown;iTotalRecords?:unknown;date?:unknown;reportDate?:unknown};
const integer=(value:unknown):number|null=>{
  const cleaned=String(value??'').replace(/<[^>]*>/g,'').replace(/&nbsp;|&#160;/gi,'')
    .replace(/,/g,'').replace(/[＋]/g,'+').replace(/[−－]/g,'-').replace(/\s+/g,'').trim();
  return /^[+-]?\d+$/.test(cleaned)&&Number.isSafeInteger(Number(cleaned))?Number(cleaned):null;
};
const validDate=(iso:string):boolean=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return false;
  const [y,m,d]=iso.split('-').map(Number);
  const x=new Date(Date.UTC(y!,m!-1,d!));
  return x.getUTCFullYear()===y&&x.getUTCMonth()+1===m&&x.getUTCDate()===d;
};
const announcedDate=(value:unknown):string|null=>{
  const s=String(value??'').trim();
  let match=/^(\d{3})\/(\d{1,2})\/(\d{1,2})$/.exec(s);
  if(match){
    const y=Number(match[1])+1911,m=Number(match[2]),d=Number(match[3]);
    const iso=y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    return validDate(iso)?iso:null;
  }
  match=/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  if(match){
    const iso=match[1]+'-'+String(Number(match[2])).padStart(2,'0')+'-'+String(Number(match[3])).padStart(2,'0');
    return validDate(iso)?iso:null;
  }
  return null;
};
export function parseTpexInstitutional(payload:unknown,symbol:string,date:string,now=Date.now()):InstitutionalRecord|null{
  if(!payload||typeof payload!=='object'||!validDate(date))return null;
  const p=payload as TpexPayload;
  if(!Array.isArray(p.aaData))return null;
  if(p.iTotalRecords!==undefined&&
     (!Number.isInteger(Number(p.iTotalRecords))||Number(p.iTotalRecords)<0||Number(p.iTotalRecords)<p.aaData.length))return null;
  const announced=p.reportDate??p.date;
  if(announced!==undefined&&announcedDate(announced)!==date)return null;
  const wanted=symbol.trim().toUpperCase();
  for(const row of p.aaData){
    if(!Array.isArray(row)||String(row[0]??'').trim().toUpperCase()!==wanted)continue;
    // Reject unknown shapes: 2 identifiers, 7 x (buy,sell,net), 1 total.
    if(row.length!==24)return null;
    const numbers=row.slice(2).map(integer);
    if(numbers.some(x=>x===null))return null;
    // Enforce the official arithmetic for every buy/sell/net block.
    for(let i=0;i<21;i+=3){
      if(numbers[i]! - numbers[i+1]! !== numbers[i+2]!)return null;
    }
    const foreign=numbers[2]!,trust=numbers[11]!,dealer=numbers[20]!,total=numbers[21]!;
    if(foreign+trust+dealer!==total)return null;
    return {date,symbol:wanted,name:String(row[1]??'').replace(/<[^>]*>/g,'').trim(),
      foreign,trust,dealer,total,source:'TPEx 三大法人日報',fetchedAt:now};
  }
  return null;
}
const cache=new Map<string,{expires:number;record:InstitutionalRecord|null}>();
export async function fetchTpexInstitutionalDay(symbol:string,date:string,signal?:AbortSignal):Promise<InstitutionalRecord|null>{
  if(!/^[0-9A-Z]{4,8}$/.test(symbol)||!validDate(date))throw new Error('無效的上櫃法人查詢');
  const key=date+'@'+symbol;
  const cached=cache.get(key);
  if(cached&&cached.expires>Date.now())return cached.record;
  const [year,month,day]=date.split('-').map(Number);
  const roc=(year!-1911)+'/'+String(month).padStart(2,'0')+'/'+String(day).padStart(2,'0');
  const query=new URLSearchParams({l:'zh-tw',o:'json',se:'EW',t:'D',d:roc,s:'0,asc'});
  const url='https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php?'+query.toString();
  const response=await fetch(url,{headers:{Accept:'application/json','Cache-Control':'no-cache'},...(signal?{signal}:{})});
  if(!response.ok)throw new Error('TPEx 法人日報 HTTP '+response.status);
  const value=parseTpexInstitutional(await response.json(),symbol,date);
  cache.set(key,{record:value,expires:Date.now()+(value?60*60*1000:10*60*1000)});
  return value;
}
export async function fetchTpexInstitutionalSeries(symbol:string,count=5,now=new Date(),signal?:AbortSignal):Promise<InstitutionalRecord[]>{
  if(!Number.isInteger(count)||count<1||count>10)throw new Error('無效的法人查詢天數');
  const today=taipeiCalendarDate(now);
  const anchor=new Date(today+'T00:00:00Z').getTime();
  const data:InstitutionalRecord[]=[];
  let failed:Error|null=null,successful=0;
  // Maximum 15 calendar days; no polling outside the opened institutional tab.
  for(let age=0;age<15&&data.length<count;age++){
    if(signal?.aborted)throw new Error('查詢已取消');
    const day=new Date(anchor-age*DAY_MS);
    if(day.getUTCDay()===0||day.getUTCDay()===6)continue;
    const date=day.toISOString().slice(0,10);
    try{
      const record=await fetchTpexInstitutionalDay(symbol,date,signal);
      successful++;
      if(record)data.push(record);
    }catch(error){
      if(signal?.aborted)throw new Error('查詢已取消');
      failed=error instanceof Error?error:new Error(String(error));
    }
  }
  if(!data.length&&successful===0&&failed)throw failed;
  return data;
}
