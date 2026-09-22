import assert from 'node:assert/strict';
import {extractArticleBody,extractArticleHighlights} from '../src/ai/articleSummary';

const headline='0050 盤中創高 外資持續買超';
assert.equal(extractArticleBody('<html><h1>'+headline+'</h1><p>只有新聞標題</p></html>'),null);
const html='<article>'+
'<p>台灣大型市值型 ETF 本週成交持續活躍，部分權值股盤中刷新波段高點，買賣超資料須核對交易所公告。</p>'+
'<p>觀察當日成交量及委託買賣變化，有助判斷價格波動，但成交量本身無法推導未來漲跌幅。</p>'+
'<p>投資人除了價格波動，還需比對當日指數表現及 ETF 折溢價資訊，並留意官方揭露時間。</p>'+
'<p>基金公告顯示成分股定期檢視仍依指數編製規則辦理，因此不能將新聞報導解讀為已確認的資金流向。</p>'+
'<p>此外，交易所公告須與交易當天的盤中行情區別，ETF 新聞涉及的資產規模及成交量應標明日期和計算口徑。</p>'+'<'p>新聞引用的市場人士觀察僅代表受訪者意見，讀者仍需查看基金公司發布的正式公告及公開資訊。</p>'+'<'p>相關基金標的雖同樣追蹤台灣市場，但選股規則、權重調整日期及費用結構存在差異，報酬不能直接混用。</p>'+'<'p>若正文沒有提供確切買超數量或財務資料，整理重點時應保留資訊不足的狀態，不應自行補上數字。</p>'+'<'p>本段補充資訊用於驗證完整文章多段落擷取，應確保預覽僅顯示可取得的正文，而非搜尋結果標題。</p>'+
'</article>';
const body=extractArticleBody(html);
assert.ok(body&&body.length>=350,'Extract real body from three or more article paragraphs');
const points=extractArticleHighlights(body,headline);
assert.ok(points.length>=2&&points.length<=5,'Produce multiple source-grounded points');
assert.ok(!points.includes(headline),'Never return title alone as article summary');
console.log('V2.1.2 article-body and no-headline-echo behavior: PASS');
