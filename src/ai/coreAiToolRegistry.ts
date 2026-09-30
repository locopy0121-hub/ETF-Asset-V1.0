import type {ResolvedSecurity,SecurityCandidate} from '../market/securityResolver';
import {resolveSecurity} from '../market/securityResolver';
import type {AiSessionContext} from './aiConversationTypes';

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

export type CoreAiToolRuntime=Readonly<{
  holdings:readonly CoreAiHolding[];
  quotes:readonly CoreAiQuote[];
  session?:AiSessionContext;
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

const explicitSymbol=(question:string)=>question.toUpperCase().match(/[0-9]{4,6}[A-Z]{0,2}/)?.[0]??null;
const hasMarketIntent=(question:string)=>/(股價|行情|價格|現價|走勢|漲跌|開盤|收盤|今天|現在|最近怎樣|成交)/i.test(question);
const hasHoldingIntent=(question:string)=>/(我有幾張|我有幾股|持有多少|我的持股|成本|我的.*損益|我的.*市值)/i.test(question);
const hasExplicitSecurityHint=(question:string)=>Boolean(explicitSymbol(question))
  ||/(股票|ETF|股價|行情|現價|配息|股息|幾張|幾股|成本|市值)/i.test(question)
  ||(question.trim().length>=2&&question.trim().length<=12&&/[\u4e00-\u9fff]/.test(question));

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
  let security=runtime.session?.activeSecurity??null;

  if(hasExplicitSecurityHint(question)){
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
        observedAt:quote.sourceQuoteAt?new Date(quote.sourceQuoteAt).toISOString():undefined,
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

  const activeTopic=hasMarketIntent(question)?'MARKET':hasHoldingIntent(question)?'PORTFOLIO':runtime.session?.activeTopic??'GENERAL';
  return {
    results,
    resolvedSecurity:security,
    session:{...runtime.session,activeTopic,...(security?{activeSecurity:security}:{})},
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
  const holding=plan.results.find(row=>row.tool==='get_holding_detail'&&row.ok) as AiToolResult<HoldingDetailToolData>|undefined;
  if(holding?.data){
    const d=holding.data;
    if(!d.held)return d.security.symbol+' '+d.security.name+' 目前不在你的 TF Asset 持股中。';
    return d.security.symbol+' '+d.security.name+' 目前持有 '+d.shares.toLocaleString('zh-TW')+' 股，平均成本 NT$ '+d.avgCost.toLocaleString('zh-TW')+'。';
  }
  return null;
}
