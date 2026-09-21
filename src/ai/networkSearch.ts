export type NetworkSearchResult=Readonly<{
  title:string;
  url:string;
  snippet:string;
  source:string;
  publishedAt?:string;
}>;

type DuckRelated=Readonly<{Text?:string;FirstURL?:string;Topics?:readonly DuckRelated[]}>;
type DuckResponse=Readonly<{
  Heading?:string;
  AbstractText?:string;
  AbstractURL?:string;
  AbstractSource?:string;
  RelatedTopics?:readonly DuckRelated[];
}>;
type WikiOpenSearch=readonly [string,readonly string[],readonly string[],readonly string[]];

const clean=(value:unknown)=>String(value??'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const unique=(rows:readonly NetworkSearchResult[])=>Array.from(new Map(rows.filter(row=>row.title&&row.url).map(row=>[row.url.toLowerCase(),row])).values());

export function parseDuckDuckGo(payload:DuckResponse):NetworkSearchResult[]{
  const rows:NetworkSearchResult[]=[];
  if(payload.AbstractURL&&payload.AbstractText){
    rows.push({
      title:clean(payload.Heading)||'網路摘要',
      url:payload.AbstractURL,
      snippet:clean(payload.AbstractText),
      source:clean(payload.AbstractSource)||'DuckDuckGo',
    });
  }
  const visit=(items:readonly DuckRelated[]|undefined)=>{
    (items??[]).forEach(item=>{
      if(item.Topics?.length){visit(item.Topics);return;}
      const title=clean(item.Text);
      const url=clean(item.FirstURL);
      if(title&&url)rows.push({title:title.slice(0,120),url,snippet:title,source:'DuckDuckGo'});
    });
  };
  visit(payload.RelatedTopics);
  return unique(rows).slice(0,6);
}

export function parseWikipedia(payload:WikiOpenSearch):NetworkSearchResult[]{
  const titles=payload?.[1]??[],descriptions=payload?.[2]??[],urls=payload?.[3]??[];
  return unique(titles.map((title,index)=>({
    title:clean(title),
    url:clean(urls[index]),
    snippet:clean(descriptions[index])||'維基百科條目',
    source:'Wikipedia',
  }))).slice(0,5);
}

async function searchDuckDuckGo(query:string){
  const q=encodeURIComponent(query.trim());
  const response=await fetch(`https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&no_redirect=1&skip_disambig=1`,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('DuckDuckGo HTTP '+response.status);
  return parseDuckDuckGo(await response.json() as DuckResponse);
}

async function searchWikipedia(query:string){
  const q=encodeURIComponent(query.trim());
  const response=await fetch(`https://zh.wikipedia.org/w/api.php?action=opensearch&search=${q}&limit=5&namespace=0&format=json&origin=*`,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Wikipedia HTTP '+response.status);
  return parseWikipedia(await response.json() as WikiOpenSearch);
}

export async function searchNetwork(query:string):Promise<readonly NetworkSearchResult[]>{
  const text=query.trim();
  if(!text)return [];
  const settled=await Promise.allSettled([searchDuckDuckGo(text),searchWikipedia(text)]);
  const rows=settled.flatMap(result=>result.status==='fulfilled'?result.value:[]);
  return unique(rows).slice(0,8);
}

export function formatNetworkResults(rows:readonly NetworkSearchResult[],options?:Readonly<{showSources?:boolean;showDates?:boolean;detail?:'concise'|'balanced'|'detailed'}>){
  const detail=options?.detail??'balanced';
  const max=detail==='concise'?3:detail==='detailed'?8:5;
  return rows.slice(0,max).map((row,index)=>{
    const meta=[options?.showSources!==false?row.source:'',options?.showDates!==false?row.publishedAt??'':''].filter(Boolean).join(' · ');
    const snippet=detail==='concise'?row.snippet.slice(0,110):detail==='detailed'?row.snippet.slice(0,320):row.snippet.slice(0,200);
    return `${index+1}. ${row.title}\n${snippet}${meta?'\n'+meta:''}\n${row.url}`;
  }).join('\n\n');
}
