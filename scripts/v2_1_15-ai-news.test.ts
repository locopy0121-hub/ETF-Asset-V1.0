import assert from 'node:assert/strict';
import {isPublisherArticleUrl,resolvePublisherUrl} from '../src/ai/newsArticleResolver';
import {extractArticleBody,extractArticleHighlights} from '../src/ai/articleSummary';
import {answerAiQuestion} from '../src/ai/aiAssistant';

assert.equal(isPublisherArticleUrl('https://news.google.com/rss/articles/abc'),false);
assert.equal(isPublisherArticleUrl('https://www.google.com/url?q=foo'),false);
assert.equal(isPublisherArticleUrl('javascript:alert(1)'),false);
assert.equal(isPublisherArticleUrl('http://publisher.example/news'),false);
assert.equal(isPublisherArticleUrl('https://publisher.example/news?id=1'),true);

const aggregator=String.raw`<html><head><link rel="canonical" href="https://news.google.com/articles/x"/></head><body>
  <a data-n-au="https://publisher.example/articles/123?lang=tw&amp;edition=latest">原文</a>
  <a href="https://advertiser.example/banner">廣告</a></body></html>`;
assert.equal(resolvePublisherUrl(aggregator,'https://news.google.com/rss/articles/x'),
  'https://publisher.example/articles/123?lang=tw&edition=latest');
assert.equal(resolvePublisherUrl('<html><a href="https://publisher.example/story">連結</a></html>',
  'https://news.google.com/rss/articles/x'),null,'No guessing from arbitrary outbound links');
assert.equal(resolvePublisherUrl('<html/>','https://publisher.example/news'),'https://publisher.example/news');
assert.equal(resolvePublisherUrl('<html/>','https://news.google.com/rss/articles/x'),null);

const body='這是一則來自發行機構的新聞內容，完整說明事件時間與影響，也提醒讀者區分公告日期與交易日期。'.repeat(12);
const ld=JSON.stringify({'@context':'https://schema.org','@type':'NewsArticle',articleBody:body});
const publisherHtml='<html><head><script type="application/ld+json">'+ld+'</script></head><body><main><div>文章</div></main></body></html>';
assert.equal(extractArticleBody(publisherHtml),body,'Publisher JSON-LD article body may be used when <article> is missing');
assert.equal(extractArticleBody('<html><main><p>廣告</p></main></html>'),null,'Do not fabricate from thin pages');
assert.ok(extractArticleHighlights(body,'另一個新聞標題').length>=2);

async function checkAssistant(){
  const known={
    id:'article-1',symbol:'0050',name:'元大台灣50',title:'來源公告資料',
    source:'原始新聞',publishedAt:'2026-09-23T05:00:00Z',
    url:'https://publisher.example/articles/123',
    summary:'確認過的來源正文節錄',summaryStatus:'article' as const,
  };
  const result=await answerAiQuestion('最近持股有什麼新聞？',[],
    {totalMarketValue:0,totalPnl:0,totalUnrealizedProfit:0,realizedNetPnL:0,totalDividendsReceived:0},
    [known]);
  assert.equal(result.intent,'news');
  assert.match(result.text,/非生成式 AI 摘要/);
  assert.equal(result.actions?.[0]?.kind,'openNews');
  assert.equal(result.actions?.[0]?.url,known.url);
}
checkAssistant().then(()=>console.log('V2.1.15 publisher resolution, structured正文 and transparent news link tests PASS')).catch(e=>{console.error(e);process.exitCode=1;});
