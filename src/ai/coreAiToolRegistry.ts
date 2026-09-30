import type {ResolvedSecurity,SecurityCandidate} from '../market/securityResolver';
import {resolveSecurity} from '../market/securityResolver';
import type {AiSessionContext} from './aiConversationTypes';
import {calculateLedgerCashFlow,type CanonicalLedgerEntry} from '../finance/canonicalLedger';

export type AiToolErrorCode=
  |'TOOL_NOT_FOUND'
  |'INVALID_ARGS'
  |'SERVICE_UNAVAILABLE'
  |'SECURITY_NOT_FOUND';

export type AiToolResult<T>=Readonly<{
  ok:boolean;
  tool:string;
  version:number;
  data?:T;
  meta:Readonly<{
    source:string;
    fetchedAt:string;
    observedAt?:string;
    verificationStatus?:'VERIFIED'|'PENDING'|'UNAVAILABLE';
    calculatedAt?:string;
  }>;
  error?:Readonly<{code:AiToolErrorCode;message:string;retryable:boolean}>;
}>;

export type CoreAiHolding=Readonly<{
  symbol:string;
  name:string;
  shares:number;
  price:number;
  avgCost?:number;
  marketValue?:number;
  pnl?:number;
  roi?:number;
  cumulativeDividend?:number;
  comprehensivePnl?:number;
}>;

export type CoreAiQuote=Readonly<{
  symbol:string;
  name:string;
  currentPrice:number;
  previousClose?:number|null;
  sourceQuoteAt?:number|null;
  quality?:string|null;
  source?:string|null;
  statusMessage?:string|null;
  market?:string|null;
}>;

export type QuoteToolData=Readonly<{
  security:ResolvedSecurity;
  price:number|null;
  previousClose:number|null;
  change:number|null;
  changePercent:number|null;
  quality:string|null;
  statusMessage:string|null;
}>;

export type HoldingDetailToolData=Readonly<{
  security:ResolvedSecurity;
  held:boolean;
  shares:number;
  avgCost:number;
  marketValue:number;
  pnl:number;
  roi:number;
  cumulativeDividend:number;
  comprehensivePnl:number;
}>;

export type CoreAiAssetSummary=Readonly<{
  totalAssets:number;
  marketValue:number;
  cash:number;
  unrealizedPnl:number;
  realizedPnl:number;
  dividendIncome:number;
  totalReturn:number;
}>;

export type PortfolioSummaryToolData=Readonly<{
  totalAssets:number;
  marketValue:number;
  cash:number;
  unrealizedPnl:number;
  realizedPnl:number;
  dividendIncome:number;
  totalReturn:number;
  holdingCount:number;
}>;

export type TransactionToolRow=Readonly<{
  id:string;
  date:string;
  kind:'buy'|'sell'|'dividend'|'other';
  symbol?:string;
  name?:string;
  shares?:number;
  price?:number;
  cashFlow:number;
  actualFee?:number;
  actualTax?:number;
  label?:string;
}>;

export type TransactionsToolData=Readonly<{
  security:ResolvedSecurity|null;
  limit:number;
  kinds:readonly TransactionToolRow['kind'][];
  rows:readonly TransactionToolRow[];
}>;

export type DividendToolRow=Readonly<{
  id:string;
  date:string;
  symbol:string;
  name:string;
  perShareAmount:number;
  sharesHeld:number;
  netAmount:number;
}>;

export type DividendsToolData=Readonly<{
  security:ResolvedSecurity|null;
  period:'ALL'|'CURRENT_YEAR'|'CURRENT_MONTH';
  totalRecordedNet:number;
  rows:readonly DividendToolRow[];
}>;

export type CoreAiToolRuntime=Readonly<{
  holdings:readonly CoreAiHolding[];
  quotes:readonly CoreAiQuote[];
  session?:AiSessionContext;
  entries?:readonly CanonicalLedgerEntry[];
  assetSummary?:CoreAiAssetSummary;
  resolveSecurity?:(query:string,known:readonly SecurityCandidate[])=>Promise<ResolvedSecurity|null>;
  refreshQuote?:(symbol:string)=>Promise<CoreAiQuote|null>;
}>;

export type CoreAiToolPlan=Readonly<{
  results:readonly AiToolResult<unknown>[];
  session:AiSessionContext;
  resolvedSecurity:ResolvedSecurity|null;
}>;

