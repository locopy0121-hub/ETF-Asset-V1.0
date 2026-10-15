import assert from 'node:assert/strict';
import fs from 'node:fs';

import {resolveAiRecipe} from '../src/ai/aiRecipeRegistry';
import {buildAiEvidencePackage,localAnswerFromEvidence} from '../src/ai/aiIntelligenceMiddleware';
import type {AiIngredientAcquirer} from '../src/ai/aiIngredientGateway';
import type {AnalysisContext} from '../src/ai/analysisTypes';
import type {CoreAiToolPlan} from '../src/ai/coreAiToolRegistry';
import type {ResolvedSecurity} from '../src/market/securityResolver';

const listed=(symbol:string,name:string):ResolvedSecurity=>({
  securityId:'TWSE:'+symbol,symbol,market:'TWSE',name,assetType:'ETF',
});
const unknown=(symbol:string):ResolvedSecurity=>({
  securityId:'TW:'+symbol,symbol,market:'UNKNOWN',name:symbol,assetType:'ETF',
});
const toolPlan=(resolved:ResolvedSecurity|null):CoreAiToolPlan=>({
  results:[],
  resolvedSecurity:resolved,
  session:resolved?{activeTopic:'RESEARCH',activeSecurity:resolved}:{activeTopic:'GENERAL'},
});
const analysis:AnalysisContext={
  generatedAt:'2026-10-01T00:56:00+08:00',
  targetSymbol:null,isCurrentlyHeld:null,
  portfolio:{totalMarketValue:0,holdingCount:0,holdings:[]},
  target:null,researchCoverage:[],industryExposure:[],pairwiseOverlap:[],whatIf:null,warnings:[],
};

function history(symbol:string){
  return Array.from({length:30},(_,index)=>({
    date:'2026-09-'+String(index+1).padStart(2,'0'),
    open:10+index*0.02,high:10.1+index*0.02,low:9.9+index*0.02,close:10+index*0.02,
    volume:100000+index,source:'TWSE' as const,
  }));
}

const acquirer:AiIngredientAcquirer={
  fetchHistory:async symbol=>symbol==='00496A'?[]:history(symbol),
  fetchNews:async(symbol,name)=>[
    {
      title:symbol+' '+name+' 掛牌題材新聞 - 測試財經',
      source:'測試財經',
      publishedAt:'2026-09-30T03:30:00Z',
      url:'https://example.com/article',
      publisherUrl:'https://example.com/article',
      articleBodyVerified:true,
      highlights:[
        symbol+' 近期完成募集，市場關注後續掛牌時程與投資策略。',
        '本文第二段為真實出版社正文摘要測試，不由標題自行延伸。',
      ],
    },
  ],
  fetchSecurityProfile:async(symbol,name)=>symbol==='00415A'?{
    symbol,
    name:name===symbol?'主動群益核心50':name,
    listingDate:'2026-10-20',
    status:'PRELISTING',
    source:'TEST_PUBLISHER',
    sourceUrl:'https://example.com/profile',
    publishedAt:'2026-09-30T03:30:00Z',
    articleBodyVerified:true,
    evidenceText:'00415A 主動群益核心50 預計 2026年10月20日掛牌上市。',
  }:null,
};

