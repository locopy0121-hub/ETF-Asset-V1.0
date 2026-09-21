import type {AiNewsItem} from './AiNewsRuntime';
import {formatDividendEvent,refreshHoldingDividendEvents,type HoldingDividendEvent} from './dividendAssistant';
import type {CanonicalLedgerEntry} from '../finance/canonicalLedger';

export type AiAssistantAction=Readonly<{
  id:string;
  kind:'addDividend';
  label:string;
  event:HoldingDividendEvent;
}>;

export type AiAssistantAnswer=Readonly<{
  intent:'capabilities'|'news'|'dividend-update'|'dividend'|'performance'|'market-value'|'holdings'|'holding-detail'|'help';
  text:string;
  actions?:readonly AiAssistantAction[];
}>;

type HoldingLike=Readonly<{
  symbol:string;
  name:string;
  shares:number;
  price:number;
  marketValue?:number;
  pnl?:number;
  roi?:number;
  cumulativeDividend?:number;
  avgCost?:number;
  realizedPnl?:number;
  comprehensivePnl?:number;
}>;

type PortfolioLike=Readonly<{
  totalMarketValue:number;
  totalPnl:number;
  totalUnrealizedProfit:number;
  realizedNetPnL:number;
  totalDividendsReceived:number;
}>;

const money=(value:number|undefined)=>Math.round(Number(value??0)).toLocaleString('zh-TW');
const pct=(value:number|undefined)=>Number(value??0).toFixed(2);
const includesAny=(text:string,words:readonly string[])=>words.some(word=>text.includes(word));
const normalize=(value:string)=>value.trim().toLowerCase();
const newsDate=(value:string)=>{const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('zh-TW');};

function textNews(items:readonly AiNewsItem[],symbol?:HoldingLike){
  const related=(symbol?items.filter(item=>item.symbol===symbol.symbol):items).slice(0,5);
  if(!related.length)return symbol?'目前沒有已取得的 '+symbol.symbol+' '+symbol.name+' 新聞。':'目前沒有已取得的持股新聞。';
  const intro=symbol?symbol.symbol+' '+symbol.name+' 最近新聞重點：':'目前持股最近有 '+related.length+' 則新聞重點：';
  return [intro,...related.map((item,index)=>(index+1)+'. '+item.symbol+'｜'+item.title+'\n'+item.summary+'\n'+item.source+(item.publishedAt?' · '+newsDate(item.publishedAt):''))].join('\n\n');
}

