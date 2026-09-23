/**
 * Conservative publisher-HTML reader: only use substantial article paragraphs.
 * Never fabricate a summary from a headline or a Google News RSS title.
 */
const strip=(html:string)=>html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]*>/g,' ')
  .replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
  .replace(/&#39;|&apos;/gi,"'")
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
  .replace(/&#(\d+);/g,(_,number:string)=>String.fromCharCode(Number(number)))
  .replace(/\s+/g,' ').trim();

/** Publisher JSON-LD articleBody is usable when the page does not wrap paragraphs in <article>. */
export function extractStructuredArticleBody(html:string):string|null{
  const scripts=Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))
    .filter(hit=>/type\s*=\s*["']application\/ld\+json["']/i.test(hit[1]??''));
  for(const match of scripts){
    try{
      const parsed=JSON.parse(match[2]??'') as unknown;
      const pending:unknown[]=[parsed];
      let examined=0;
      while(pending.length&&examined++<40){
        const node=pending.shift();
        if(Array.isArray(node)){pending.push(...node);continue;}
        if(!node||typeof node!=='object')continue;
        const item=node as Record<string,unknown>;
        const articleType=item['@type'];
        const types=Array.isArray(articleType)?articleType:[articleType];
        if(types.some(value=>typeof value==='string'&&/(?:NewsArticle|Article|ReportageNewsArticle)$/i.test(value))){
          const body=item.articleBody;
          if(typeof body==='string'&&body.trim().length>=350)return body.replace(/\s+/g,' ').trim().slice(0,16000);
        }
        if(item['@graph'])pending.push(item['@graph']);
        if(item.mainEntity)pending.push(item.mainEntity);
      }
    }catch{/* Malformed JSON-LD is not an article; keep searching. */}
  }
  return null;
}

export function extractArticleBody(html:string):string|null{
  // Avoid treating navigation, related links or aggregator headlines as an article.
  const cleaned=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
  const article=/<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(cleaned)?.[1]
    ??/<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(cleaned)?.[1];
  if(!article)return extractStructuredArticleBody(html);
  const paragraphs=(article.match(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)??[])
    .map(strip).filter(p=>p.length>=28&&!/^(訂閱|廣告|相關新聞|延伸閱讀|圖片來源)/.test(p));
  const body=paragraphs.join('\n\n');
  return paragraphs.length>=3&&body.length>=350?body.slice(0,16000):extractStructuredArticleBody(html);
}
export function extractArticleHighlights(body:string,title:string):string[]{
  const normalizedTitle=title.replace(/\s+/g,'').slice(0,28);
  const sentences=body.replace(/\n+/g,' ').match(/[^。！？!?]+[。！？!?]?/g)??[];
  const points=sentences.map(s=>s.trim()).filter(s=>s.length>=25&&s.length<=240)
    .filter(s=>!s.replace(/\s+/g,'').includes(normalizedTitle));
  return Array.from(new Set(points)).slice(0,5);
}