export const CORE_AI_TOOL_CONTRACTS={
  resolve_security:{name:'resolve_security',version:1,mode:'READ_ONLY'},
  get_quote:{name:'get_quote',version:1,mode:'READ_ONLY'},
  get_holding_detail:{name:'get_holding_detail',version:1,mode:'READ_PRIVATE'},
  get_portfolio_summary:{name:'get_portfolio_summary',version:1,mode:'READ_PRIVATE'},
  get_transactions:{name:'get_transactions',version:1,mode:'READ_PRIVATE'},
  get_dividends:{name:'get_dividends',version:1,mode:'READ_PRIVATE'},
} as const;

const now=()=>new Date().toISOString();
const quoteVerification=(quality:string|null|undefined):'VERIFIED'|'PENDING'|'UNAVAILABLE'=>
  quality==='trade'||quality==='official_close'?'VERIFIED':
  quality?'PENDING':'UNAVAILABLE';

const knownCandidates=(runtime:CoreAiToolRuntime):SecurityCandidate[]=>{
  const rows:SecurityCandidate[]=[];
  const seen=new Set<string>();
  for(const row of [...runtime.holdings,...runtime.quotes]){
    const symbol=row.symbol.trim().toUpperCase();
    if(!symbol||seen.has(symbol))continue;
    seen.add(symbol);
    const market=(row as CoreAiQuote).market;
    rows.push({
      symbol,
      name:row.name||symbol,
      market:market==='TSE'?'TWSE':market==='OTC'?'TPEX':'UNKNOWN',
    });
  }
  return rows;
};

const explicitSymbol=(question:string)=>{
  const candidates=question.toUpperCase().match(/[0-9]{4,6}[A-Z]{0,2}/g)??[];
  return candidates.find(value=>{
    // value is restricted to [0-9A-Z], so it is safe to embed directly in RegExp.
    const looksLikeAmount=new RegExp(value+'\\s*(元|萬|千)').test(question.toUpperCase())
      ||new RegExp('(投入|加碼|金額|預算)\\s*(?:NT\\$|TWD|新台幣)?\\s*'+value,'i').test(question);
    return !looksLikeAmount;
  })??null;
};
const hasMarketIntent=(question:string)=>/(股價|行情|價格|現價|走勢|漲跌|開盤|收盤|今天|現在|最近怎樣|成交)/i.test(question);
const hasHoldingIntent=(question:string)=>/(我有幾張|我有幾股|持有多少|我的持股|成本|我的.*損益|我的.*市值)/i.test(question);
const hasDividendIntent=(question:string)=>/(股息|配息|領息|入金)/i.test(question);
const hasTransactionIntent=(question:string)=>/(交易|買了|買進|買入|賣出|賣掉|最近\s*\d*\s*筆|交易紀錄|帳務紀錄)/i.test(question);
const hasPortfolioSummaryIntent=(question:string,security:ResolvedSecurity|null)=>{
  if(/(總資產|整體資產|投資組合|總損益|總市值|持股市值|資產總覽|整體損益|全部持股)/i.test(question))return true;
  return !security&&/(目前資產|目前損益|目前市值)/i.test(question);
};
const requestedLimit=(question:string,defaultValue=5)=>{
  const value=Number(question.match(/最近\s*(\d{1,2})\s*筆/)?.[1]??defaultValue);
  return Math.max(1,Math.min(50,Number.isFinite(value)?Math.floor(value):defaultValue));
};
const requestedLedgerKinds=(question:string):readonly TransactionToolRow['kind'][]=>{
  if(/(買了|買進|買入)/i.test(question))return ['buy'];
  if(/(賣出|賣掉)/i.test(question))return ['sell'];
  if(/帳務/i.test(question))return ['buy','sell','dividend','other'];
  return ['buy','sell'];
};
const dividendPeriod=(question:string):DividendsToolData['period']=>
  /(本月|這個月)/i.test(question)?'CURRENT_MONTH':
  /(今年|年度)/i.test(question)?'CURRENT_YEAR':'ALL';
