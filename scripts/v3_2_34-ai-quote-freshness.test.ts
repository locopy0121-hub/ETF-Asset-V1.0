import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  executeCoreAiReadTools,
  localAnswerFromCoreTools,
  type AiToolResult,
  type QuoteToolData,
} from '../src/ai/coreAiToolRegistry';
import {buildAiEvidencePackage,localAnswerFromEvidence} from '../src/ai/aiIntelligenceMiddleware';
import type {AiIngredientAcquirer} from '../src/ai/aiIngredientGateway';
import type {AnalysisContext} from '../src/ai/analysisTypes';
import type {ResolvedSecurity} from '../src/market/securityResolver';
import {
  REALTIME_QUOTE_FRESHNESS_MS,
  quoteSourceLagMs,
  realtimeQuoteFreshness,
} from '../src/market/quoteFreshness';

const NOW=Date.UTC(2026,9,1,1,17,46); // 2026-10-01 09:17:46 Asia/Taipei
const STALE_SOURCE_AT=Date.UTC(2026,9,1,1,10,3); // 09:10:03, lag 7m43s
const security:ResolvedSecurity={
  securityId:'TWSE:0050',
  symbol:'0050',
  market:'TWSE',
  name:'元大台灣50',
  assetType:'ETF',
};

const analysis:AnalysisContext={
  generatedAt:new Date(NOW).toISOString(),
  targetSymbol:null,
  isCurrentlyHeld:null,
  portfolio:{totalMarketValue:0,holdingCount:0,holdings:[]},
  target:null,
  researchCoverage:[],
  industryExposure:[],
  pairwiseOverlap:[],
  whatIf:null,
  warnings:[],
};

const resolver=async()=>security;

async function quotePlan(sourceQuoteAt:number,quality='trade' as const){
  return executeCoreAiReadTools('0050即時行情',{
    holdings:[],
    quotes:[],
    resolveSecurity:resolver,
    refreshQuote:async()=>({
      symbol:'0050',
      name:'元大台灣50',
      currentPrice:112.25,
      previousClose:112.05,
      sourceQuoteAt,
      checkedAt:NOW,
      quality,
      source:'TWSE_MIS',
      statusMessage:'TWSE MIS z 實際成交價',
      market:'TSE',
    }),
  });
}

async function main(){
  assert.equal(REALTIME_QUOTE_FRESHNESS_MS,120_000);
  assert.equal(quoteSourceLagMs(STALE_SOURCE_AT,NOW),463_000);
  assert.equal(realtimeQuoteFreshness(NOW-1_000,NOW),'FRESH');
  assert.equal(realtimeQuoteFreshness(STALE_SOURCE_AT,NOW),'STALE');
  assert.equal(realtimeQuoteFreshness(null,NOW),'UNKNOWN');

  const stale=await quotePlan(STALE_SOURCE_AT);
  const staleResult=stale.results.find(row=>row.tool==='get_quote'&&row.ok) as AiToolResult<QuoteToolData>|undefined;
  assert.ok(staleResult?.data);
  assert.equal(staleResult?.meta.verificationStatus,'PENDING',
    'a real trade older than the realtime freshness gate must not be advertised as verified realtime');
  assert.equal(staleResult?.meta.freshness,'STALE');
  assert.equal(staleResult?.meta.sourceLagMs,463_000);
  assert.equal(staleResult?.meta.fetchedAt,new Date(NOW).toISOString(),
    'tool fetchedAt must be the market-center query/check time, not the exchange trade time');
  assert.equal(staleResult?.meta.observedAt,new Date(STALE_SOURCE_AT).toISOString());

  const staleCoreText=localAnswerFromCoreTools(stale)??'';
  assert.match(staleCoreText,/查詢時間/);
  assert.match(staleCoreText,/最近成交/);
  assert.match(staleCoreText,/7 分 43 秒/);
  assert.match(staleCoreText,/不標示為即時行情/);
  assert.doesNotMatch(staleCoreText,/行情時間/,'ambiguous single timestamp label must be retired');

  const fresh=await quotePlan(NOW-1_000);
  const freshResult=fresh.results.find(row=>row.tool==='get_quote'&&row.ok);
  assert.equal(freshResult?.meta.verificationStatus,'VERIFIED');
  assert.equal(freshResult?.meta.freshness,'FRESH');

  const close=await executeCoreAiReadTools('0050收盤',{
    holdings:[],
    quotes:[],
    resolveSecurity:resolver,
    refreshQuote:async()=>({
      symbol:'0050',
      name:'元大台灣50',
      currentPrice:112.05,
      previousClose:111.5,
      sourceQuoteAt:NOW-20*60*60*1000,
      checkedAt:NOW,
      quality:'official_close',
      source:'TWSE_DAILY',
      statusMessage:'官方日收盤備援',
      market:'TSE',
    }),
  });
  const closeResult=close.results.find(row=>row.tool==='get_quote'&&row.ok);
  assert.equal(closeResult?.meta.verificationStatus,'VERIFIED',
    'official close is a dated close fact and must not be invalidated by the realtime trade-age gate');

  const staleAcquirer:AiIngredientAcquirer={
    fetchQuote:async()=>({
      symbol:'0050',
      name:'元大台灣50',
      price:112.25,
      previousClose:112.05,
      source:'TWSE_MIS',
      market:'TWSE',
      sourceQuoteAt:STALE_SOURCE_AT,
      checkedAt:NOW,
      quality:'trade',
      statusMessage:'TWSE MIS z 實際成交價。',
    }),
    fetchHistory:async()=>[],
    fetchNews:async()=>[],
  };
  const evidence=await buildAiEvidencePackage({
    question:'0050即時行情',
    toolPlan:stale,
    analysisContext:analysis,
    newsItems:[],
    acquirer:staleAcquirer,
  });
  const quote=evidence.ingredients.find(row=>row.ingredient==='MARKET_QUOTE'&&row.symbol==='0050');
  assert.equal(quote?.status,'PARTIAL',
    'a fresh HTTP check of an old trade must remain partial rather than laundering it into verified realtime');
  assert.equal(quote?.details?.freshness,'STALE');
  assert.equal(quote?.details?.sourceLagMs,463_000);
  assert.ok(evidence.missingRequired.includes('MARKET_QUOTE'));

  const evidenceText=localAnswerFromEvidence(evidence)??'';
  assert.match(evidenceText,/最近可核實成交 NT\$ 112\.25/);
  assert.match(evidenceText,/查詢時間/);
  assert.match(evidenceText,/最近成交/);
  assert.match(evidenceText,/7 分 43 秒/);
  assert.match(evidenceText,/不標示為即時行情/);

  const assistant=fs.readFileSync('src/ai/geminiAssistant.ts','utf8');
  assert.match(assistant,/checkedAt:snapshot\.queriedAt\?\?row\.checkedAt/,
    'AI refresh adapter must preserve Market Center queriedAt separately from sourceQuoteAt');

  console.log('V3.2.34 AI quote freshness / query-time vs trade-time gate PASS');
}

void main().catch(error=>{console.error(error);process.exitCode=1;});
