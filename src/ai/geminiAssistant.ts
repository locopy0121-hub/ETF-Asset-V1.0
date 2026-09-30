import type {AiNewsItem} from './AiNewsRuntime';
import {answerAiQuestion,type AiAssistantAnswer} from './aiAssistant';
import type {CanonicalLedgerEntry} from '../finance/canonicalLedger';
import type {RuntimeQuote} from '../finance/financeSeed';
import {buildAnalysisContext,extractInvestmentAmount,extractTargetSymbol} from './buildAnalysisContext';
import {executeLocalAiTool,GEMINI_LOCAL_TOOLS,type LocalAiToolCall} from './aiTools';
import {TF_ASSET_GEMINI_SYSTEM_INSTRUCTION} from './prompts';
import type {AiHoldingProjection,AnalysisContext} from './analysisTypes';

const GEMINI_ENDPOINT='https://etf-butler-ai.locopy0121.workers.dev/';
const REQUEST_TIMEOUT_MS=15000;
const MAX_TOOL_CALLS=4;

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

function buildSnapshot(
  holdings:readonly HoldingLike[],
  portfolio:PortfolioLike,
  newsItems:readonly AiNewsItem[],
  entries:readonly CanonicalLedgerEntry[],
  quotes:readonly RuntimeQuote[],
){
  return {
    generatedAt:new Date().toISOString(),
    portfolio,
    holdings:holdings.map(row=>({
      symbol:row.symbol,name:row.name,shares:row.shares,price:row.price,
      marketValue:row.marketValue,pnl:row.pnl,roi:row.roi,avgCost:row.avgCost,
      weight:row.weight,cumulativeDividend:row.cumulativeDividend,
      realizedPnl:row.realizedPnl,comprehensivePnl:row.comprehensivePnl,
    })),
    market:quotes.slice(0,60).map(row=>({
      symbol:row.symbol,name:row.name,currentPrice:row.currentPrice,
      previousClose:row.previousClose,quality:row.quality??null,source:row.source??null,
      sourceQuoteAt:row.sourceQuoteAt??null,statusMessage:row.statusMessage??null,
      intradayDate:row.intradayDate??null,
      intradayPoints:(row.intraday??[]).slice(-180).map(point=>({at:point.at,price:point.price})),
    })),
    ledger:entries.slice(-40),
    news:newsItems.slice(0,20).map(item=>({
      symbol:item.symbol,title:item.title,source:item.source,publishedAt:item.publishedAt,
      summary:item.summary,summaryStatus:item.summaryStatus,url:item.url,
    })),
  };
}

function toHoldingProjection(holdings:readonly HoldingLike[]):AiHoldingProjection[]{
  return holdings.map(row=>({
    symbol:row.symbol,
    name:row.name,
    shares:Number(row.shares)||0,
    avgCost:Number(row.avgCost)||0,
    marketPrice:Number(row.price)||0,
    marketValue:Number(row.marketValue)||0,
    pnl:Number(row.pnl)||0,
    roi:Number(row.roi)||0,
    portfolioWeight:Number(row.weight)||0,
  }));
}

function extractText(payload:unknown):string{
  if(typeof payload==='string')return payload.trim();
  if(!payload||typeof payload!=='object')return '';
  const obj=payload as Record<string,unknown>;
  for(const key of ['text','answer','response','message','output']){
    const value=obj[key];
    if(typeof value==='string'&&value.trim())return value.trim();
  }
  const candidates=obj.candidates;
  if(Array.isArray(candidates)){
    const parts=(candidates[0] as any)?.content?.parts;
    if(Array.isArray(parts)){
      const text=parts.map((part:any)=>typeof part?.text==='string'?part.text:'').join('\n').trim();
      if(text)return text;
    }
  }
  return '';
}

function parseArgs(value:unknown):Record<string,unknown>{
  if(value&&typeof value==='object'&&!Array.isArray(value))return value as Record<string,unknown>;
  if(typeof value==='string'){
    try{
      const parsed=JSON.parse(value);
      return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed as Record<string,unknown>:{};
    }catch{return {};}
  }
  return {};
}

