import assert from 'node:assert/strict';
import fs from 'node:fs';

import {buildAiEvidencePackage,localAnswerFromEvidence} from '../src/ai/aiIntelligenceMiddleware';
import {decideAiResponse} from '../src/ai/aiResponseArbitration';
import {validateIngredientEvidence} from '../src/ai/aiIngredientCatalog';
import type {AiIngredientAcquirer} from '../src/ai/aiIngredientGateway';
import type {AnalysisContext} from '../src/ai/analysisTypes';
import type {CoreAiToolPlan} from '../src/ai/coreAiToolRegistry';
import type {ResolvedSecurity} from '../src/market/securityResolver';

const security:ResolvedSecurity={
  securityId:'TWSE:0050',
  symbol:'0050',
  market:'TWSE',
  name:'元大台灣50',
  assetType:'ETF',
};

const analysis:AnalysisContext={
  generatedAt:'2026-10-01T08:00:00+08:00',
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

const pendingQuotePlan:CoreAiToolPlan={
  results:[{
    ok:true,
    tool:'get_quote',
    version:1,
    data:{
      security,
      price:65,
      previousClose:64.5,
      change:0.5,
      changePercent:0.775193798,
      quality:'backup_realtime',
      statusMessage:'備援行情，待官方成交驗證',
    },
    meta:{
      source:'TF_ASSET_MARKET_CENTER',
      fetchedAt:'2026-10-01T08:00:00+08:00',
      observedAt:'2026-10-01T08:00:00+08:00',
      verificationStatus:'PENDING',
    },
  }],
  session:{activeTopic:'MARKET',activeSecurity:security},
  resolvedSecurity:security,
};

const emptyPlan:CoreAiToolPlan={
  results:[],
  session:{activeTopic:'MARKET',activeSecurity:security},
  resolvedSecurity:security,
};

const baseAcquirer:AiIngredientAcquirer={
  fetchQuote:async()=>({
    symbol:'0050',
    name:'元大台灣50',
    price:65.1,
    previousClose:64.5,
    source:'TWSE_MIS',
    market:'TWSE',
    sourceQuoteAt:Date.parse('2026-10-01T08:00:00+08:00'),
    checkedAt:Date.parse('2026-10-01T08:00:01+08:00'),
    quality:'trade',
    statusMessage:'TWSE MIS z 實際成交價。',
  }),
  fetchHistory:async()=>[],
  fetchNews:async()=>[],
};

const shortHistory=Array.from({length:5},(_,index)=>({
  date:'2026-09-'+String(index+1).padStart(2,'0'),
  open:60+index,
  high:61+index,
  low:59+index,
  close:60+index,
  volume:100000+index,
  source:'TWSE' as const,
}));

async function main(){
  const quote=await buildAiEvidencePackage({
    question:'0050股價',
    toolPlan:pendingQuotePlan,
    analysisContext:analysis,
    newsItems:[],
    acquirer:baseAcquirer,
  });
  const quoteEvidence=quote.ingredients.find(row=>row.ingredient==='MARKET_QUOTE'&&row.symbol==='0050');
  assert.equal(quoteEvidence?.status,'VERIFIED');
  assert.equal(quoteEvidence?.source,'TWSE_MIS');
  assert.equal(quoteEvidence?.details?.price,65.1);
  assert.ok(!quote.validationIssues?.some(issue=>issue.ingredient==='MARKET_QUOTE'));
  const decision=decideAiResponse(pendingQuotePlan,quote);
  assert.equal(decision.route,'LOCAL_EVIDENCE','verified replenished quote must beat pending core quote');
  assert.match(decision.text??'',/65\.1/);
  assert.match(decision.text??'',/TWSE_MIS/);

  const noTradeAcquirer:AiIngredientAcquirer={
    ...baseAcquirer,
    fetchQuote:async()=>({
      symbol:'0050',
      name:'元大台灣50',
      price:null,
      previousClose:64.5,
      source:'TWSE_MIS',
      market:'TWSE',
      sourceQuoteAt:Date.parse('2026-10-01T07:59:00+08:00'),
      checkedAt:Date.parse('2026-10-01T08:00:01+08:00'),
      quality:'diagnostic',
      statusMessage:'TWSE MIS 已回傳標的，但目前沒有 z 實際成交價；不可把昨收或買賣價冒充現價。',
    }),
  };
  const noTrade=await buildAiEvidencePackage({
    question:'0050股價',
    toolPlan:emptyPlan,
    analysisContext:analysis,
    newsItems:[],
    acquirer:noTradeAcquirer,
  });
  assert.ok(noTrade.missingRequired.includes('MARKET_QUOTE'));
  assert.ok(noTrade.validationIssues?.some(issue=>issue.ingredient==='MARKET_QUOTE'&&issue.code==='STATUS_TOO_LOW'));
  assert.ok(noTrade.validationIssues?.some(issue=>issue.ingredient==='MARKET_QUOTE'&&issue.code==='INVALID_VALUE'));
  const noTradeText=localAnswerFromEvidence(noTrade)??'';
  assert.match(noTradeText,/不會把昨收、委買或委賣價格冒充現價/);

  const shortHistoryEvidence=await buildAiEvidencePackage({
    question:'0050近期表現',
    toolPlan:emptyPlan,
    analysisContext:analysis,
    newsItems:[],
    acquirer:{...baseAcquirer,fetchHistory:async()=>shortHistory},
  });
  assert.ok(shortHistoryEvidence.missingRequired.includes('HISTORICAL_PRICES'));
  assert.ok(shortHistoryEvidence.validationIssues?.some(issue=>issue.ingredient==='HISTORICAL_PRICES'&&issue.code==='INSUFFICIENT_ITEMS'));
  const priceReturn=shortHistoryEvidence.metrics.find(row=>row.metric==='PRICE_RETURN');
  assert.equal(priceReturn?.status,'UNAVAILABLE','short history must not produce deterministic performance metrics');

  const partialNewsIssues=validateIngredientEvidence({
    ingredient:'MARKET_NEWS',required:true,purpose:'news',minItems:1,
  },{
    ingredient:'MARKET_NEWS',symbol:'0050',status:'PARTIAL',source:'GOOGLE_NEWS_RSS',
    fetchedAt:new Date().toISOString(),observedAt:new Date().toISOString(),
    summary:'headline only',details:{items:[{title:'0050 news'}]},
  });
  assert.equal(partialNewsIssues.length,0,'headline-only news may be used only at PARTIAL evidence level');

  const partialQuoteIssues=validateIngredientEvidence({
    ingredient:'MARKET_QUOTE',required:true,purpose:'quote',
  },{
    ingredient:'MARKET_QUOTE',symbol:'0050',status:'PARTIAL',source:'TWSE_MIS',
    fetchedAt:new Date().toISOString(),summary:'no trade',
    details:{price:null},
  });
  assert.ok(partialQuoteIssues.some(issue=>issue.code==='STATUS_TOO_LOW'));
  assert.ok(partialQuoteIssues.some(issue=>issue.code==='INVALID_VALUE'));

  const gateway=fs.readFileSync('src/ai/aiIngredientGateway.ts','utf8');
  const middleware=fs.readFileSync('src/ai/aiIntelligenceMiddleware.ts','utf8');
  const catalog=fs.readFileSync('src/ai/aiIngredientCatalog.ts','utf8');
  assert.match(gateway,/fetchOfficialMarketProbe/);
  assert.match(middleware,/evidenceSatisfiesIngredient\('MARKET_QUOTE'/);
  assert.match(catalog,/defaultMinItems:20/);
  assert.match(catalog,/minimumStatus:'VERIFIED'/);

  console.log('V3.2.33 AI material catalog / replenishment / validation gate PASS');
}

void main().catch(error=>{console.error(error);process.exitCode=1;});