export async function answerAiQuestion(
  question:string,
  holdings:readonly HoldingLike[],
  portfolio:PortfolioLike,
  newsItems:readonly AiNewsItem[],
  entries:readonly CanonicalLedgerEntry[]=[],
):Promise<AiAssistantAnswer>{
  const q=normalize(question);
  const symbol=holdings.find(h=>q.includes(h.symbol.toLowerCase())||(Boolean(h.name)&&q.includes(h.name.toLowerCase())));

  if(includesAny(q,['你可以做什麼','可以做什麼','會做什麼','有什麼功能','能做什麼','幫什麼'])){
    return {
      intent:'capabilities',
      text:'我可以直接使用目前 App 的持股、帳務、股息與行情資料回答問題，也能整理持股新聞。你可以問持股市值、損益、報酬、年度／本月股息、某檔 ETF 資訊，或輸入「更新持股股息日」掃描證交所最新配息事件並找出尚未登錄的紀錄。需要寫入帳務的動作，我會先列出內容並提供「＋新增」，不會自行寫入。',
    };
  }

  const dividendUpdate=includesAny(q,['更新持股股息日','更新股息日','更新配息日','掃描股息','檢查股息紀錄','未登錄股息']);
  const dividendDate=includesAny(q,['除息日','配發日','發放日','最後購買日','股息日']);
  if(dividendUpdate||dividendDate){
    const target=symbol?[symbol]:holdings;
    const events=await refreshHoldingDividendEvents(target,entries);
    const visible=events.filter(event=>!event.alreadyRecorded||dividendDate).slice(0,12);
    if(!visible.length){
      return {intent:'dividend-update',text:symbol?symbol.symbol+' '+symbol.name+' 目前沒有需要補登或近期可用的配息事件。':'目前持股沒有找到需要補登的近期配息事件。'};
    }
    const actions=visible
      .filter(event=>event.status==='尚未登錄'&&event.eligibleShares>0&&event.perShareAmount>0)
      .map(event=>({id:'add-'+event.id,kind:'addDividend' as const,label:'＋新增',event}));
    return {
      intent:'dividend-update',
      text:visible.map(formatDividendEvent).join('\n\n────────\n\n'),
      actions,
    };
  }

  if(includesAny(q,['新聞','消息','最新消息','最新新聞'])){
    return {intent:'news',text:textNews(newsItems,symbol)};
  }

  if(includesAny(q,['股息','配息'])){
    if(symbol)return {intent:'dividend',text:symbol.symbol+' '+symbol.name+' 目前帳務累積股息 NT$ '+money(symbol.cumulativeDividend)+'。若要查下一次除息／配發或未登錄紀錄，請輸入「更新 '+symbol.symbol+' 股息日」。'};
    return {intent:'dividend',text:'目前帳務累積淨股息 NT$ '+money(portfolio.totalDividendsReceived)+'。若要掃描持股最新除息與待補登紀錄，請輸入「更新持股股息日」。'};
  }

  if(includesAny(q,['損益','報酬','績效'])){
    if(symbol)return {intent:'performance',text:symbol.symbol+' '+symbol.name+'：損益 NT$ '+money(symbol.pnl)+'，報酬率 '+pct(symbol.roi)+'%，含息損益 NT$ '+money(symbol.comprehensivePnl)+'。'};
    return {intent:'performance',text:'目前含息總損益 NT$ '+money(portfolio.totalPnl)+'；未實現損益 NT$ '+money(portfolio.totalUnrealizedProfit)+'；已實現損益 NT$ '+money(portfolio.realizedNetPnL)+'。'};
  }

  if(includesAny(q,['市值','資產'])){
    if(symbol)return {intent:'market-value',text:symbol.symbol+' '+symbol.name+' 目前市值 NT$ '+money(symbol.marketValue)+'，持有 '+Number(symbol.shares??0).toLocaleString('zh-TW')+' 股。'};
    return {intent:'market-value',text:'目前持股市值 NT$ '+money(portfolio.totalMarketValue)+'；含息總損益 NT$ '+money(portfolio.totalPnl)+'。'};
  }

  if(includesAny(q,['持股','幾檔','有哪些'])){
    const names=holdings.slice(0,20).map(h=>h.symbol+' '+h.name).join('、');
    return {intent:'holdings',text:'目前共 '+holdings.length+' 檔持股'+(names?'：'+names:'')+'。'};
  }

  if(symbol){
    return {
      intent:'holding-detail',
      text:symbol.symbol+' '+symbol.name+'\n持有：'+Number(symbol.shares??0).toLocaleString('zh-TW')+' 股\n現價：NT$ '+Number(symbol.price??0).toLocaleString('zh-TW')+'\n平均成本：NT$ '+Number(symbol.avgCost??0).toLocaleString('zh-TW')+'\n市值：NT$ '+money(symbol.marketValue)+'\n損益：NT$ '+money(symbol.pnl)+'\n報酬率：'+pct(symbol.roi)+'%\n累積股息：NT$ '+money(symbol.cumulativeDividend),
    };
  }

  return {
    intent:'help',
    text:'我沒有把這句話判斷成要查新聞。你可以直接問「目前持股市值？」「0050 損益？」「今年股息多少？」「更新持股股息日」或「最近持股有什麼新聞？」。',
  };
}