function extractToolCalls(payload:unknown):LocalAiToolCall[]{
  if(!payload||typeof payload!=='object')return [];
  const obj=payload as any;
  const calls:LocalAiToolCall[]=[];
  const add=(name:unknown,args:unknown)=>{
    if(typeof name!=='string'||!name.trim())return;
    calls.push({name:name.trim(),args:parseArgs(args)});
  };
  if(Array.isArray(obj.toolCalls)){
    for(const call of obj.toolCalls){
      add(call?.name??call?.function?.name,call?.args??call?.arguments??call?.function?.arguments);
    }
  }
  if(obj.functionCall)add(obj.functionCall.name,obj.functionCall.args??obj.functionCall.arguments);
  const parts=obj?.candidates?.[0]?.content?.parts;
  if(Array.isArray(parts)){
    for(const part of parts){
      const call=part?.functionCall??part?.function_call;
      if(call)add(call.name,call.args??call.arguments);
    }
  }
  return calls.slice(0,MAX_TOOL_CALLS);
}

async function postGemini(body:Record<string,unknown>):Promise<unknown>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{
    const response=await fetch(GEMINI_ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      signal:controller.signal,
      body:JSON.stringify(body),
    });
    if(!response.ok)throw new Error('Gemini HTTP '+response.status);
    const raw=await response.text();
    try{return JSON.parse(raw);}catch{return raw;}
  }finally{
    clearTimeout(timer);
  }
}

async function requestGemini(
  question:string,
  snapshot:ReturnType<typeof buildSnapshot>,
  analysisContext:AnalysisContext,
):Promise<string>{
  const basePayload={
    provider:'gemini',
    app:'TF Asset',
    locale:'zh-TW',
    instruction:TF_ASSET_GEMINI_SYSTEM_INSTRUCTION,
    snapshot,
    analysisContext,
    tools:GEMINI_LOCAL_TOOLS,
  };
  const first=await postGemini({
    ...basePayload,
    message:question,
    prompt:question,
  });
  const toolCalls=extractToolCalls(first);
  if(!toolCalls.length){
    const text=extractText(first);
    if(!text)throw new Error('Gemini 未回傳可用文字');
    return text;
  }

  const toolResults=[] as Array<{name:string;args:Record<string,unknown>;result?:unknown;error?:string}>;
  for(const call of toolCalls){
    try{
      toolResults.push({name:call.name,args:call.args,result:await executeLocalAiTool(call)});
    }catch(error){
      toolResults.push({name:call.name,args:call.args,error:error instanceof Error?error.message:String(error)});
    }
  }
  const finalPrompt=[
    question,
    '',
    '以下 Tool Result 由 TF Asset 手機本機 SQLite 執行後回傳；只能使用這些結果，不得自行補造成分資料：',
    JSON.stringify(toolResults),
    '',
    '現在請直接回答使用者原問題。若 Tool Result 為空或 error，明確說本機資料不足。',
  ].join('\n');
  const second=await postGemini({
    ...basePayload,
    message:question,
    prompt:finalPrompt,
    toolResults,
  });
  const text=extractText(second);
  if(!text)throw new Error('Gemini Tool Call 後未回傳可用文字');
  return text;
}

export async function answerWithGemini(
  question:string,
  holdings:readonly HoldingLike[],
  portfolio:PortfolioLike,
  newsItems:readonly AiNewsItem[],
  entries:readonly CanonicalLedgerEntry[]=[],
  quotes:readonly RuntimeQuote[]=[],
):Promise<AiAssistantAnswer>{
  const local=await answerAiQuestion(question,holdings,portfolio,newsItems,entries);

  // Canonical write-related flows remain deterministic and local.
  if(local.intent==='dividend-update')return local;

  try{
    const targetSymbol=extractTargetSymbol(question);
    const investmentAmount=extractInvestmentAmount(question);
    const researchEnabled=Boolean(targetSymbol)||/(成分|重複|曝險|產業|比較|分析|what[- ]?if|模擬)/i.test(question);
    const analysisContext=await buildAnalysisContext({
      targetSymbol,
      investmentAmount,
      holdings:toHoldingProjection(holdings),
      totalMarketValue:Number(portfolio.totalMarketValue)||0,
      topN:100,
      researchEnabled,
    });
    const text=await requestGemini(
      question,
      buildSnapshot(holdings,portfolio,newsItems,entries,quotes),
      analysisContext,
    );
    return {...local,text};
  }catch(error){
    const reason=error instanceof Error?error.message:String(error);
    return {
      ...local,
      text:local.text+'\n\n（Gemini／本機分析層暫時無法完成，已改用 TF Asset 本機資料引擎。'+reason+'）',
    };
  }
}

export const GEMINI_ASSISTANT_ENDPOINT=GEMINI_ENDPOINT;
