import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,type PropsWithChildren,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {extractArticleBody,extractArticleHighlights} from './articleSummary';
import {selectNewsForEnrichment} from './newsCoverage';

export type AiNewsItem=Readonly<{id:string;symbol:string;name:string;title:string;source:string;publishedAt:string;url:string;summary:string;summaryStatus?:'article'|'unavailable'}>;
export type TrackedHolding=Readonly<{symbol:string;name:string}>;

type Value=Readonly<{
  hydrated:boolean;refreshing:boolean;lastUpdatedAt:number|null;lastError:string|null;items:readonly AiNewsItem[];
  setTrackedHoldings:(items:readonly TrackedHolding[])=>void;refresh:()=>Promise<void>;
}>;

const KEY='@tf-asset/ai-news-runtime-v1';
const Context=createContext<Value|null>(null);
const decode=(s:string)=>s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/<[^>]+>/g,'').trim();
const tag=(block:string,name:string)=>decode(new RegExp('<'+name+'[^>]*>([\\s\\S]*?)<\\/'+name+'>','i').exec(block)?.[1]??'');
const link=(block:string)=>tag(block,'link');
const sourceFromTitle=(title:string)=>{const parts=title.split(' - ');return parts.length>1?parts.at(-1)!.trim():'網路新聞';};
async function articleHighlights(item:AiNewsItem):Promise<AiNewsItem>{
  if(!/^https:\/\//i.test(item.url))return {...item,summary:'',summaryStatus:'unavailable'};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6500);
  try{
    const response=await fetch(item.url,{signal:controller.signal,headers:{Accept:'text/html'}});
    if(!response.ok)return {...item,summary:'',summaryStatus:'unavailable'};
    const html=(await response.text()).slice(0,750000);
    const body=extractArticleBody(html);
    const highlights=body?extractArticleHighlights(body,item.title):[];
    return highlights.length>=2?{...item,summary:highlights.map((point,i)=>`${i+1}. ${point}`).join('\n'),summaryStatus:'article'}:{...item,summary:'',summaryStatus:'unavailable'};
  }catch{return {...item,summary:'',summaryStatus:'unavailable'};}
  finally{clearTimeout(timer);}
}
function parseRss(xml:string,h:TrackedHolding):AiNewsItem[]{
  const blocks=xml.match(/<item[\s\S]*?<\/item>/gi)??[];
  return blocks.slice(0,5).map((block,index)=>{
    const title=tag(block,'title');
    const publishedAt=tag(block,'pubDate');
    const url=link(block);
    return {id:`${h.symbol}-${publishedAt||index}-${title}`,symbol:h.symbol,name:h.name,title,source:sourceFromTitle(title),publishedAt,url,summary:'',summaryStatus:'unavailable' as const};
  }).filter(x=>x.title);
}
async function fetchHoldingNews(h:TrackedHolding){
  const q=encodeURIComponent(`${h.symbol} ${h.name} ETF`);
  const url=`https://news.google.com/rss/search?q=${q}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
  const response=await fetch(url,{headers:{Accept:'application/rss+xml,text/xml'}});
  if(!response.ok)throw new Error('News HTTP '+response.status);
  return parseRss(await response.text(),h);
}
export function AiNewsRuntimeProvider({children}:PropsWithChildren){
  const [hydrated,setHydrated]=useState(false),[refreshing,setRefreshing]=useState(false);
  const [lastUpdatedAt,setLastUpdatedAt]=useState<number|null>(null),[lastError,setLastError]=useState<string|null>(null);
  const [items,setItems]=useState<AiNewsItem[]>([]);
  const trackedRef=useRef<TrackedHolding[]>([]);
  useEffect(()=>{let alive=true;AsyncStorage.getItem(KEY).then(raw=>{if(!alive||!raw)return;const p=JSON.parse(raw) as {items?:AiNewsItem[];lastUpdatedAt?:number};if(Array.isArray(p.items))setItems(p.items.map(item=>item.summaryStatus==='article'?item:{...item,summary:'',summaryStatus:'unavailable'}));if(Number.isFinite(Number(p.lastUpdatedAt)))setLastUpdatedAt(Number(p.lastUpdatedAt));}).catch(()=>{}).finally(()=>{if(alive)setHydrated(true);});return()=>{alive=false;};},[]);
  useEffect(()=>{if(hydrated)AsyncStorage.setItem(KEY,JSON.stringify({items,lastUpdatedAt})).catch(()=>{});},[hydrated,items,lastUpdatedAt]);
  const setTrackedHoldings=useCallback((next:readonly TrackedHolding[])=>{trackedRef.current=Array.from(new Map(next.filter(x=>x.symbol).map(x=>[x.symbol,{symbol:x.symbol,name:x.name||x.symbol}])).values()).slice(0,12);},[]);
  const refresh=useCallback(async()=>{if(refreshing)return;setRefreshing(true);setLastError(null);try{
    const tracked=trackedRef.current;
    if(!tracked.length){setItems([]);setLastUpdatedAt(Date.now());return;}
    const settled=await Promise.allSettled(tracked.map(fetchHoldingNews));
    const raw=settled.flatMap(x=>x.status==='fulfilled'?x.value:[]).sort((a,b)=>Date.parse(b.publishedAt||'')-Date.parse(a.publishedAt||''));
    const merged=Array.from(new Map(raw.map(item=>[(item.url||item.symbol+'|'+item.title).toLowerCase(),item])).values()).sort((a,b)=>Date.parse(b.publishedAt||'')-Date.parse(a.publishedAt||'')).slice(0,40);
    if(!merged.length)throw new Error('目前沒有可用的持股新聞');
    // Enrich the latest items using actual readable article paragraphs; do not treat RSS titles as AI summaries.
    // Distribute the article-fetch budget across all tracked holdings.\n    const coverage=selectNewsForEnrichment(merged,8);\n    const enriched=await Promise.all(coverage.map(articleHighlights));
    const enrichedById=new Map(enriched.map(item=>[item.id,item]));
    setItems(merged.map(item=>enrichedById.get(item.id)??item));setLastUpdatedAt(Date.now());
    const failures=settled.filter(x=>x.status==='rejected').length;
    if(failures)setLastError(`部分來源暫時無法更新（${failures}/${settled.length}）`);
  }catch(error){setLastError(error instanceof Error?error.message:String(error));}finally{setRefreshing(false);}},[refreshing]);
  const value=useMemo<Value>(()=>({hydrated,refreshing,lastUpdatedAt,lastError,items,setTrackedHoldings,refresh}),[hydrated,refreshing,lastUpdatedAt,lastError,items,setTrackedHoldings,refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAiNewsRuntime(){const value=useContext(Context);if(!value)throw new Error('useAiNewsRuntime must be used inside AiNewsRuntimeProvider');return value;}
