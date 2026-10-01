import type {CanonicalLedgerEntry,DividendLedgerEntry} from '../finance/canonicalLedger';

export type HoldingForDividend=Readonly<{
  symbol:string;
  name:string;
  shares:number;
  price:number;
}>;

export type DividendEventStatus='預告'|'待配發'|'尚未登錄'|'已登錄';

export type HoldingDividendEvent=Readonly<{
  id:string;
  symbol:string;
  name:string;
  exDate:string;
  lastPurchaseDate:string;
  recordDate:string;
  paymentDate:string;
  perShareAmount:number;
  eligibleShares:number;
  estimatedDividend:number;
  distributionYield:number;
  status:DividendEventStatus;
  alreadyRecorded:boolean;
}>;

type TwseExRow=Readonly<{
  Date?:string;Code?:string;Name?:string;CashDividend?:string;
}>;
type TwseHolidayRow=Readonly<{Name?:string;Date?:string;Weekday?:string;Description?:string}>;

const TWSE_EX_URL='https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL';
const TWSE_EX_HTML='https://www.twse.com.tw/exchangeReport/TWT48U?response=html';
const TWSE_DIVIDEND_HTML_URLS=['https://wwwc.twse.com.tw/zh/ETFortune/dividendList','https://www.twse.com.tw/zh/ETFortune/dividendList'] as const;
const TWSE_HOLIDAY_URL='https://openapi.twse.com.tw/v1/holidaySchedule/holidaySchedule';

