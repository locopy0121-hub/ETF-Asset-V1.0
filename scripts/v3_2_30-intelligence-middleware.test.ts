import assert from 'node:assert/strict';
import fs from 'node:fs';

import {AI_METRIC_REGISTRY,resolveAiRecipe} from '../src/ai/aiRecipeRegistry';
import {buildAiEvidencePackage,createAiIntelligencePlan,localAnswerFromEvidence} from '../src/ai/aiIntelligenceMiddleware';
import type {AiIngredientAcquirer} from '../src/ai/aiIngredientGateway';
import type {AnalysisContext} from '../src/ai/analysisTypes';
import type {CoreAiToolPlan} from '../src/ai/coreAiToolRegistry';
import type {ResolvedSecurity} from '../src/market/securityResolver';

const security=(symbol:string,name:string):ResolvedSecurity=>({
  securityId:'TWSE:'+symbol,
  symbol,
  market:'TWSE',
  name,
  assetType:symbol.startsWith('00')?'ETF':'STOCK',
});

const emptyAnalysis:AnalysisContext={
  generatedAt:'2026-10-01T00:00:00.000Z',
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

const toolPlan=(resolved:ResolvedSecurity|null):CoreAiToolPlan=>({
  results:[],
  resolvedSecurity:resolved,
  session:resolved?{activeTopic:'MARKET',activeSecurity:resolved}:{activeTopic:'GENERAL'},
});

function fakeHistory(symbol:string){
  const rows=[];
  for(let index=0;index<40;index++){
    const day=String(index+1).padStart(2,'0');
    rows.push({
      date:index<30?'2026-08-'+day:'2026-09-'+String(index-29).padStart(2,'0'),
      open:100+index,
      high:101+index,
      low:99+index,
      close:100+index,
      volume:100000+index,
      source:'TWSE' as const,
    });
  }
  return rows;
}

const acquirer:AiIngredientAcquirer={
  fetchHistory:async symbol=>fakeHistory(symbol),
  fetchNews:async(symbol,name)=>[
    {title:symbol+' '+name+' 測試新聞 - 測試來源',source:'測試來源',publishedAt:'2026-09-30T10:00:00+08:00',url:'https://example.com/a'},
  ],
};

async function main(){
  assert.equal(resolveAiRecipe('00977新聞').id,'MARKET_NEWS');
  assert.equal(resolveAiRecipe('00977近期表現').id,'MARKET_PERFORMANCE');
  assert.equal(resolveAiRecipe('0050 跟 006208 比較').id,'ETF_COMPARE');
  assert.equal(resolveAiRecipe('如果把目前 0050 的 30% 換成 006208，會怎樣？').id,'SCENARIO_ANALYSIS');

  assert.deepEqual(AI_METRIC_REGISTRY.PREMIUM_DISCOUNT.requiredIngredients,['MARKET_QUOTE','NAV']);
  assert.ok(AI_METRIC_REGISTRY.TOTAL_RETURN.requiredIngredients.includes('MARKET_DIVIDENDS'));
  assert.ok(AI_METRIC_REGISTRY.CAGR.requiredIngredients.includes('HISTORICAL_PRICES'));
  assert.ok(AI_METRIC_REGISTRY.XIRR.requiredIngredients.includes('TRANSACTIONS'));

  const comparePlan=createAiIntelligencePlan(
    '0050 跟 006208 比較',
    toolPlan(security('0050','元大台灣50')),
  );
  assert.deepEqual(comparePlan.symbols,['0050','006208']);
  assert.ok(comparePlan.requirements.some(row=>row.ingredient==='HISTORICAL_PRICES'&&row.required));

  const performance=await buildAiEvidencePackage({
    question:'00977近期表現',
    toolPlan:toolPlan(security('00977','台新日本半導體')),
    analysisContext:emptyAnalysis,
    newsItems:[],
    acquirer,
  });
  assert.equal(performance.recipeId,'MARKET_PERFORMANCE');
  assert.equal(performance.status,'VERIFIED');
  assert.ok(performance.acquisitionAttempts.some(row=>row.ingredient==='HISTORICAL_PRICES'&&row.status==='FETCHED'));
  assert.equal(performance.metrics.find(row=>row.metric==='PRICE_RETURN')?.status,'VERIFIED');
  assert.equal(performance.metrics.find(row=>row.metric==='ANNUALIZED_VOLATILITY')?.status,'VERIFIED');
  assert.equal(performance.metrics.find(row=>row.metric==='MAX_DRAWDOWN')?.status,'VERIFIED');
  const totalReturn=performance.metrics.find(row=>row.metric==='TOTAL_RETURN');
  assert.equal(totalReturn?.status,'UNAVAILABLE','must not turn price return into total return when market dividends are missing');
  assert.match(totalReturn?.notes?.join(' ')??'',/MARKET_DIVIDENDS/);
  assert.match(localAnswerFromEvidence(performance)??'',/官方歷史行情/);
  assert.match(localAnswerFromEvidence(performance)??'',/未把價格報酬冒充含息總報酬/);

  const news=await buildAiEvidencePackage({
    question:'00977新聞',
    toolPlan:toolPlan(security('00977','台新日本半導體')),
    analysisContext:emptyAnalysis,
    newsItems:[],
    acquirer,
  });
  assert.equal(news.recipeId,'MARKET_NEWS');
  assert.equal(news.status,'PARTIAL','RSS metadata without publisher body must remain partial evidence');
  assert.ok(news.acquisitionAttempts.some(row=>row.ingredient==='MARKET_NEWS'&&row.status==='FETCHED'));
  const newsEvidence=news.ingredients.find(row=>row.ingredient==='MARKET_NEWS');
  assert.equal(newsEvidence?.source,'GOOGLE_NEWS_RSS');
  assert.equal(newsEvidence?.status,'PARTIAL');
  assert.match(localAnswerFromEvidence(news)??'',/正文尚未完成驗證/);

  const middleware=fs.readFileSync('src/ai/aiIntelligenceMiddleware.ts','utf8');
  const registry=fs.readFileSync('src/ai/aiRecipeRegistry.ts','utf8');
  const gemini=fs.readFileSync('src/ai/geminiAssistant.ts','utf8');
  assert.doesNotMatch(middleware,/SELECT\s|INSERT\s|UPDATE\s|DELETE\s/i,'middleware must not bypass repositories with raw SQL');
  assert.match(registry,/MARKET_PERFORMANCE/);
  assert.match(registry,/PREMIUM_DISCOUNT/);
  assert.match(registry,/ANNUALIZED_VOLATILITY/);
  assert.match(registry,/HOLDINGS_OVERLAP/);
  assert.match(gemini,/intelligence:evidence/,'validated evidence must be grounded into the Gemini presentation layer');
  assert.match(gemini,/portfolioDataIsContextOnly/,'prompt must preserve the market-facts vs App-capital-context boundary');
  assert.match(gemini,/localAnswerFromEvidence/,'deterministic evidence must survive Gemini provider failure');

  console.log('V3.2.30 TF Asset Intelligence Middleware / Recipe / Evidence architecture PASS');
}

void main().catch(error=>{console.error(error);process.exitCode=1;});
