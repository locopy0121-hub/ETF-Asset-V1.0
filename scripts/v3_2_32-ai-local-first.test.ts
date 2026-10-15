import assert from 'node:assert/strict';
import fs from 'node:fs';

import {decideAiResponse} from '../src/ai/aiResponseArbitration';
import type {AiEvidencePackage} from '../src/ai/intelligenceTypes';
import type {CoreAiToolPlan} from '../src/ai/coreAiToolRegistry';

const emptyToolPlan:CoreAiToolPlan={
  results:[],
  session:{activeTopic:'GENERAL'},
  resolvedSecurity:null,
};

const evidence=(recipeId:AiEvidencePackage['recipeId'],question:string,extra:Partial<AiEvidencePackage>={}):AiEvidencePackage=>({
  generatedAt:'2026-10-01T01:00:00+08:00',
  question,
  recipeId,
  mode:recipeId==='GENERAL'?'GENERAL':'FACT',
  symbols:[],
  status:'VERIFIED',
  ingredients:[],
  metrics:[],
  missingRequired:[],
  acquisitionAttempts:[],
  rules:{marketFactsFromMarketSources:true,portfolioDataIsContextOnly:true,noFabricationOnMissingData:true},
  ...extra,
});

function main(){
  const listing=decideAiResponse(emptyToolPlan,evidence('SECURITY_PROFILE','00415A上市',{
    symbols:['00415A'],
    ingredients:[{
      ingredient:'SECURITY_PROFILE',symbol:'00415A',status:'VERIFIED',source:'群益投信',
      fetchedAt:'2026-10-01T01:00:00+08:00',
      summary:'00415A 主動群益核心50 預計掛牌日期 2026-10-20',
      details:{name:'主動群益核心50',listingDate:'2026-10-20',status:'PRELISTING',articleBodyVerified:true},
    }],
  }));
  assert.equal(listing.route,'LOCAL_EVIDENCE');
  assert.match(listing.text??'',/2026-10-20/);

  const unavailableAnnualized=decideAiResponse(emptyToolPlan,evidence('MARKET_PERFORMANCE','預估00496A今年年化',{
    symbols:['00496A'],
    status:'PARTIAL',
    missingRequired:['HISTORICAL_PRICES'],
    ingredients:[{
      ingredient:'SECURITY_IDENTITY',symbol:'00496A',status:'PARTIAL',source:'QUESTION_SYMBOL_PARSER',
      fetchedAt:'2026-10-01T01:00:00+08:00',
      summary:'代號已解析，但尚未在官方已上市目錄確認名稱/市場',
    }],
    acquisitionAttempts:[{
      ingredient:'HISTORICAL_PRICES',symbol:'00496A',source:'TWSE_TPEX_OFFICIAL_DAILY',
      status:'UNAVAILABLE',message:'官方來源沒有回傳可用日線資料',
    }],
  }));
  assert.equal(unavailableAnnualized.route,'LOCAL_EVIDENCE');
  assert.match(unavailableAnnualized.text??'',/不能可靠估算今年年化/);

  const selfCompare=decideAiResponse(emptyToolPlan,evidence('ETF_COMPARE','00406A與00406A比較',{
    symbols:['00406A'],
    status:'PARTIAL',
    missingRequired:['HISTORICAL_PRICES'],
  }));
  assert.equal(selfCompare.route,'LOCAL_EVIDENCE');
  assert.match(selfCompare.text??'',/同一標的/);

  const general=decideAiResponse(emptyToolPlan,evidence('GENERAL','幫我解釋資產配置的概念'));
  assert.equal(general.route,'GEMINI');
  assert.equal(general.text,null);

  const quoteToolPlan:CoreAiToolPlan={
    results:[{
      ok:true,tool:'get_quote',version:1,
      data:{
        security:{securityId:'TWSE:0050',symbol:'0050',market:'TWSE',name:'元大台灣50',assetType:'ETF'},
        price:65,previousClose:64.5,change:0.5,changePercent:0.775193798,
        quality:'trade',statusMessage:'實際成交行情',
      },
      meta:{source:'TF_ASSET_MARKET_CENTER',fetchedAt:'2026-10-01T01:00:00+08:00',verificationStatus:'VERIFIED'},
    }],
    session:{activeTopic:'MARKET'},
    resolvedSecurity:{securityId:'TWSE:0050',symbol:'0050',market:'TWSE',name:'元大台灣50',assetType:'ETF'},
  };
  const quote=decideAiResponse(quoteToolPlan,evidence('MARKET_QUOTE','0050股價',{symbols:['0050']}));
  assert.equal(quote.route,'LOCAL_CORE');
  assert.match(quote.text??'',/65/);

  const assistant=fs.readFileSync('src/ai/geminiAssistant.ts','utf8');
  const decisionCall=assistant.indexOf('decideAiResponse(toolPlan,evidence)');
  const geminiCall=assistant.indexOf('const text=await requestGemini(',decisionCall);
  assert.ok(decisionCall>=0&&geminiCall>decisionCall,'local arbitration must execute before Gemini request');
  assert.match(assistant,/decision\.route!==['"]GEMINI['"]/);
  assert.doesNotMatch(fs.readFileSync('src/ai/aiResponseArbitration.ts','utf8'),/fetch\(/,'arbitration must remain pure and fast');

  console.log('V3.2.32 App-first AI response arbitration PASS');
}

main();
