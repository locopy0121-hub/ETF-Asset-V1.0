import {fetchOfficialDailyHistory,type DailyCandle} from '../market/twseDailyHistory';

export type ExternalNewsRow=Readonly<{
  title:string;
  source:string;
  publishedAt:string;
  url:string;
}>;

export type AiIngredientAcquirer=Readonly<{
  fetchHistory:(symbol:string,months?:number)=>Promise<readonly DailyCandle[]>;
  fetchNews:(symbol:string,name:string)=>Promise<readonly ExternalNewsRow[]>;
}>;

const decodeXml=(value:string)=>value
  .replace(/<!\[CDATA\[|\]\]>/g,'')
  .replace(/&amp;/g,'&')
  .replace(/&quot;/g,'"')
  .replace(/&#39;/g,"'")
  .replace(/&lt;/g,'<')
  .replace(/&gt;/g,'>')
  .replace(/<[^>]+>/g,'')
  .trim();

const tag=(block:string,name:string)=>{
  const match=new RegExp('<'+name+'[^>]*>([\\s\\S]*?)<\\/'+name+'>','i').exec(block);
  return decodeXml(match?.[1]??'');
};

const sourceFromTitle=(title:string)=>{
  const parts=title.split(' - ');
  return parts.length>1?(parts.at(-1)?.trim()||'Google News'):'Google News';
};

export async function fetchExternalMarketNews(
  symbol:string,
  name:string,
  signal?:AbortSignal,
):Promise<readonly ExternalNewsRow[]>{
  const normalized=String(symbol??'').trim().toUpperCase();
  if(!/^[0-9A-Z]{4,8}$/.test(normalized))throw new Error('無效的新聞查詢代號');
  const label=String(name??'').trim();
  const query=encodeURIComponent([normalized,label,label&&normalized.startsWith('00')?'ETF':''].filter(Boolean).join(' '));
  const url=`https://news.google.com/rss/search?q=${query}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
  const response=await fetch(url,{headers:{Accept:'application/rss+xml,text/xml'},...(signal?{signal}:{})});
  if(!response.ok)throw new Error('Google News RSS HTTP '+response.status);
  const xml=await response.text();
  const blocks=xml.match(/<item[\s\S]*?<\/item>/gi)??[];
  const rows=blocks.slice(0,12).map((block):ExternalNewsRow|null=>{
    const title=tag(block,'title');
    const publishedAt=tag(block,'pubDate');
    const itemUrl=tag(block,'link');
    if(!title||!itemUrl)return null;
    return {title,source:sourceFromTitle(title),publishedAt,url:itemUrl};
  }).filter((row):row is ExternalNewsRow=>row!==null);
  return Array.from(new Map(rows.map(row=>[(row.url||row.title).toLowerCase(),row])).values());
}

async function withTimeout<T>(task:(signal:AbortSignal)=>Promise<T>,timeoutMs:number):Promise<T>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await task(controller.signal);}
  finally{clearTimeout(timer);}
}

const defaultFetchHistory=(symbol:string,months=12)=>
  withTimeout(signal=>fetchOfficialDailyHistory(symbol,Math.max(1,Math.min(12,Math.floor(months))),new Date(),signal),9000);

const defaultFetchNews=(symbol:string,name:string)=>
  withTimeout(signal=>fetchExternalMarketNews(symbol,name,signal),9000);

export const DEFAULT_AI_INGREDIENT_ACQUIRER:AiIngredientAcquirer={
  fetchHistory:defaultFetchHistory,
  fetchNews:defaultFetchNews,
};
