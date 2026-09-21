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
type FetchLike=typeof fetch;

const decodeHtml=(value:string)=>value
  .replace(/&amp;/gi,'&')
  .replace(/&quot;/gi,'"')
  .replace(/&#39;|&#x27;/gi,"'")
  .replace(/&lt;/gi,'<')
  .replace(/&gt;/gi,'>')
  .replace(/&#x2F;/gi,'/')
  .replace(/&#(\d+);/g,(_,code)=>String.fromCharCode(Number(code)));

const clean=(value:unknown)=>decodeHtml(String(value??''))
  .replace(/<[^>]+>/g,' ')
  .replace(/\s+/g,' ')
  .trim();

const unique=(rows:readonly NetworkSearchResult[])=>Array.from(
  new Map(rows.filter(row=>row.title&&/^https?:\/\//i.test(row.url)).map(row=>[row.url.toLowerCase(),row])).values(),
);

function unwrapDuckUrl(raw:string){
  const decoded=decodeHtml(raw.trim());
  const absolute=decoded.startsWith('//')?'https:'+decoded:decoded;
  try{
    const parsed=new URL(absolute);
    if(parsed.hostname.endsWith('duckduckgo.com')&&parsed.pathname.startsWith('/l/')){
      const target=parsed.searchParams.get('uddg');
      if(target&&/^https?:\/\//i.test(target))return target;
    }
    return /^https?:\/\//i.test(parsed.toString())?parsed.toString():'';
  }catch{
    return /^https?:\/\//i.test(absolute)?absolute:'';
  }
}

function sourceFromUrl(url:string){
  try{return new URL(url).hostname.replace(/^www\./i,'')||'Web';}
  catch{return 'Web';}
}

export function parseDuckHtml(html:string):NetworkSearchResult[]{
  const matches=Array.from(html.matchAll(/<a\b[^>]*class=["'][^"']*\bresult__a\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));
  const rows:NetworkSearchResult[]=[];
  matches.forEach((match,index)=>{
    const url=unwrapDuckUrl(match[1]??'');
    const title=clean(match[2]);
    if(!url||!title)return;
    const from=(match.index??0)+match[0].length;
    const to=index+1<matches.length?(matches[index+1]?.index??html.length):html.length;
    const segment=html.slice(from,to);
    const snippetMatch=segment.match(/<(?:a|div|span)\b[^>]*class=["'][^"']*\bresult__snippet\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div|span)>/i);
    const snippet=clean(snippetMatch?.[1]??'')||title;
    rows.push({title:title.slice(0,160),url,snippet:snippet.slice(0,500),source:sourceFromUrl(url)});
  });
  return unique(rows).slice(0,8);
}

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

async function searchDuckHtml(query:string,fetcher:FetchLike){
  const q=encodeURIComponent(query.trim());
  const response=await fetcher(`https://html.duckduckgo.com/html/?q=${q}`,{
    headers:{Accept:'text/html,application/xhtml+xml'},
  });
  if(!response.ok)throw new Error('DuckDuckGo HTML HTTP '+response.status);
  return parseDuckHtml(await response.text());
}

async function searchDuckInstant(query:string,fetcher:FetchLike){
  const q=encodeURIComponent(query.trim());
  const response=await fetcher(`https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&no_redirect=1&skip_disambig=1`,{
    headers:{Accept:'application/json'},
  });
  if(!response.ok)throw new Error('DuckDuckGo Instant HTTP '+response.status);
  return parseDuckDuckGo(await response.json() as DuckResponse);
}

async function searchWikipedia(query:string,fetcher:FetchLike){
  const q=encodeURIComponent(query.trim());
  const response=await fetcher(`https://zh.wikipedia.org/w/api.php?action=opensearch&search=${q}&limit=5&namespace=0&format=json&origin=*`,{
    headers:{Accept:'application/json'},
  });
  if(!response.ok)throw new Error('Wikipedia HTTP '+response.status);
  return parseWikipedia(await response.json() as WikiOpenSearch);
}

export async function searchNetwork(query:string,fetcher:FetchLike=fetch):Promise<readonly NetworkSearchResult[]>{
  const text=query.trim();
  if(!text)return [];
  const settled=await Promise.allSettled([
    searchDuckHtml(text,fetcher),
    searchDuckInstant(text,fetcher),
    searchWikipedia(text,fetcher),
  ]);
  const rows=settled.flatMap(result=>result.status==='fulfilled'?result.value:[]);
  return unique(rows).slice(0,8);
}

export function formatNetworkResults(rows:readonly NetworkSearchResult[],options?:Readonly<{showSources?:boolean|undefined;showDates?:boolean|undefined;detail?:'concise'|'balanced'|'detailed'|undefined}>){
  const detail=options?.detail??'balanced';
  const max=detail==='concise'?3:detail==='detailed'?8:5;
  return rows.slice(0,max).map((row,index)=>{
    const meta=[options?.showSources!==false?row.source:'',options?.showDates!==false?row.publishedAt??'':''].filter(Boolean).join(' · ');
    const snippet=detail==='concise'?row.snippet.slice(0,110):detail==='detailed'?row.snippet.slice(0,320):row.snippet.slice(0,200);
    return `${index+1}. ${row.title}\n${snippet}${meta?'\n'+meta:''}\n${row.url}`;
  }).join('\n\n');
}
