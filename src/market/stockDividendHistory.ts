/**
 * Stock dividend research only. FinMind TaiwanStockDividend is a *third-party*
 * historical policy dataset, not a TWSE realtime feed and not an App ledger.
 * It is never imported by FinanceRuntime or DividendScreen.
 * https://finmind.github.io/tutor/TaiwanMarket/Fundamental/
 */
export type StockDividendRecord=Readonly<{
  symbol:string;
  referenceDate:string;
  fiscalYear:number|null;
  fiscalLabel:string;
  cashTwdPerShare:number|null;
  stockTwdPerShare:number|null;
  cashExDate:string|null;
  stockExDate:string|null;
  paymentDate:string|null;
  announcementDate:string|null;
  source:'FinMind TaiwanStockDividend';
}>;
export type DividendYearSummary=Readonly<{
  year:number;items:number;cashTwdPerShare:number|null;stockTwdPerShare:number|null;
}>;
type RawRow=Record<string,unknown>;
const fiscalYear=(raw:unknown):number|null=>{
 const m=/^(\d{2,3})年/.exec(String(raw??'').trim());
 return m?Number(m[1])+1911:null;
};
const validDate=(raw:unknown):string|null=>{
 const x=String(raw??'').trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(x))return null;
 const [year,month,day]=x.split('-').map(Number);
 const d=new Date(Date.UTC(year!,month!-1,day!));
 return d.getUTCFullYear()===year&&d.getUTCMonth()+1===month&&d.getUTCDate()===day?x:null;
};
const positiveOrZero=(raw:unknown):number|null=>{
 if(raw===null||raw===undefined||String(raw).trim()==='')return null;
 const s=String(raw).replace(/,/g,'').trim();
 if(!/^\d+(?:\.\d+)?$/.test(s))return null;
 const n=Number(s);return Number.isFinite(n)&&n>=0&&n<=1e6?n:null;
};
const distribution=(x:RawRow,k1:string,k2:string):number|null=>{
 const a=positiveOrZero(x[k1]),b=positiveOrZero(x[k2]);
 // Missing components must not silently become zero and produce false totals.
 return a===null||b===null?null:Math.round((a+b)*1e6)/1e6;
};
export function parseStockDividendHistory(payload:unknown,symbol:string):StockDividendRecord[]{
 if(!payload||typeof payload!=='object')throw new Error('股利來源不是有效資料物件');
 const body=payload as {status?:unknown;msg?:unknown;data?:unknown};
 if(body.status!==200||!Array.isArray(body.data)){
  throw new Error('FinMind 歷史股利資料不可用：'+String(body.msg??body.status??'格式不符'));
 }
 const wanted=symbol.trim().toUpperCase();
 const unique=new Map<string,StockDividendRecord>();
 for(const raw of body.data){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
  const x=raw as RawRow;
  if(String(x.stock_id??'').trim().toUpperCase()!==wanted)continue;
  const date=validDate(x.date);
  if(!date)continue;
  const year=fiscalYear(x.year);
  const label=String(x.year??'').trim();
  const row:StockDividendRecord={
    symbol:wanted,referenceDate:date,fiscalYear:year,
    fiscalLabel:year===null?'年度未註明':label,
    cashTwdPerShare:distribution(x,'CashEarningsDistribution','CashStatutorySurplus'),
    stockTwdPerShare:distribution(x,'StockEarningsDistribution','StockStatutorySurplus'),
    cashExDate:validDate(x.CashExDividendTradingDate),
    stockExDate:validDate(x.StockExDividendTradingDate),
    paymentDate:validDate(x.CashDividendPaymentDate),
    announcementDate:validDate(x.AnnouncementDate),
    source:'FinMind TaiwanStockDividend',
  };
  // Never mix dividends from different announcement/ex dates or another ticker.
  const key=[row.referenceDate,row.fiscalLabel,row.cashExDate,row.stockExDate,row.paymentDate,row.announcementDate].join('|');
  unique.set(key,row);
 }
 return [...unique.values()].sort((a,b)=>b.referenceDate.localeCompare(a.referenceDate)||b.fiscalLabel.localeCompare(a.fiscalLabel));
}
export function stockDividendByFiscalYear(rows:readonly StockDividendRecord[]):DividendYearSummary[]{
 const groups=new Map<number,StockDividendRecord[]>();
 for(const row of rows){
  if(row.fiscalYear===null)continue; // Do NOT misidentify payout year as entitlement year.
  groups.set(row.fiscalYear,[...(groups.get(row.fiscalYear)??[]),row]);
 }
 const total=(items:readonly StockDividendRecord[],key:'cashTwdPerShare'|'stockTwdPerShare')=>
   items.every(x=>x[key]!==null)?Math.round(items.reduce((sum,x)=>sum+x[key]!,0)*1e6)/1e6:null;
 return [...groups].map(([year,items])=>({year,items:items.length,cashTwdPerShare:total(items,'cashTwdPerShare'),
   stockTwdPerShare:total(items,'stockTwdPerShare')})).sort((a,b)=>b.year-a.year);
}
const cache=new Map<string,{until:number;rows:StockDividendRecord[]}>();
export async function fetchStockDividendHistory(symbol:string,years:3|5|10|20=10,now=new Date(),signal?:AbortSignal):Promise<StockDividendRecord[]>{
 if(!/^\d{4}$/.test(symbol)||![3,5,10,20].includes(years))throw new Error('歷史股利只接受已核實的四碼上市／上櫃個股');
 const currentYear=now.getFullYear();
 const start=currentYear-years+1+'-01-01';
 const key=symbol+'|'+start;
 const previous=cache.get(key);
 if(previous&&previous.until>Date.now())return previous.rows;
 const query=new URLSearchParams({dataset:'TaiwanStockDividend',data_id:symbol,start_date:start});
 const response=await fetch('https://api.finmindtrade.com/api/v4/data?'+query.toString(),{
   headers:{Accept:'application/json'},...(signal?{signal}:{})
 });
 if(!response.ok)throw new Error('歷史股利來源 HTTP '+response.status+(response.status===429?'（查詢額度已達上限）':''));
 const records=parseStockDividendHistory(await response.json(),symbol);
 const rows=records.filter(x=>x.referenceDate>=start);
 cache.set(key,{rows,until:Date.now()+10*60*1000});
 return rows;
}
