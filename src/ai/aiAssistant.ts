import type {AiNewsItem} from './AiNewsRuntime';
import type {AiSessionContext} from './aiConversationTypes';
import {formatDividendEvent,refreshHoldingDividendEvents,type HoldingDividendEvent} from './dividendAssistant';
import {calculateLedgerCashFlow,type CanonicalLedgerEntry} from '../finance/canonicalLedger';

export type AiAssistantAction=
  |Readonly<{
    id:string;
    kind:'addDividend';
    label:string;
    event:HoldingDividendEvent;
  }>
  |Readonly<{
    id:string;
    kind:'openDividend';
    label:string;
    question:string;
  }>
  |Readonly<{
    id:string;
    kind:'openNews';
    label:string;
    url:string;
  }>;

export type AiAssistantAnswer=Readonly<{
  intent:'capabilities'|'news'|'dividend-update'|'dividend'|'performance'|'market-value'|'allocation'|'ranking'|'ledger'|'holdings'|'holding-detail'|'help';
  text:string;
  actions?:readonly AiAssistantAction[];
  sessionContext?:AiSessionContext;
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
  weight?:number;
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
const holdingEntryDate=(entries:readonly CanonicalLedgerEntry[],symbol:string)=>entries
  .filter(entry=>'symbol' in entry&&entry.symbol===symbol)
  .map(entry=>entry.date)
  .sort()
  .at(-1)??'尚無帳務日期';
const annotatedEntryDate=(entries:readonly CanonicalLedgerEntry[],symbol:string)=>{
  const latest=holdingEntryDate(entries,symbol);
  const now=new Date();
  const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  return /^\d{4}-\d{2}-\d{2}$/.test(latest)&&latest>today?latest+'（未來日期，請確認是否為預約交易）':latest;
};
const openDividendAction=(holding:HoldingLike):AiAssistantAction=>({
  id:'open-dividend-'+holding.symbol,
  kind:'openDividend',
  label:'查看 '+holding.symbol+' 股息資訊',
  question:'更新 '+holding.symbol+' 股息日',
});

const holdingWeight=(holding:HoldingLike,holdings:readonly HoldingLike[])=>{
  if(Number.isFinite(Number(holding.weight)))return Number(holding.weight);
  const total=holdings.reduce((sum,row)=>sum+Math.max(0,Number(row.marketValue??0)),0);
  return total>0?Math.max(0,Number(holding.marketValue??0))/total*100:0;
};
const latestLedgerRows=(entries:readonly CanonicalLedgerEntry[],limit=5)=>[...entries]
  .sort((a,b)=>b.date.localeCompare(a.date))
  .slice(0,limit)
  .map((entry,index)=>{
    if(entry.kind==='buy'||entry.kind==='sell'){
      const kind=entry.kind==='buy'?'買進':'賣出';
      return (index+1)+'. '+entry.date+'｜'+kind+' '+entry.symbol+' '+entry.name+'｜'+
        Number(entry.shares).toLocaleString('zh-TW')+' 股 × '+Number(entry.price).toFixed(2)+
        '｜現金流 NT$ '+money(calculateLedgerCashFlow(entry));
    }
    if(entry.kind==='dividend')return (index+1)+'. '+entry.date+'｜股息 '+entry.symbol+' '+entry.name+'｜淨入帳 NT$ '+money(calculateLedgerCashFlow(entry));
    if(entry.kind==='other')return (index+1)+'. '+entry.date+'｜現金調整 '+entry.label+'｜NT$ '+money(calculateLedgerCashFlow(entry));
    return (index+1)+'. '+entry.date+'｜帳務紀錄｜NT$ '+money(calculateLedgerCashFlow(entry));
  });

function textNews(items:readonly AiNewsItem[],symbol?:HoldingLike){
  const related=(symbol?items.filter(item=>item.symbol===symbol.symbol):items).slice(0,5);
  if(!related.length)return symbol?'目前沒有已取得的 '+symbol.symbol+' '+symbol.name+' 新聞。':'目前沒有已取得的持股新聞。';
  const intro=symbol?symbol.symbol+' '+symbol.name+' 最近新聞重點：':'目前持股最近有 '+related.length+' 則新聞重點：';
  return [intro,...related.map((item,index)=>(index+1)+'. '+item.symbol+'｜'+item.title+'\n'+(item.summaryStatus==='article'?'【原文重點節錄，非生成式 AI 摘要】\n'+item.summary:'（尚未取得可讀新聞正文，暫不提供摘要）')+'\n'+item.source+(item.publishedAt?' · '+newsDate(item.publishedAt):''))].join('\n\n');
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
      text:'我目前可直接使用 TF Asset 內的持股、帳務、股息、行情與持股新聞資料。\n\n可以查：① 總市值／總損益 ② 資產配置與持股占比 ③ 持股損益排行 ④ 最近交易與帳務紀錄 ⑤ 單檔 ETF 的股數、成本、市值、損益、報酬率、累積股息 ⑥ 本月／年度股息 ⑦ 更新持股股息日 ⑧ 最近持股新聞。\n\n涉及新增股息等寫入動作時，我會先列出內容並要求確認，不會自行寫入。',
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
    const related=(symbol?newsItems.filter(item=>item.symbol===symbol.symbol):newsItems).slice(0,5);
    const actions:AiAssistantAction[]=related.filter(item=>/^https:\/\//i.test(item.url)).map(item=>({
      id:'open-news-'+item.id,kind:'openNews',label:'開啟來源：'+item.source,url:item.url,
    }));
    return {intent:'news',text:textNews(newsItems,symbol),actions};
  }

  if(includesAny(q,['資產配置','配置','占比','比重','權重'])){
    const rows=[...holdings]
      .map(holding=>({...holding,aiWeight:holdingWeight(holding,holdings)}))
      .sort((a,b)=>b.aiWeight-a.aiWeight);
    if(!rows.length)return {intent:'allocation',text:'目前沒有持股，因此沒有可整理的資產配置。'};
    return {
      intent:'allocation',
      text:'目前資產配置：\n\n'+rows.map((holding,index)=>
        (index+1)+'. '+holding.symbol+' '+holding.name+'｜'+holding.aiWeight.toFixed(1)+'%｜市值 NT$ '+money(holding.marketValue)
      ).join('\n')+'\n\n合計持股市值 NT$ '+money(portfolio.totalMarketValue)+'。',
    };
  }

  if(includesAny(q,['排行','排名','賺最多','虧最多','最好','最差','最大持股','最小持股'])){
    if(!holdings.length)return {intent:'ranking',text:'目前沒有持股可進行排行。'};
    const byPnl=[...holdings].sort((a,b)=>Number(b.pnl??0)-Number(a.pnl??0));
    const byWeight=[...holdings].sort((a,b)=>holdingWeight(b,holdings)-holdingWeight(a,holdings));
    if(includesAny(q,['最大持股'])){const h=byWeight[0]!;return {intent:'ranking',text:'目前最大持股為 '+h.symbol+' '+h.name+'，占比 '+holdingWeight(h,holdings).toFixed(1)+'%，市值 NT$ '+money(h.marketValue)+'。'};}
    if(includesAny(q,['最小持股'])){const h=byWeight.at(-1)!;return {intent:'ranking',text:'目前最小持股為 '+h.symbol+' '+h.name+'，占比 '+holdingWeight(h,holdings).toFixed(1)+'%，市值 NT$ '+money(h.marketValue)+'。'};}
    if(includesAny(q,['虧最多','最差'])){const h=byPnl.at(-1)!;return {intent:'ranking',text:'目前帳面損益最低的是 '+h.symbol+' '+h.name+'：NT$ '+money(h.pnl)+'，報酬率 '+pct(h.roi)+'%。'};}
    if(includesAny(q,['賺最多','最好'])){const h=byPnl[0]!;return {intent:'ranking',text:'目前帳面損益最高的是 '+h.symbol+' '+h.name+'：NT$ '+money(h.pnl)+'，報酬率 '+pct(h.roi)+'%。'};}
    return {intent:'ranking',text:'持股損益排行：\n\n'+byPnl.map((h,index)=>(index+1)+'. '+h.symbol+' '+h.name+'｜損益 NT$ '+money(h.pnl)+'｜'+pct(h.roi)+'%').join('\n')};
  }

  if(includesAny(q,['最近交易','交易紀錄','帳務紀錄','最近紀錄','買賣紀錄','最近買賣'])){
    const rows=latestLedgerRows(entries,5);
    const buys=entries.filter(entry=>entry.kind==='buy').length;
    const sells=entries.filter(entry=>entry.kind==='sell').length;
    const dividends=entries.filter(entry=>entry.kind==='dividend').length;
    return {
      intent:'ledger',
      text:rows.length
        ?'帳務摘要：買進 '+buys+' 筆、賣出 '+sells+' 筆、股息 '+dividends+' 筆。\n\n最近紀錄：\n'+rows.join('\n\n')
        :'目前尚無帳務紀錄。',
    };
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
    if(symbol)return {intent:'dividend',text:symbol.symbol+' '+symbol.name+' 目前帳務累積股息 NT$ '+money(symbol.cumulativeDividend)+'。點擊下方按鈕可查下一次除息、配發與未登錄紀錄。',actions:[openDividendAction(symbol)]};
    return {intent:'dividend',text:'目前帳務累積淨股息 NT$ '+money(portfolio.totalDividendsReceived)+'。若要掃描持股最新除息與待補登紀錄，請輸入「更新持股股息日」。'};
  }

  if(includesAny(q,['損益','報酬','績效'])){
    if(symbol)return {intent:'performance',text:symbol.symbol+' '+symbol.name+'：損益 NT$ '+money(symbol.pnl)+'，報酬率 '+pct(symbol.roi)+'%，含息損益 NT$ '+money(symbol.comprehensivePnl)+'。'};
    if(includesAny(q,['報酬率','報酬'])){
      const unrealized=Number(portfolio.totalUnrealizedProfit)||0;
      const marketValue=Number(portfolio.totalMarketValue)||0;
      const costBasis=Math.max(0,marketValue-unrealized);
      const roi=costBasis>0?unrealized/costBasis*100:0;
      return {intent:'performance',text:'目前持股未實現報酬率 '+roi.toFixed(2)+'%；未實現損益 NT$ '+money(unrealized)+'，持股市值 NT$ '+money(marketValue)+'。含息總損益 NT$ '+money(portfolio.totalPnl)+'。'};
    }
    return {intent:'performance',text:'目前含息總損益 NT$ '+money(portfolio.totalPnl)+'；未實現損益 NT$ '+money(portfolio.totalUnrealizedProfit)+'；已實現損益 NT$ '+money(portfolio.realizedNetPnL)+'。'};
  }

  if(includesAny(q,['市值','資產'])){
    if(symbol)return {intent:'market-value',text:symbol.symbol+' '+symbol.name+' 目前市值 NT$ '+money(symbol.marketValue)+'，持有 '+Number(symbol.shares??0).toLocaleString('zh-TW')+' 股。'};
    return {intent:'market-value',text:'目前持股市值 NT$ '+money(portfolio.totalMarketValue)+'；含息總損益 NT$ '+money(portfolio.totalPnl)+'。'};
  }

  if(includesAny(q,['持股','幾檔','有哪些'])){
    const rows=holdings.map((holding,index)=>
      (index+1)+'. '+holding.symbol+' '+holding.name+'\n持有 '+Number(holding.shares??0).toLocaleString('zh-TW')+' 股\n最近紀錄：'+annotatedEntryDate(entries,holding.symbol)
    );
    return {
      intent:'holdings',
      text:holdings.length?'目前共 '+holdings.length+' 檔持股：\n\n'+rows.join('\n\n'):'目前沒有持股。',
      actions:holdings.map(openDividendAction),
    };
  }

  if(symbol){
    return {
      intent:'holding-detail',
      text:symbol.symbol+' '+symbol.name+'\n持有：'+Number(symbol.shares??0).toLocaleString('zh-TW')+' 股\n現價：NT$ '+Number(symbol.price??0).toLocaleString('zh-TW')+'\n平均成本：NT$ '+Number(symbol.avgCost??0).toLocaleString('zh-TW')+'\n市值：NT$ '+money(symbol.marketValue)+'\n持股占比：'+holdingWeight(symbol,holdings).toFixed(1)+'%\n損益：NT$ '+money(symbol.pnl)+'\n報酬率：'+pct(symbol.roi)+'%\n含息損益：NT$ '+money(symbol.comprehensivePnl)+'\n累積股息：NT$ '+money(symbol.cumulativeDividend),
    };
  }

  return {
    intent:'help',
    text:'目前 Gemini 對話服務暫時沒有取得可用回答。本機資料工具仍可處理持股、行情、帳務、股息與新聞問題；你也可以稍後再重試一般對話。',
  };
}
