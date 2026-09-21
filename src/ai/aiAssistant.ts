import type {AiNewsItem} from './AiNewsRuntime';
import {formatDividendEvent,refreshHoldingDividendEvents,type HoldingDividendEvent} from './dividendAssistant';
import {calculateLedgerCashFlow,type CanonicalLedgerEntry} from '../finance/canonicalLedger';
import {formatNetworkResults,searchNetwork} from './networkSearch';

export type AiAssistantAction=Readonly<{
  id:string;
  kind:'addDividend';
  label:string;
  event:HoldingDividendEvent;
}>;

export type AiAssistantAnswer=Readonly<{
  intent:'capabilities'|'news'|'dividend-update'|'dividend'|'performance'|'market-value'|'holdings'|'holding-detail'|'network'|'help';
  text:string;
  actions?:readonly AiAssistantAction[];
}>;

export type AiConversationTurn=Readonly<{role:'user'|'assistant';text:string}>;

export type AiAssistantOptions=Readonly<{
  networkSearchEnabled?:boolean;
  showSources?:boolean;
  showDates?:boolean;
  responseDetail?:'concise'|'balanced'|'detailed';
  conversation?:readonly AiConversationTurn[];
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
  options:AiAssistantOptions={},
):Promise<AiAssistantAnswer>{
  const q=normalize(question);
  const directSymbol=holdings.find(h=>q.includes(h.symbol.toLowerCase())||(Boolean(h.name)&&q.includes(h.name.toLowerCase())));
  const contextQ=normalize((options.conversation??[]).filter(turn=>turn.role==='user').slice(-8).map(turn=>turn.text).join(' '));
  const contextSymbol=directSymbol?undefined:holdings.find(h=>contextQ.includes(h.symbol.toLowerCase())||(Boolean(h.name)&&contextQ.includes(h.name.toLowerCase())));
  const symbol=directSymbol??contextSymbol;

  if(includesAny(q,['你可以做什麼','可以做什麼','會做什麼','有什麼功能','能做什麼','幫什麼'])){
    return {
      intent:'capabilities',
      text:'我可以直接使用目前 App 的持股、帳務、股息與行情資料回答問題，也能整理持股新聞'+(options.networkSearchEnabled?'，以及依你的問題進行一般網路搜尋。':'。')+'你可以問持股市值、損益、報酬、年度／本月股息、某檔 ETF 資訊，或輸入「更新持股股息日」掃描證交所最新配息事件並找出尚未登錄的紀錄。需要寫入帳務的動作，我會先列出內容並提供「＋新增」，不會自行寫入。',
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
      .filter(event=>(event.status==='尚未登錄'||event.status==='待配發')&&event.eligibleShares>0&&event.perShareAmount>0)
      .map(event=>({id:'add-'+event.id,kind:'addDividend' as const,label:'＋新增 '+event.symbol,event}));
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
    const today=new Date().toISOString().slice(0,10);
    const year=today.slice(0,4),month=today.slice(0,7);
    const dividends=entries.filter((entry):entry is Extract<CanonicalLedgerEntry,{kind:'dividend'}>=>entry.kind==='dividend');
    if(includesAny(q,['本月','這個月'])){
      const rows=dividends.filter(entry=>entry.date.startsWith(month)&&(symbol?entry.symbol===symbol.symbol:true));
      const total=rows.reduce((sum,entry)=>sum+calculateLedgerCashFlow(entry),0);
      return {intent:'dividend',text:(symbol?symbol.symbol+' '+symbol.name+' ':'')+month+' 本月淨股息 NT$ '+money(total)+'，共 '+rows.length+' 筆。'};
    }
    if(includesAny(q,['今年','年度','本年'])){
      const rows=dividends.filter(entry=>entry.date.startsWith(year)&&(symbol?entry.symbol===symbol.symbol:true));
      const total=rows.reduce((sum,entry)=>sum+calculateLedgerCashFlow(entry),0);
      return {intent:'dividend',text:(symbol?symbol.symbol+' '+symbol.name+' ':'')+year+' 年度淨股息 NT$ '+money(total)+'，共 '+rows.length+' 筆。'};
    }
    if(includesAny(q,['最高月份','哪個月','最多'])){
      const totals=Array.from({length:12},(_,index)=>{
        const key=year+'-'+String(index+1).padStart(2,'0');
        return dividends.filter(entry=>entry.date.startsWith(key)&&(symbol?entry.symbol===symbol.symbol:true)).reduce((sum,entry)=>sum+calculateLedgerCashFlow(entry),0);
      });
      const max=Math.max(0,...totals),index=totals.indexOf(max);
      return {intent:'dividend',text:year+' 年目前股息最高月份為 '+(index+1)+' 月，淨股息 NT$ '+money(max)+'。'};
    }
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

  if(options.networkSearchEnabled){
    const networkQuery=symbol&&!directSymbol?symbol.symbol+' '+symbol.name+' '+question:question;
    const rows=await searchNetwork(networkQuery);
    if(rows.length){
      return {
        intent:'network',
        text:'網路搜尋結果：\n\n'+formatNetworkResults(rows,{
          showSources:options.showSources,
          showDates:options.showDates,
          detail:options.responseDetail,
        }),
      };
    }
    return {intent:'network',text:'已嘗試一般網路搜尋，但目前沒有取得可用結果。你可以換一個更明確的關鍵字再試一次。'};
  }

  return {
    intent:'help',
    text:'這個問題需要一般網路搜尋或更明確的 App 資料條件。你可以到「設定 → 系統設定 → AI 助理」開啟一般網路搜尋，或直接問「目前持股市值？」「0050 損益？」「今年股息多少？」「更新持股股息日」或「最近持股有什麼新聞？」。',
  };
}
