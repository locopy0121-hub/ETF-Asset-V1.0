import {extractArticleBody,extractArticleHighlights} from './articleSummary';
import {isPublisherArticleUrl,resolvePublisherUrl} from './newsArticleResolver';
import {fetchOfficialDailyHistory,type DailyCandle} from '../market/twseDailyHistory';
import {fetchOfficialMarketProbe} from '../market/officialMarketProbe';

export type ExternalNewsRow=Readonly<{
  title:string;
  source:string;
  publishedAt:string;
  url:string;
  publisherUrl?:string;
  articleBodyVerified?:boolean;
  highlights?:readonly string[];
}>;

export type ExternalSecurityProfile=Readonly<{
  symbol:string;
  name:string;
  listingDate?:string;
  status:'LISTED'|'PRELISTING'|'UNKNOWN';
  source:string;
  sourceUrl:string;
  publishedAt?:string;
  articleBodyVerified:boolean;
  evidenceText:string;
}>;

export type ExternalMarketQuote=Readonly<{
  symbol:string;
  name:string;
  price:number|null;
  previousClose:number|null;
  source:'TWSE_MIS';
  sourceQuoteAt:number|null;
  checkedAt:number;
  quality:'trade'|'diagnostic';
  statusMessage:string;
}>;

export type AiIngredientAcquirer=Readonly<{
  fetchQuote?:(symbol:string)=>Promise<ExternalMarketQuote|null>;
  fetchHistory:(symbol:string,months?:number)=>Promise<readonly DailyCandle[]>;
  fetchNews:(symbol:string,name:string)=>Promise<readonly ExternalNewsRow[]>;
  fetchSecurityProfile?:(symbol:string,name:string)=>Promise<ExternalSecurityProfile|null>;
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

const normalizeText=(value:string)=>value.toUpperCase().replace(/\s+/g,'');
const relevantToSecurity=(title:string,symbol:string,name:string)=>{
  const normalizedTitle=normalizeText(title);
  if(normalizedTitle.includes(normalizeText(symbol)))return true;
  const normalizedName=normalizeText(name);
  return normalizedName!==normalizeText(symbol)&&normalizedName.length>=2&&normalizedTitle.includes(normalizedName);
};

async function fetchGoogleNewsRows(query:string,symbol:string,name:string,signal?:AbortSignal):Promise<ExternalNewsRow[]>{
  const url=`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
  const response=await fetch(url,{headers:{Accept:'application/rss+xml,text/xml'},...(signal?{signal}:{})});
  if(!response.ok)throw new Error('Google News RSS HTTP '+response.status);
  const xml=await response.text();
  const blocks=xml.match(/<item[\s\S]*?<\/item>/gi)??[];
  const rows=blocks.slice(0,20).map((block):ExternalNewsRow|null=>{
    const title=tag(block,'title');
    const publishedAt=tag(block,'pubDate');
    const itemUrl=tag(block,'link');
    if(!title||!itemUrl||!relevantToSecurity(title,symbol,name))return null;
    return {title,source:sourceFromTitle(title),publishedAt,url:itemUrl};
  }).filter((row):row is ExternalNewsRow=>row!==null);
  return Array.from(new Map(rows.map(row=>[(row.url||row.title).toLowerCase(),row])).values());
}

async function enrichPublisherArticle(row:ExternalNewsRow,signal?:AbortSignal):Promise<ExternalNewsRow>{
  if(!/^https:\/\//i.test(row.url))return row;
  try{
    const initial=await fetch(row.url,{headers:{Accept:'text/html'},...(signal?{signal}:{})});
    if(!initial.ok)return row;
    const firstHtml=(await initial.text()).slice(0,750000);
    const resolved=resolvePublisherUrl(firstHtml,initial.url||row.url);
    if(!resolved)return row;
    const html=isPublisherArticleUrl(initial.url||row.url)
      ?firstHtml
      :await (async()=>{
        const direct=await fetch(resolved,{headers:{Accept:'text/html'},...(signal?{signal}:{})});
        if(!direct.ok||!isPublisherArticleUrl(direct.url||resolved))return '';
        return (await direct.text()).slice(0,750000);
      })();
    const body=html?extractArticleBody(html):null;
    const highlights=body?extractArticleHighlights(body,row.title):[];
    return highlights.length>=2
      ?{...row,url:resolved,publisherUrl:resolved,articleBodyVerified:true,highlights}
      :{...row,url:resolved,publisherUrl:resolved,articleBodyVerified:false};
  }catch{
    return row;
  }
}

async function enrichNewsRows(rows:readonly ExternalNewsRow[],signal?:AbortSignal):Promise<ExternalNewsRow[]>{
  const head=rows.slice(0,5);
  const enriched=await Promise.all(head.map(row=>enrichPublisherArticle(row,signal)));
  const byUrl=new Map(enriched.map(row=>[row.title,row]));
  return rows.map(row=>byUrl.get(row.title)??row);
}

export async function fetchExternalMarketNews(
  symbol:string,
  name:string,
  signal?:AbortSignal,
):Promise<readonly ExternalNewsRow[]>{
  const normalized=String(symbol??'').trim().toUpperCase();
  if(!/^[0-9A-Z]{4,8}$/.test(normalized))throw new Error('無效的新聞查詢代號');
  const label=String(name??'').trim()||normalized;
  const query=[normalized,label!==normalized?label:'',normalized.startsWith('00')?'ETF':''].filter(Boolean).join(' ');
  const rows=await fetchGoogleNewsRows(query,normalized,label,signal);
  return enrichNewsRows(rows.slice(0,12),signal);
}

const pad=(value:number)=>String(value).padStart(2,'0');
const isoDate=(year:number,month:number,day:number)=>{
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return `${year}-${pad(month)}-${pad(day)}`;
};

function extractListingDate(text:string,publishedAt:string):string|null{
  const normalized=text.replace(/\s+/g,' ');
  const snippets=(normalized.match(/[^。！？!?\n]{0,80}(?:上市|掛牌)[^。！？!?\n]{0,80}/g)??[]);
  const search=[...snippets,normalized];
  for(const segment of search){
    const full=/(20\d{2})[年\/-](\d{1,2})[月\/-](\d{1,2})日?/.exec(segment);
    if(full){
      const result=isoDate(Number(full[1]),Number(full[2]),Number(full[3]));
      if(result)return result;
    }
    const md=/(\d{1,2})月(\d{1,2})日/.exec(segment);
    if(md){
      const published=Number.isFinite(Date.parse(publishedAt))?new Date(publishedAt):new Date();
      let year=published.getUTCFullYear();
      const month=Number(md[1]),day=Number(md[2]);
      if(month<published.getUTCMonth()+1-6)year+=1;
      const result=isoDate(year,month,day);
      if(result)return result;
    }
  }
  return null;
}

const titleName=(title:string,symbol:string)=>{
  const withoutSource=title.split(' - ').slice(0,-1).join(' - ')||title;
  const cleaned=withoutSource
    .replace(new RegExp(symbol,'ig'),' ')
    .replace(/(?:ETF|上市|掛牌|開募|募集|發行價|申購|主動式)/gi,' ')
    .replace(/[！!｜|：:，,。]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  return cleaned.slice(0,40);
};

export async function fetchExternalSecurityProfile(
  symbol:string,
  name:string,
  signal?:AbortSignal,
):Promise<ExternalSecurityProfile|null>{
  const normalized=String(symbol??'').trim().toUpperCase();
  if(!/^[0-9A-Z]{4,8}$/.test(normalized))throw new Error('無效的證券代號');
  const label=String(name??'').trim()||normalized;
  const query=[normalized,label!==normalized?label:'','ETF 上市 掛牌 募集'].filter(Boolean).join(' ');
  const rows=await fetchGoogleNewsRows(query,normalized,label,signal);
  const enriched=await enrichNewsRows(rows.slice(0,8),signal);
  for(const row of enriched){
    const body=[row.title,...(row.highlights??[])].join(' ');
    const listingDate=extractListingDate(body,row.publishedAt);
    if(!listingDate)continue;
    const today=new Date().toISOString().slice(0,10);
    const inferredName=label!==normalized?label:titleName(row.title,normalized)||normalized;
    return {
      symbol:normalized,
      name:inferredName,
      listingDate,
      status:listingDate<=today?'LISTED':'PRELISTING',
      source:row.source,
      sourceUrl:row.publisherUrl??row.url,
      publishedAt:row.publishedAt,
      articleBodyVerified:row.articleBodyVerified===true,
      evidenceText:body.slice(0,1200),
    };
  }
  return null;
}

async function withTimeout<T>(task:(signal:AbortSignal)=>Promise<T>,timeoutMs:number):Promise<T>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await task(controller.signal);}
  finally{clearTimeout(timer);}
}

const defaultFetchQuote=(symbol:string)=>
  withTimeout(async()=>{
    const probe=await fetchOfficialMarketProbe(symbol);
    const previousClose=Number(String(probe.raw.y??'').replace(/,/g,''));
    return {
      symbol:probe.symbol,
      name:probe.name,
      price:probe.price,
      previousClose:Number.isFinite(previousClose)&&previousClose>0?previousClose:null,
      source:'TWSE_MIS' as const,
      sourceQuoteAt:probe.sourceQuoteAt,
      checkedAt:probe.checkedAt,
      quality:probe.quality,
      statusMessage:probe.price===null
        ?'TWSE MIS 已回傳標的，但目前沒有 z 實際成交價；不可把昨收或買賣價冒充現價。'
        :'TWSE MIS z 實際成交價。',
    };
  },7000);

const defaultFetchHistory=(symbol:string,months=12)=>
  withTimeout(signal=>fetchOfficialDailyHistory(symbol,Math.max(1,Math.min(12,Math.floor(months))),new Date(),signal),9000);

const defaultFetchNews=(symbol:string,name:string)=>
  withTimeout(signal=>fetchExternalMarketNews(symbol,name,signal),12000);

const defaultFetchSecurityProfile=(symbol:string,name:string)=>
  withTimeout(signal=>fetchExternalSecurityProfile(symbol,name,signal),12000);

export const DEFAULT_AI_INGREDIENT_ACQUIRER:AiIngredientAcquirer={
  fetchQuote:defaultFetchQuote,
  fetchHistory:defaultFetchHistory,
  fetchNews:defaultFetchNews,
  fetchSecurityProfile:defaultFetchSecurityProfile,
};
