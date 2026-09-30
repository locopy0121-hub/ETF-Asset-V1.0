import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildIndustryExposure,buildPairwiseOverlap,buildWhatIf,weightedEtfOverlap} from '../src/ai/deterministicPortfolioAnalysis';

const a=[
  {stockSymbol:'2330',stockName:'台積電',weight:50,industry:'半導體',source:'fixture',effectiveDate:'2026-09-30',updatedAt:'2026-09-30'},
  {stockSymbol:'2454',stockName:'聯發科',weight:10,industry:'半導體',source:'fixture',effectiveDate:'2026-09-30',updatedAt:'2026-09-30'},
];
const b=[
  {stockSymbol:'2330',stockName:'台積電',weight:20,industry:'半導體',source:'fixture',effectiveDate:'2026-09-30',updatedAt:'2026-09-30'},
  {stockSymbol:'2881',stockName:'富邦金',weight:30,industry:'金融',source:'fixture',effectiveDate:'2026-09-30',updatedAt:'2026-09-30'},
];

assert.equal(weightedEtfOverlap(a,b),20,'weighted overlap must use min weights, not row count');

const holdings=[
  {symbol:'A',name:'A',shares:1,avgCost:1,marketPrice:1,marketValue:600,pnl:0,roi:0,portfolioWeight:60},
  {symbol:'B',name:'B',shares:1,avgCost:1,marketPrice:1,marketValue:400,pnl:0,roi:0,portfolioWeight:40},
];
const map=new Map<string,readonly any[]>([['A',a],['B',b]]);
const exposure=buildIndustryExposure(holdings,map);
assert.equal(exposure.find(x=>x.industry==='半導體')?.weight,44);
assert.equal(exposure.find(x=>x.industry==='金融')?.weight,12);

const overlap=buildPairwiseOverlap('T',a,holdings,map);
assert.equal(overlap.find(x=>x.heldSymbol==='B')?.overlapPercent,20);

const whatIf=buildWhatIf(1000,1000,holdings,a,map);
assert.ok(whatIf);
assert.equal(whatIf?.targetWeightAfter,50);
assert.equal(whatIf?.duplicateShareOfNewEtf,60);
assert.equal(whatIf?.duplicateCapitalAmount,600);

const db=fs.readFileSync('native/android/TfAssetMarketDatabase.kt','utf8');
const bridge=fs.readFileSync('src/native/TfAssetNativeBridge.ts','utf8');
const context=fs.readFileSync('src/ai/buildAnalysisContext.ts','utf8');
const tools=fs.readFileSync('src/ai/aiTools.ts','utf8');
const prompt=fs.readFileSync('src/ai/prompts.ts','utf8');
const gemini=fs.readFileSync('src/ai/geminiAssistant.ts','utf8');

for(const token of ['CREATE TABLE IF NOT EXISTS etf_components','CREATE TABLE IF NOT EXISTS etf_meta','effective_date','source TEXT'])
  assert.ok(db.includes(token),'missing local research DB contract: '+token);
assert.ok(!db.includes('CREATE TABLE IF NOT EXISTS user_holdings'),'must not create a second holdings truth source');
for(const token of ['queryLocalEtfComponents','queryLocalEtfMeta'])
  assert.ok(bridge.includes(token)&&tools.includes(token),'missing App-executed local tool: '+token);
assert.match(context,/isCurrentlyHeld/);
assert.match(context,/Canonical|portfolio|holdings/i);
assert.match(prompt,/不得直接觸碰 SQLite/);
assert.match(prompt,/不得自行假設/);
assert.match(gemini,/buildAnalysisContext/);
assert.match(gemini,/researchEnabled/);
assert.match(gemini,/【TF Asset 本機可信資料】/,'Gemini must receive App-resolved local analysis inside the deployed Worker question field');

console.log('V3.2.25 local-data Gemini tool architecture PASS');
