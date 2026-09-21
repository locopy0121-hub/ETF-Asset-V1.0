import assert from 'node:assert/strict';
import {formatNetworkResults,parseDuckDuckGo,parseDuckHtml,parseWikipedia,searchNetwork} from '../src/ai/networkSearch';

const html=`
<html><body>
<div class="result results_links">
  <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Farticle%3Fa%3D1&amp;rut=x">Example &amp; Article</a>
  <a class="result__snippet">General web result for Taiwan ETF &amp; market.</a>
</div>
<div class="result results_links">
  <a class="result__a" href="https://news.example.org/story">Market story</a>
  <div class="result__snippet">A second result.</div>
</div>
</body></html>`;

const web=parseDuckHtml(html);
assert.equal(web.length,2);
assert.equal(web[0]?.title,'Example & Article');
assert.equal(web[0]?.url,'https://example.com/article?a=1');
assert.equal(web[0]?.source,'example.com');
assert.match(web[0]?.snippet??'',/Taiwan ETF & market/);
assert.equal(web[1]?.source,'news.example.org');

const duck=parseDuckDuckGo({
  Heading:'ETF',
  AbstractText:'Exchange-traded fund summary',
  AbstractURL:'https://example.com/etf',
  AbstractSource:'Example',
  RelatedTopics:[{Text:'Taiwan ETF reference',FirstURL:'https://example.com/tw-etf'}],
});
assert.equal(duck.length,2);
assert.equal(duck[0]?.source,'Example');
assert.match(formatNetworkResults(duck,{showSources:true,detail:'concise'}),/Example/);

const wiki=parseWikipedia(['0050',['元大台灣50'],['台灣 ETF'],['https://zh.wikipedia.org/wiki/0050']]);
assert.equal(wiki.length,1);
assert.equal(wiki[0]?.source,'Wikipedia');
assert.match(formatNetworkResults(wiki,{showSources:false,detail:'balanced'}),/元大台灣50/);

const mockFetch=(async(input:RequestInfo|URL)=>{
  const url=String(input);
  if(url.includes('html.duckduckgo.com'))return new Response(html,{status:200,headers:{'content-type':'text/html'}});
  if(url.includes('api.duckduckgo.com'))return new Response(JSON.stringify({
    Heading:'ETF',
    AbstractText:'Fallback summary',
    AbstractURL:'https://example.com/article?a=1',
    AbstractSource:'Duplicate fallback',
  }),{status:200,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify(['ETF',['Wikipedia ETF'],['Wiki fallback'],['https://zh.wikipedia.org/wiki/ETF']]),{status:200,headers:{'content-type':'application/json'}});
}) as typeof fetch;

const failingHtmlFetch=(async(input:RequestInfo|URL)=>{
  const url=String(input);
  if(url.includes('html.duckduckgo.com'))return new Response('blocked',{status:503});
  if(url.includes('api.duckduckgo.com'))return new Response(JSON.stringify({
    Heading:'Fallback',
    AbstractText:'Instant answer still available',
    AbstractURL:'https://fallback.example.com',
    AbstractSource:'Duck fallback',
  }),{status:200,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify(['Fallback',[],[],[]]),{status:200,headers:{'content-type':'application/json'}});
}) as typeof fetch;

async function main(){
  const merged=await searchNetwork('ETF latest info',mockFetch);
  assert.equal(merged[0]?.title,'Example & Article');
  assert.equal(merged.filter(row=>row.url==='https://example.com/article?a=1').length,1);
  assert.ok(merged.some(row=>row.source==='Wikipedia'));
  assert.match(formatNetworkResults(merged,{showSources:true,detail:'detailed'}),/example\.com/);

  const fallback=await searchNetwork('fallback query',failingHtmlFetch);
  assert.equal(fallback[0]?.url,'https://fallback.example.com/');

  console.log('v1.1.2 general network search behavior PASS');
}

main().catch(error=>{console.error(error);process.exitCode=1;});