const dividendPeriodMatch=(date:string,period:DividendsToolData['period'])=>{
  if(period==='ALL')return true;
  const today=new Date();
  const year=String(today.getFullYear());
  if(period==='CURRENT_YEAR')return date.startsWith(year+'-');
  const month=String(today.getMonth()+1).padStart(2,'0');
  return date.startsWith(year+'-'+month);
};
const hasKnownSecurityHint=(question:string,known:readonly SecurityCandidate[])=>{
  const normalized=question.trim().toUpperCase().replace(/\s+/g,'');
  return known.some(row=>{
    const name=row.name.trim().toUpperCase().replace(/\s+/g,'');
    return name.length>=2&&normalized.includes(name);
  });
};
const looksLikeGeneralKnowledge=(question:string)=>/(什麼是|是什麼|意思|原理|定義|為什麼|如何|怎麼|差別)/i.test(question);
const SECURITY_PREFIX_STOP_WORDS=new Set(['今年','本月','這個月','目前','我的','累積','最近','下一次','下次','總共','全部','整體']);
const hasNamedSecurityPrefix=(question:string)=>{
  const match=question.trim().match(/^([A-Za-z0-9\u4e00-\u9fff]{2,20}?)(?:的)?(?:股價|行情|現價|走勢|漲跌|配息|股息|成本|市值)/i);
  const prefix=match?.[1]?.trim();
  return Boolean(prefix&&!SECURITY_PREFIX_STOP_WORDS.has(prefix));
};
const hasExplicitSecurityHint=(question:string,known:readonly SecurityCandidate[])=>Boolean(explicitSymbol(question))
  ||hasKnownSecurityHint(question,known)
  ||(!looksLikeGeneralKnowledge(question)&&hasNamedSecurityPrefix(question));

function success<T>(tool:string,data:T,source:string,extra:Partial<AiToolResult<T>['meta']>={}):AiToolResult<T>{
  return {ok:true,tool,version:1,data,meta:{source,fetchedAt:now(),...extra}};
}
function failure(tool:string,code:AiToolErrorCode,message:string,retryable=false):AiToolResult<never>{
  return {ok:false,tool,version:1,meta:{source:'APP_TOOL_GATE',fetchedAt:now(),verificationStatus:'UNAVAILABLE'},error:{code,message,retryable}};
}

