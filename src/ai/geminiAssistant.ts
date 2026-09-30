import type {AiNewsItem} from './AiNewsRuntime';
import {answerAiQuestion,type AiAssistantAnswer} from './aiAssistant';
import type {CanonicalLedgerEntry} from '../finance/canonicalLedger';
import type {RuntimeQuote} from '../finance/financeSeed';
import {buildAnalysisContext,extractInvestmentAmount,extractTargetSymbol} from './buildAnalysisContext';
import {TF_ASSET_GEMINI_SYSTEM_INSTRUCTION} from './prompts';
import type {AiHoldingProjection,AnalysisContext} from './analysisTypes';

const GEMINI_ENDPOINT='https://etf-butler-ai.locopy0121.workers.dev/';
const REQUEST_TIMEOUT_MS=15000;

export type GeminiDiagnostic=Readonly<{
  at:string;
  endpoint:string;
  method:'POST';
  requestKeys:readonly string[];
  payloadBytes:number;
  status:number|null;
  statusText:string|null;
  responseContentType:string|null;
  responseBodyPreview:string;
  stage:'request'|'response'|'network-error';
}>;

type DiagnosticSink=(diagnostic:GeminiDiagnostic)=>void;

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

async function postGemini(body:Record<string,unknown>,onDiagnostic?:DiagnosticSink):Promise<unknown>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  const serialized=JSON.stringify(body);
  const base={
    at:new Date().toISOString(),
    endpoint:GEMINI_ENDPOINT,
    method:'POST' as const,
    requestKeys:Object.keys(body),
    payloadBytes:new TextEncoder().encode(serialized).length,
  };
  onDiagnostic?.({...base,status:null,statusText:null,responseContentType:null,responseBodyPreview:'',stage:'request'});
  let receivedResponse=false;
  try{
    const response=await fetch(GEMINI_ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      signal:controller.signal,
      body:serialized,
    });
    receivedResponse=true;
    const raw=await response.text();
    const contentType=response.headers.get('content-type');
    onDiagnostic?.({
      ...base,
      status:response.status,
      statusText:response.statusText||null,
      responseContentType:contentType,
      responseBodyPreview:raw.replace(/\s+/g,' ').trim().slice(0,1800),
      stage:'response',
    });
    if(!response.ok)throw new Error('Gemini HTTP '+response.status+(raw.trim()?': '+raw.replace(/\s+/g,' ').trim().slice(0,240):''));
    try{return JSON.parse(raw);}catch{return raw;}
  }catch(error){
    if(!receivedResponse)onDiagnostic?.({
      ...base,status:null,statusText:null,responseContentType:null,
      responseBodyPreview:error instanceof Error?error.message:String(error),
      stage:'network-error',
    });
    throw error;
  }finally{
    clearTimeout(timer);
  }
}

async function requestGemini(
  question:string,
  snapshot:ReturnType<typeof buildSnapshot>,
  analysisContext:AnalysisContext,
  onDiagnostic?:DiagnosticSink,
):Promise<string>{
  // The deployed Cloudflare Worker currently accepts the established request envelope
  // (provider/app/locale/message/prompt/instruction/snapshot). Do not add root-level
  // Gemini SDK fields here: strict Worker validation returns HTTP 400 for unknown keys.
  //
  // Local SQLite lookups are already executed by buildAnalysisContext before this call.
  // Embed those verified App-side results inside snapshot so Gemini can reason over them
  // without the Worker or Gemini ever touching SQLite.
  const groundedSnapshot={
    ...snapshot,
    aiAnalysis:{
      mode:'app_local_preflight',
      authority:{
        portfolio:'Canonical Finance Core / Portfolio Projection',
        market:'TF Asset Market Center SQLite',
        research:'TF Asset local ETF Research SQLite',
      },
      analysisContext,
    },
  };
  const payload=await postGemini({
    provider:'gemini',
    app:'TF Asset',
    locale:'zh-TW',
    message:question,
    prompt:question,
    instruction:TF_ASSET_GEMINI_SYSTEM_INSTRUCTION,
    snapshot:groundedSnapshot,
  },onDiagnostic);
  const text=extractText(payload);
  if(!text)throw new Error('Gemini 未回傳可用文字');
  return text;
}

export async function answerWithGemini(
  question:string,
  holdings:readonly HoldingLike[],
  portfolio:PortfolioLike,
  newsItems:readonly AiNewsItem[],
  entries:readonly CanonicalLedgerEntry[]=[],
  quotes:readonly RuntimeQuote[]=[],
  onDiagnostic?:DiagnosticSink,
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
      onDiagnostic,
    );
    return {...local,text};
  }catch(error){
    const reason=error instanceof Error?error.message:String(error);
    return {
      ...local,
      text:local.text+'\n\n（Gemini 暫時無法完成，已改用 TF Asset 本機資料引擎。'+reason+'）',
    };
  }
}

export const GEMINI_ASSISTANT_ENDPOINT=GEMINI_ENDPOINT;
