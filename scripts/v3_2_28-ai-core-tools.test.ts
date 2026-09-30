import assert from 'node:assert/strict';
import fs from 'node:fs';

import {resolveSecurity,resolveSecurityFromKnown,type ResolvedSecurity} from '../src/market/securityResolver';
import {
  executeCoreAiReadTools,
  localAnswerFromCoreTools,
} from '../src/ai/coreAiToolRegistry';

const tsmc:ResolvedSecurity={
  securityId:'TWSE:2330',
  symbol:'2330',
  market:'TWSE',
  name:'台積電',
  assetType:'STOCK',
};

const known=[
  {symbol:'2330',name:'台積電',market:'TWSE' as const,assetType:'STOCK' as const},
  {symbol:'0050',name:'元大台灣50',market:'TWSE' as const,assetType:'ETF' as const},
];

assert.deepEqual(resolveSecurityFromKnown('台積電股價',known),tsmc);
assert.equal(resolveSecurityFromKnown('2330 現在多少',known)?.securityId,'TWSE:2330');
assert.equal(resolveSecurityFromKnown('元大台灣50 配息',known)?.symbol,'0050');

const originalFetch=globalThis.fetch;
globalThis.fetch=(async(input:any)=>{
  const url=String(input);
  if(url.includes('openapi.twse.com.tw'))return {
    ok:true,
    json:async()=>[{Code:'2330',Name:'台積電'}],
  } as any;
  if(url.includes('tpex.org.tw'))return {
    ok:true,
    json:async()=>[],
  } as any;
  throw new Error('unexpected catalog URL '+url);
}) as typeof fetch;
try{
  const officialResolved=await resolveSecurity('台積電股價',[]);
  assert.equal(officialResolved?.securityId,'TWSE:2330','non-holding stock name must resolve from the current market-layer official catalog');
  assert.equal(officialResolved?.name,'台積電');
}finally{
  globalThis.fetch=originalFetch;
}

const holdings=[{
  symbol:'2330',name:'台積電',shares:2000,price:950,avgCost:580,
  marketValue:1_900_000,pnl:740_000,roi:63.79,cumulativeDividend:22_000,comprehensivePnl:762_000,
}];

let resolverCalls=0;
let refreshCalls=0;
const resolver=async(query:string)=>{
  resolverCalls++;
  return /台積電|2330/i.test(query)?tsmc:null;
};
const refreshQuote=async(symbol:string)=>{
  refreshCalls++;
  assert.equal(symbol,'2330');
  return {
    symbol:'2330',name:'台積電',currentPrice:950,previousClose:940,
    sourceQuoteAt:Date.parse('2026-09-30T13:30:00+08:00'),
    quality:'trade',source:'TWSE_MIS',statusMessage:'實際成交行情',market:'TSE',
  };
};

const quotePlan=await executeCoreAiReadTools('台積電股價？',{
  holdings:[],
  quotes:[],
  resolveSecurity:resolver,
  refreshQuote,
});
assert.equal(quotePlan.resolvedSecurity?.securityId,'TWSE:2330');
assert.equal(quotePlan.session.activeSecurity?.symbol,'2330');
assert.equal(quotePlan.session.activeTopic,'MARKET');
assert.equal(quotePlan.results.some(row=>row.tool==='resolve_security'&&row.ok),true);
const quoteResult=quotePlan.results.find(row=>row.tool==='get_quote');
assert.equal(quoteResult?.ok,true);
assert.equal(quoteResult?.meta.source,'TF_ASSET_MARKET_CENTER');
assert.equal(quoteResult?.meta.verificationStatus,'VERIFIED');
assert.equal(refreshCalls,1);
const quoteFallback=localAnswerFromCoreTools(quotePlan);
assert.match(quoteFallback??'',/2330 台積電/);
assert.match(quoteFallback??'',/950/);
assert.doesNotMatch(quoteFallback??'',/無法判斷這個指令/);

resolverCalls=0;
const holdingPlan=await executeCoreAiReadTools('我有幾張？',{
  holdings,
  quotes:[],
  session:quotePlan.session,
  resolveSecurity:resolver,
});
assert.equal(resolverCalls,0,'active-security holding follow-up must not re-resolve an unrelated security');
assert.equal(holdingPlan.resolvedSecurity?.symbol,'2330');
assert.equal(holdingPlan.session.activeTopic,'PORTFOLIO');
const holdingResult=holdingPlan.results.find(row=>row.tool==='get_holding_detail');
assert.equal(holdingResult?.ok,true);
assert.equal((holdingResult?.data as {shares?:number})?.shares,2000);
assert.equal(holdingResult?.meta.source,'CANONICAL_PORTFOLIO_PROJECTION');

resolverCalls=0;
const generalPlan=await executeCoreAiReadTools('ETF 折溢價是什麼？',{
  holdings:[],
  quotes:[],
  resolveSecurity:resolver,
});
assert.equal(resolverCalls,0,'stable general knowledge must remain normal Gemini conversation');
assert.equal(generalPlan.results.length,0);

resolverCalls=0;
const amountFollowup=await executeCoreAiReadTools('如果再投入 50000 元呢？',{
  holdings,
  quotes:[],
  session:quotePlan.session,
  resolveSecurity:resolver,
});
assert.equal(resolverCalls,0,'investment amount must not be parsed as a new security symbol');
assert.equal(amountFollowup.resolvedSecurity?.symbol,'2330');

const assistant=fs.readFileSync('src/ai/aiAssistant.ts','utf8');
const gemini=fs.readFileSync('src/ai/geminiAssistant.ts','utf8');
const box=fs.readFileSync('src/components/AiQuestionBox.tsx','utf8');
const registry=fs.readFileSync('src/ai/coreAiToolRegistry.ts','utf8');
const resolverSource=fs.readFileSync('src/market/securityResolver.ts','utf8');

assert.doesNotMatch(assistant,/我目前還無法判斷這個指令/,'fixed-command help must no longer be the unknown-input boundary');
assert.match(gemini,/一般 AI 的自然對話/);
assert.match(gemini,/不要把快捷問題當成能力白名單/);
assert.match(gemini,/executeCoreAiReadTools/);
assert.match(gemini,/explicitLocalActionRequested/,'existing deterministic App actions must remain explicit exceptions, not the conversation router');
assert.match(gemini,/refreshUnifiedMarketData\(\[symbol\]\)/,'quotes must reuse the current TF Asset Market Center');
assert.match(gemini,/body:JSON\.stringify\(\{question\}\)/,'current deployed Worker question contract must remain compatible');
assert.match(gemini,/portfolio:wantsPrivate\?snapshot\.portfolio:null/,'private portfolio must be disclosed only when relevant');
assert.match(box,/sessionContext/,'current chat UI must carry structured session context');
assert.match(registry,/CANONICAL_PORTFOLIO_PROJECTION/);
assert.doesNotMatch(registry,/SELECT\s|INSERT\s|UPDATE\s|DELETE\s/i,'AI READ registry must not query SQLite directly');
assert.doesNotMatch(resolverSource,/SELECT\s|INSERT\s|UPDATE\s|DELETE\s/i,'security resolver must not query SQLite directly');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(fs.existsSync(core),'immutable finance core missing: '+core);

console.log('V3.2.28 current-App AI core READ tools + conversation context PASS');