export async function executeCoreAiReadTools(question:string,runtime:CoreAiToolRuntime):Promise<CoreAiToolPlan>{
  const results:AiToolResult<unknown>[]=[];
  const known=knownCandidates(runtime);
  const resolver=runtime.resolveSecurity??resolveSecurity;
  const previousSecurity=runtime.session?.activeSecurity??null;
  const referenceOnly=/^(那|它|這檔|這個|這支|剛剛|前面|如果|再)/.test(question.trim());
  const explicitPortfolioScope=/(總資產|整體資產|投資組合|全部持股|我的持股|我最近|今年|年度|本月|這個月|交易紀錄|帳務紀錄|最近\s*\d*\s*筆(?:交易|帳務)?)/i.test(question);
  const hasSpecificTargetHint=Boolean(explicitSymbol(question))||hasKnownSecurityHint(question,known)||hasNamedSecurityPrefix(question);
  const contextualProperty=/^(?:目前|現在|我的)?\s*(?:成本|股息|配息|現價|股價|走勢|損益|市值|報酬)/i.test(question.trim());
  const inheritPrevious=Boolean(previousSecurity)
    &&!explicitPortfolioScope
    &&!hasSpecificTargetHint
    &&(referenceOnly||hasHoldingIntent(question)||contextualProperty);
  let security=inheritPrevious?previousSecurity:null;

  if(hasExplicitSecurityHint(question,known)&&!inheritPrevious){
    try{
      const resolved=await resolver(question,known);
      if(resolved){
        security=resolved;
        results.push(success('resolve_security',resolved,'TF_ASSET_SECURITY_RESOLVER'));
      }
    }catch(error){
      results.push(failure('resolve_security','SERVICE_UNAVAILABLE',error instanceof Error?error.message:String(error),true));
    }
  }

  if(!security&&explicitSymbol(question)){
    results.push(failure('resolve_security','SECURITY_NOT_FOUND','目前無法確認這個證券代號。'));
  }

  if(security&&hasMarketIntent(question)){
    let quote=runtime.quotes.find(row=>row.symbol.trim().toUpperCase()===security!.symbol)??null;
    if(runtime.refreshQuote){
      try{quote=await runtime.refreshQuote(security.symbol)??quote;}catch{/* retain last-known-good App quote */}
    }
    if(quote&&Number(quote.currentPrice)>0){
      const price=Number(quote.currentPrice);
      const previous=Number(quote.previousClose??0)>0?Number(quote.previousClose):null;
      const change=previous===null?null:price-previous;
      const changePercent=previous===null?null:change!/previous*100;
      results.push(success<QuoteToolData>('get_quote',{
        security,
        price,
        previousClose:previous,
        change,
        changePercent,
        quality:quote.quality??null,
        statusMessage:quote.statusMessage??null,
      },'TF_ASSET_MARKET_CENTER',{
        ...(quote.sourceQuoteAt?{observedAt:new Date(quote.sourceQuoteAt).toISOString()}:{}),
        verificationStatus:quoteVerification(quote.quality),
      }));
    }else{
      results.push(failure('get_quote','SERVICE_UNAVAILABLE','TF Asset 行情中心目前沒有可用的該標的行情。',true));
    }
  }

  if(security&&hasHoldingIntent(question)){
    const holding=runtime.holdings.find(row=>row.symbol.trim().toUpperCase()===security!.symbol);
    results.push(success<HoldingDetailToolData>('get_holding_detail',{
      security,
      held:Boolean(holding),
      shares:Number(holding?.shares??0),
      avgCost:Number(holding?.avgCost??0),
      marketValue:Number(holding?.marketValue??0),
      pnl:Number(holding?.pnl??0),
      roi:Number(holding?.roi??0),
      cumulativeDividend:Number(holding?.cumulativeDividend??0),
      comprehensivePnl:Number(holding?.comprehensivePnl??0),
    },'CANONICAL_PORTFOLIO_PROJECTION'));
  }

  if(hasPortfolioSummaryIntent(question,security)&&runtime.assetSummary){
    const asset=runtime.assetSummary;
    results.push(success<PortfolioSummaryToolData>('get_portfolio_summary',{
      totalAssets:Number(asset.totalAssets)||0,
      marketValue:Number(asset.marketValue)||0,
      cash:Number(asset.cash)||0,
      unrealizedPnl:Number(asset.unrealizedPnl)||0,
      realizedPnl:Number(asset.realizedPnl)||0,
      dividendIncome:Number(asset.dividendIncome)||0,
      totalReturn:Number(asset.totalReturn)||0,
      holdingCount:runtime.holdings.filter(row=>Number(row.shares)>0).length,
    },'CANONICAL_SHARED_SNAPSHOT',{calculatedAt:now()}));
  }

  if(hasTransactionIntent(question)&&runtime.entries){
    const limit=requestedLimit(question);
    const kinds=requestedLedgerKinds(question);
    const rows=runtime.entries
      .filter(entry=>kinds.includes(entry.kind))
      .filter(entry=>!security||('symbol' in entry&&entry.symbol===security.symbol))
      .slice()
      .sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))
      .slice(0,limit)
      .map((entry):TransactionToolRow=>{
        if(entry.kind==='buy'||entry.kind==='sell')return {
          id:entry.id,date:entry.date,kind:entry.kind,symbol:entry.symbol,name:entry.name,
          shares:entry.shares,price:entry.price,cashFlow:calculateLedgerCashFlow(entry),
          actualFee:entry.actualFee,actualTax:entry.actualTax,
        };
        if(entry.kind==='dividend')return {
          id:entry.id,date:entry.date,kind:'dividend',symbol:entry.symbol,name:entry.name,
          shares:entry.sharesHeld,cashFlow:calculateLedgerCashFlow(entry),
        };
        return {id:entry.id,date:entry.date,kind:'other',label:entry.label,cashFlow:calculateLedgerCashFlow(entry)};
      });
    results.push(success<TransactionsToolData>('get_transactions',{security,limit,kinds,rows},'CANONICAL_LEDGER',{calculatedAt:now()}));
  }

  if(hasDividendIntent(question)&&runtime.entries){
    const period=dividendPeriod(question);
    const rows=runtime.entries
      .filter((entry):entry is Extract<CanonicalLedgerEntry,{kind:'dividend'}>=>entry.kind==='dividend')
      .filter(entry=>!security||entry.symbol===security.symbol)
      .filter(entry=>dividendPeriodMatch(entry.date,period))
      .slice()
      .sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))
      .map((entry):DividendToolRow=>({
        id:entry.id,date:entry.date,symbol:entry.symbol,name:entry.name,
        perShareAmount:entry.perShareAmount,sharesHeld:entry.sharesHeld,
        netAmount:calculateLedgerCashFlow(entry),
      }));
    const totalRecordedNet=rows.reduce((sum,row)=>sum+row.netAmount,0);
    results.push(success<DividendsToolData>('get_dividends',{
      security,period,totalRecordedNet,rows:rows.slice(0,12),
    },'CANONICAL_LEDGER',{calculatedAt:now()}));
  }

  const activeTopic=hasMarketIntent(question)?'MARKET':(hasHoldingIntent(question)||hasDividendIntent(question)||hasTransactionIntent(question)||hasPortfolioSummaryIntent(question,security))?'PORTFOLIO':runtime.session?.activeTopic??'GENERAL';
  const shouldClearPrevious=Boolean(previousSecurity)&&explicitPortfolioScope&&!security;
  const nextSession:AiSessionContext=security
    ?{...runtime.session,activeTopic,activeSecurity:security}
    :shouldClearPrevious
      ?{activeTopic}
      :{...runtime.session,activeTopic};
  return {
    results,
    resolvedSecurity:security,
    session:nextSession,
  };
}

