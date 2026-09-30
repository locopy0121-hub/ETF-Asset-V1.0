import type {AiNewsItem} from './AiNewsRuntime';
import {answerAiQuestion,type AiAssistantAnswer} from './aiAssistant';
import type {CanonicalLedgerEntry} from '../finance/canonicalLedger';
import type {RuntimeQuote} from '../finance/financeSeed';

const GEMINI_ENDPOINT='https://etf-butler-ai.locopy0121.workers.dev/';
const REQUEST_TIMEOUT_MS=15000;

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

async function requestGemini(question:string,snapshot:ReturnType<typeof buildSnapshot>):Promise<string>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{
    const instruction=[
      '你是 TF Asset 資產管家的 Gemini AI 助理。',
      '請使用繁體中文，先直接回答使用者問題，不要重複整份持股摘要。',
      '凡涉及使用者持股、損益、成本、行情、交易、股息、新聞或日期，僅能使用 snapshot 內實際資料；資料不足就明確說目前資料中心沒有該欄位，不得猜測。',
      '可以回答一般金融知識與 App 操作說明，但不得把一般知識冒充成使用者即時資料。',
      '涉及新增、刪除、修改帳務資料時，不得自行宣稱已完成，實際寫入仍由 TF Asset 本機流程確認。',
      '回覆盡量精簡，優先給結論、關鍵數字與必要原因。',
    ].join('\n');
    const response=await fetch(GEMINI_ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      signal:controller.signal,
      body:JSON.stringify({
        provider:'gemini',
        app:'TF Asset',
        locale:'zh-TW',
        message:question,
        prompt:question,
        instruction,
        snapshot,
      }),
    });
    if(!response.ok)throw new Error('Gemini HTTP '+response.status);
    const raw=await response.text();
    let payload:unknown=raw;
    try{payload=JSON.parse(raw);}catch{}
    const text=extractText(payload);
    if(!text)throw new Error('Gemini 未回傳可用文字');
    return text;
  }finally{
    clearTimeout(timer);
  }
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
    const text=await requestGemini(question,buildSnapshot(holdings,portfolio,newsItems,entries,quotes));
    return {...local,text};
  }catch(error){
    const reason=error instanceof Error?error.message:String(error);
    return {
      ...local,
      text:local.text+'\n\n（Gemini 暫時無法連線，已改用 TF Asset 本機資料引擎。'+reason+'）',
    };
  }
}

export const GEMINI_ASSISTANT_ENDPOINT=GEMINI_ENDPOINT;