const clean=(value:string)=>value.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const isoToday=()=>{const d=new Date();return String(d.getFullYear()).padStart(4,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const rocCompactToIso=(value:string)=>{
  const digits=value.replace(/\D/g,'');
  if(digits.length<7)return '';
  const y=Number(digits.slice(0,digits.length-4))+1911;
  const m=digits.slice(-4,-2),d=digits.slice(-2);
  return `${String(y).padStart(4,'0')}-${m}-${d}`;
};
const rocTextToIso=(value:string)=>{
  const match=value.match(/(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if(!match)return '';
  return `${Number(match[1])+1911}-${String(Number(match[2])).padStart(2,'0')}-${String(Number(match[3])).padStart(2,'0')}`;
};
const numericText=(value:string)=>{if(!value||/待公告|尚未公告|N\/A|--/.test(value))return '';return value.replace(/,/g,'').match(/-?\d+(?:\.\d+)?/)?.[0]??'';};

type DividendHtmlRow=Readonly<{symbol:string;name:string;exDate:string;recordDate:string;paymentDate:string;perShareAmount:number}>;

function parseDividendHtml(html:string):DividendHtmlRow[]{
  const rows=html.match(/<tr[\s\S]*?<\/tr>/gi)??[];
  return rows.flatMap(row=>{
    const cells=(row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi)??[]).map(clean);
    if(cells.length<6)return [];
    const symbol=cells[0]?.match(/[0-9A-Z]{4,8}/)?.[0]??'';
    const exDate=rocTextToIso(cells[2]??'');
    if(!symbol||!exDate)return [];
    return [{
      symbol,
      name:(cells[1]??symbol).trim(),
      exDate,
      recordDate:rocTextToIso(cells[3]??''),
      paymentDate:rocTextToIso(cells[4]??''),
      perShareAmount:Number(numericText(cells[5]??''))||0,
    }];
  });
}

async function fetchDividendRows():Promise<DividendHtmlRow[]>{
  let lastError:unknown=null;
  for(const url of TWSE_DIVIDEND_HTML_URLS){
    try{
      const response=await fetch(url,{headers:{Accept:'text/html'}});
      if(!response.ok)throw new Error('TWSE ETF dividend HTTP '+response.status);
      const rows=parseDividendHtml(await response.text());
      if(rows.length)return rows;
      lastError=new Error('TWSE ETF dividend list returned no parseable rows');
    }catch(error){lastError=error;}
  }
  if(lastError)throw lastError;
  return [];
}

function parseExDividendHtml(html:string):TwseExRow[]{
  const rows=html.match(/<tr[\s\S]*?<\/tr>/gi)??[];
  return rows.flatMap(row=>{
    const cells=(row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi)??[]).map(clean);
    if(cells.length<8)return [];
    const code=cells[1]?.match(/[0-9A-Z]{4,8}/)?.[0]??'';
    const date=cells[0]??'';
    if(!code||!rocCompactToIso(date))return [];
    return [{Date:date,Code:code,Name:cells[2]??code,CashDividend:numericText(cells[7]??'')}];
  });
}

async function fetchExRows():Promise<TwseExRow[]>{
  const [apiResult,htmlResult]=await Promise.allSettled([
    fetch(TWSE_EX_URL,{headers:{Accept:'application/json'}}).then(async response=>{
      if(!response.ok)throw new Error('TWSE ex-dividend HTTP '+response.status);
      const rows=await response.json();
      return Array.isArray(rows)?rows as TwseExRow[]:[];
    }),
    fetch(TWSE_EX_HTML,{headers:{Accept:'text/html'}}).then(async response=>{
      if(!response.ok)throw new Error('TWSE ex-dividend HTML HTTP '+response.status);
      return parseExDividendHtml(await response.text());
    }),
  ]);
  const apiRows=apiResult.status==='fulfilled'?apiResult.value:[];
  const htmlRows=htmlResult.status==='fulfilled'?htmlResult.value:[];
  if(!apiRows.length&&!htmlRows.length)throw new Error('TWSE 除權息資料目前無法取得');
  const merged=new Map<string,TwseExRow>();
  for(const row of [...apiRows,...htmlRows]){
    const code=String(row.Code??'').trim();
    const date=rocCompactToIso(String(row.Date??''));
    if(!code||!date)continue;
    const key=code+'|'+date;
    const old=merged.get(key);
    const cash=numericText(String(row.CashDividend??''));
    merged.set(key,{Date:String(row.Date??old?.Date??''),Code:code,Name:String(row.Name??old?.Name??code),CashDividend:cash||String(old?.CashDividend??'')});
  }
  return [...merged.values()];
}

async function fetchTwseClosedDates():Promise<Set<string>>{
  const response=await fetch(TWSE_HOLIDAY_URL,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('TWSE holiday schedule HTTP '+response.status);
  const json=await response.json();
  const rows=Array.isArray(json)?json as TwseHolidayRow[]:[];
  const closed=new Set<string>();
  for(const row of rows){
    const name=String(row.Name??'');
    const description=String(row.Description??'');
    if(/開始交易|最後交易/.test(name+' '+description))continue;
    const date=rocCompactToIso(String(row.Date??''));
    if(date)closed.add(date);
  }
  return closed;
}
function previousTradingDay(date:string,closedDates:ReadonlySet<string>){
  const d=new Date(date+'T12:00:00+08:00');
  for(let guard=0;guard<14;guard+=1){
    d.setDate(d.getDate()-1);
    const candidate=String(d.getFullYear()).padStart(4,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(d.getDay()!==0&&d.getDay()!==6&&!closedDates.has(candidate))return candidate;
  }
  return '';
}
function sharesOnDate(entries:readonly CanonicalLedgerEntry[],symbol:string,date:string){
  let shares=0;
  const trades=entries
    .filter((entry):entry is Extract<CanonicalLedgerEntry,{kind:'buy'|'sell'}>=>('symbol' in entry)&&entry.symbol===symbol&&(entry.kind==='buy'||entry.kind==='sell')&&entry.date<=date)
    .sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  for(const trade of trades)shares+=trade.kind==='buy'?trade.shares:-trade.shares;
  return Math.max(0,shares);
}
function recorded(entries:readonly CanonicalLedgerEntry[],event:{symbol:string;exDate:string;paymentDate:string;perShareAmount:number}){
  return entries.some(entry=>{
    if(entry.kind!=='dividend'||entry.symbol!==event.symbol)return false;
    if(event.paymentDate)return entry.date===event.paymentDate&&Math.abs(entry.perShareAmount-event.perShareAmount)<0.000001;
    return Math.abs(entry.perShareAmount-event.perShareAmount)<0.000001&&Boolean(entry.note?.includes('除息日 '+event.exDate));
  });
}

export async function refreshHoldingDividendEvents(
  holdings:readonly HoldingForDividend[],
  entries:readonly CanonicalLedgerEntry[],
):Promise<HoldingDividendEvent[]>{
  if(!holdings.length)return [];
  const [htmlResult,exResult]=await Promise.allSettled([fetchDividendRows(),fetchExRows()]);
  const htmlRows=htmlResult.status==='fulfilled'?htmlResult.value:[];
  const exRows=exResult.status==='fulfilled'?exResult.value:[];
  if(!htmlRows.length&&!exRows.length)throw new Error('目前無法取得證交所 ETF 配息資料');

  const today=isoToday();
  const output:HoldingDividendEvent[]=[];
  for(const holding of holdings){
    const html=htmlRows.filter(row=>row.symbol===holding.symbol);
    const ex=exRows.filter(row=>String(row.Code??'')===holding.symbol).map(row=>({
      symbol:holding.symbol,
      name:String(row.Name??holding.name),
      exDate:rocCompactToIso(String(row.Date??'')),
      recordDate:'',
      paymentDate:'',
      perShareAmount:Number(row.CashDividend)||0,
    })).filter(row=>row.exDate);

    const byEx=new Map<string,DividendHtmlRow>();
    for(const row of [...ex,...html]){
      const old=byEx.get(row.exDate);
      byEx.set(row.exDate,{
        symbol:row.symbol,name:row.name||old?.name||holding.name,exDate:row.exDate,
        recordDate:row.recordDate||old?.recordDate||'',paymentDate:row.paymentDate||old?.paymentDate||'',
        perShareAmount:row.perShareAmount||old?.perShareAmount||0,
      });
    }

    const candidates=[...byEx.values()]
      .filter(row=>row.exDate>=new Date(Date.now()-120*86400000).toISOString().slice(0,10))
      .sort((a,b)=>a.exDate.localeCompare(b.exDate))
      .slice(-4);

    for(const row of candidates){
      const lastPurchaseDate=await fetchLastTradingDay(holding.symbol,row.exDate);
      const eligibleShares=sharesOnDate(entries,holding.symbol,lastPurchaseDate);
      const estimatedDividend=eligibleShares*row.perShareAmount;
      const distributionYield=holding.price>0?row.perShareAmount/holding.price*100:0;
      const alreadyRecorded=recorded(entries,row);
      let status:DividendEventStatus='預告';
      if(alreadyRecorded)status='已登錄';
      else if(row.paymentDate&&row.paymentDate<=today)status='尚未登錄';
      else if(row.exDate<=today)status='待配發';
      output.push({
        id:`${holding.symbol}-${row.exDate}`,symbol:holding.symbol,name:holding.name,
        exDate:row.exDate,lastPurchaseDate,recordDate:row.recordDate,paymentDate:row.paymentDate,
        perShareAmount:row.perShareAmount,eligibleShares,estimatedDividend,distributionYield,status,alreadyRecorded,
      });
    }
  }
  return output.sort((a,b)=>a.exDate.localeCompare(b.exDate)||a.symbol.localeCompare(b.symbol));
}

export function dividendEventToLedger(event:HoldingDividendEvent):DividendLedgerEntry{
  return {
    id:`dividend-${event.symbol}-${event.paymentDate||event.exDate}-${Date.now()}`,
    date:event.paymentDate||event.exDate,
    kind:'dividend',
    symbol:event.symbol,
    name:event.name,
    perShareAmount:event.perShareAmount,
    sharesHeld:event.eligibleShares,
    note:[`TWSE 配息事件`,`除息日 ${event.exDate}`,event.recordDate?`股權登記日 ${event.recordDate}`:'',event.paymentDate?`配發日 ${event.paymentDate}`:'',`最後購買日 ${event.lastPurchaseDate}`].filter(Boolean).join('；'),
  };
}

export function formatDividendEvent(event:HoldingDividendEvent){
  const money=(value:number)=>value.toLocaleString('zh-TW',{maximumFractionDigits:2});
  return [
    `${event.symbol} ${event.name}`,
    `除息日：${event.exDate||'尚未公告'}`,
    `最後購買日：${event.lastPurchaseDate||'尚未確認'}`,
    `每股配息：NT$ ${money(event.perShareAmount)}`,
    `符合持股：${event.eligibleShares.toLocaleString('zh-TW')} 股`,
    `預估股息：NT$ ${money(event.estimatedDividend)}`,
    `配息率：${event.distributionYield.toFixed(2)}%`,
    `股息配發日：${event.paymentDate||'尚未公告'}`,
    `狀態：${event.status}${event.status==='已登錄'||event.status==='預告'?'':'（尚未登錄）  [＋新增]'}`,
  ].join('\n');
}
