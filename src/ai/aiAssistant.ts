import type { AiNewsItem } from './AiNewsRuntime';

type HoldingLike=Readonly<{
  symbol:string;
  name:string;
  marketValue?:number;
  pnl?:number;
  roi?:number;
  cumulativeDividend?:number;
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

export function answerAiQuestion(
  question:string,
  holdings:readonly HoldingLike[],
  portfolio:PortfolioLike,
  newsItems:readonly AiNewsItem[],
){
  const q=question.trim().toLowerCase();
  const symbol=holdings.find(h=>q.includes(h.symbol.toLowerCase())||Boolean(h.name)&&q.includes(h.name.toLowerCase()));
  const related=(symbol?newsItems.filter(item=>item.symbol===symbol.symbol):newsItems).slice(0,4);

  if(q.includes('新聞')||q.includes('消息')||q.includes('最新')){
    return related.length
      ?related.map((item,index)=>`${index+1}. ${item.symbol} ${item.title}（${item.source}）`).join('\n')
      :'目前沒有符合條件的已取得新聞。';
  }

  if(q.includes('股息')||q.includes('配息')){
    if(symbol)return `${symbol.symbol} ${symbol.name} 累積股息 NT$ ${money(symbol.cumulativeDividend)}。`;
    return `目前累積淨股息 NT$ ${money(portfolio.totalDividendsReceived)}。`;
  }

  if(q.includes('損益')||q.includes('報酬')||q.includes('績效')){
    if(symbol)return `${symbol.symbol} ${symbol.name}：損益 NT$ ${money(symbol.pnl)}，報酬率 ${pct(symbol.roi)}%。`;
    return `目前含息總損益 NT$ ${money(portfolio.totalPnl)}；未實現損益 NT$ ${money(portfolio.totalUnrealizedProfit)}；已實現損益 NT$ ${money(portfolio.realizedNetPnL)}。`;
  }

  if(q.includes('市值')||q.includes('資產')){
    if(symbol)return `${symbol.symbol} ${symbol.name} 目前市值 NT$ ${money(symbol.marketValue)}。`;
    return `目前持股市值 NT$ ${money(portfolio.totalMarketValue)}；含息總損益 NT$ ${money(portfolio.totalPnl)}。`;
  }

  if(q.includes('持股')||q.includes('幾檔')||q.includes('有哪些')){
    const names=holdings.slice(0,10).map(h=>`${h.symbol} ${h.name}`).join('、');
    return `目前共 ${holdings.length} 檔持股${names?`：${names}`:''}。`;
  }

  if(symbol){
    const news=related.length?`\n最近新聞：\n${related.slice(0,3).map(item=>`• ${item.title}`).join('\n')}`:'';
    return `${symbol.symbol} ${symbol.name}：市值 NT$ ${money(symbol.marketValue)}，損益 NT$ ${money(symbol.pnl)}，報酬率 ${pct(symbol.roi)}%，累積股息 NT$ ${money(symbol.cumulativeDividend)}。${news}`;
  }

  const latest=related.slice(0,3).map(item=>`• ${item.symbol} ${item.title}`).join('\n');
  return `目前持股市值 NT$ ${money(portfolio.totalMarketValue)}，含息總損益 NT$ ${money(portfolio.totalPnl)}，累積淨股息 NT$ ${money(portfolio.totalDividendsReceived)}。${latest?`\n最近持股新聞：\n${latest}`:''}`;
}