async function main(){
  assert.equal(resolveAiRecipe('00415A上市').id,'SECURITY_PROFILE');
  assert.equal(resolveAiRecipe('00415A何時掛牌').id,'SECURITY_PROFILE');
  assert.equal(resolveAiRecipe('預估00496A今年年化').id,'MARKET_PERFORMANCE');
  assert.equal(resolveAiRecipe('00406A與00406A比較').id,'ETF_COMPARE');

  const upcoming=await buildAiEvidencePackage({
    question:'00415A上市',
    toolPlan:toolPlan(unknown('00415A')),
    analysisContext:analysis,
    newsItems:[],
    acquirer,
  });
  assert.equal(upcoming.recipeId,'SECURITY_PROFILE');
  const profile=upcoming.ingredients.find(row=>row.ingredient==='SECURITY_PROFILE');
  assert.equal(profile?.status,'VERIFIED');
  assert.equal(profile?.details?.listingDate,'2026-10-20');
  const upcomingText=localAnswerFromEvidence(upcoming)??'';
  assert.match(upcomingText,/00415A/);
  assert.match(upcomingText,/2026-10-20/);
  assert.doesNotMatch(upcomingText,/Gemini.*無法|對話服務/i);

  const invalidAnnualized=await buildAiEvidencePackage({
    question:'預估00496A今年年化',
    toolPlan:toolPlan(unknown('00496A')),
    analysisContext:analysis,
    newsItems:[],
    acquirer,
  });
  const identity=invalidAnnualized.ingredients.find(row=>row.ingredient==='SECURITY_IDENTITY');
  assert.equal(identity?.status,'PARTIAL','unknown symbol must not be upgraded to verified listed identity');
  const annualizedText=localAnswerFromEvidence(invalidAnnualized)??'';
  assert.match(annualizedText,/無法在官方已上市目錄中確認/);
  assert.match(annualizedText,/不能可靠估算今年年化/);
  assert.doesNotMatch(annualizedText,/Gemini.*無法|稍後再重試/i);

  const news=await buildAiEvidencePackage({
    question:'00415A新聞',
    toolPlan:toolPlan(unknown('00415A')),
    analysisContext:analysis,
    newsItems:[],
    acquirer,
  });
  const newsEvidence=news.ingredients.find(row=>row.ingredient==='MARKET_NEWS');
  assert.equal(newsEvidence?.status,'VERIFIED');
  const newsText=localAnswerFromEvidence(news)??'';
  assert.match(newsText,/出版社正文/);
  assert.match(newsText,/真實出版社正文摘要測試/);
  assert.doesNotMatch(newsText,/GMT/,'fallback must present user-local readable time, not raw GMT strings');

  const selfCompare=await buildAiEvidencePackage({
    question:'00406A與00406A比較',
    toolPlan:toolPlan(listed('00406A','主動中信台灣收益')),
    analysisContext:analysis,
    newsItems:[],
    acquirer,
  });
  const compareText=localAnswerFromEvidence(selfCompare)??'';
  assert.match(compareText,/同一標的/);
  assert.match(compareText,/另一檔 ETF/);

  const twoCompare=await buildAiEvidencePackage({
    question:'00406A與0050比較',
    toolPlan:toolPlan(listed('00406A','主動中信台灣收益')),
    analysisContext:analysis,
    newsItems:[],
    acquirer,
  });
  const twoText=localAnswerFromEvidence(twoCompare)??'';
  assert.match(twoText,/同一套公式／市場資料口徑比較/);
  assert.match(twoText,/00406A/);
  assert.match(twoText,/0050/);

  const gateway=fs.readFileSync('src/ai/aiIngredientGateway.ts','utf8');
  const middleware=fs.readFileSync('src/ai/aiIntelligenceMiddleware.ts','utf8');
  const assistant=fs.readFileSync('src/ai/geminiAssistant.ts','utf8');
  assert.match(gateway,/extractArticleBody/,'external news fallback must verify publisher body when available');
  assert.match(gateway,/fetchExternalSecurityProfile/,'listing questions need a profile discovery path');
  assert.match(middleware,/SECURITY_PROFILE/);
  assert.match(middleware,/同一標的/,'self-comparison must be handled locally');
  assert.match(middleware,/不能可靠估算今年年化/,'unverified symbols need a truthful deterministic response');
  assert.match(assistant,/localAnswerFromEvidence/,'Gemini provider failure must fall back to evidence responder');

  console.log('V3.2.31 AI resilient local responder / listing profile / verified news PASS');
}

void main().catch(error=>{console.error(error);process.exitCode=1;});