export function localAnswerFromCoreTools(plan:CoreAiToolPlan):string|null{
  const quote=plan.results.find(row=>row.tool==='get_quote'&&row.ok) as AiToolResult<QuoteToolData>|undefined;
  if(quote?.data){
    const {security,price,change,changePercent}=quote.data;
    const parts=[security.symbol+' '+security.name];
    if(price!==null)parts.push('目前可用行情 NT$ '+price.toLocaleString('zh-TW'));
    if(change!==null&&changePercent!==null)parts.push((change>=0?'+':'')+change.toFixed(2)+'（'+(changePercent>=0?'+':'')+changePercent.toFixed(2)+'%）');
    if(quote.meta.observedAt)parts.push('行情時間 '+new Date(quote.meta.observedAt).toLocaleString('zh-TW'));
    if(quote.meta.verificationStatus==='PENDING')parts.push('此筆為行情中心目前較低驗證層級資料，請以狀態標示為準');
    return parts.join('｜')+'。';
  }
  const dividends=plan.results.find(row=>row.tool==='get_dividends'&&row.ok) as AiToolResult<DividendsToolData>|undefined;
  if(dividends?.data){
    const d=dividends.data;
    const scope=d.security?d.security.symbol+' '+d.security.name:'目前帳務';
    const period=d.period==='CURRENT_MONTH'?'本月':d.period==='CURRENT_YEAR'?'今年':'累積';
    return scope+' '+period+'已記錄淨股息 NT$ '+Math.round(d.totalRecordedNet).toLocaleString('zh-TW')+'，共 '+d.rows.length+' 筆可列示紀錄。';
  }
  const transactions=plan.results.find(row=>row.tool==='get_transactions'&&row.ok) as AiToolResult<TransactionsToolData>|undefined;
  if(transactions?.data){
    if(!transactions.data.rows.length)return '目前沒有符合條件的帳務紀錄。';
    const lines=transactions.data.rows.map((row,index)=>{
      const label=row.kind==='buy'?'買進':row.kind==='sell'?'賣出':row.kind==='dividend'?'股息':'現金調整';
      const target=row.symbol?' '+row.symbol+(row.name?' '+row.name:''):'';
      return (index+1)+'. '+row.date+'｜'+label+target+'｜現金流 NT$ '+Math.round(row.cashFlow).toLocaleString('zh-TW');
    });
    return '最近 '+transactions.data.rows.length+' 筆帳務紀錄：\n'+lines.join('\n');
  }
  const portfolio=plan.results.find(row=>row.tool==='get_portfolio_summary'&&row.ok) as AiToolResult<PortfolioSummaryToolData>|undefined;
  if(portfolio?.data){
    const d=portfolio.data;
    return '目前總資產 NT$ '+Math.round(d.totalAssets).toLocaleString('zh-TW')+
      '，持股市值 NT$ '+Math.round(d.marketValue).toLocaleString('zh-TW')+
      '，現金 NT$ '+Math.round(d.cash).toLocaleString('zh-TW')+
      '，總報酬 NT$ '+Math.round(d.totalReturn).toLocaleString('zh-TW')+'。';
  }
  const holding=plan.results.find(row=>row.tool==='get_holding_detail'&&row.ok) as AiToolResult<HoldingDetailToolData>|undefined;
  if(holding?.data){
    const d=holding.data;
    if(!d.held)return d.security.symbol+' '+d.security.name+' 目前不在你的 TF Asset 持股中。';
    return d.security.symbol+' '+d.security.name+' 目前持有 '+d.shares.toLocaleString('zh-TW')+' 股，平均成本 NT$ '+d.avgCost.toLocaleString('zh-TW')+'。';
  }
  return null;
}
