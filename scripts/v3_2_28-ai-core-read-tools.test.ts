import assert from 'node:assert/strict';
import {
  executeCoreAiReadTools,
  localAnswerFromCoreTools,
  type CoreAiToolRuntime,
} from '../src/ai/coreAiToolRegistry';
import {answerAiQuestion} from '../src/ai/aiAssistant';
import type {ResolvedSecurity} from '../src/market/securityResolver';

const security:ResolvedSecurity={
  securityId:'TWSE:0051',
  symbol:'0051',
  market:'TWSE',
  name:'元大中型100',
  assetType:'ETF',
};

const holdings=[{
  symbol:'0051',
  name:'元大中型100',
  shares:2000,
  price:82,
  avgCost:75,
  marketValue:164000,
  pnl:14000,
  roi:9.33,
  cumulativeDividend:3200,
  comprehensivePnl:17200,
}];

const quotes=[{
  symbol:'0051',
  name:'元大中型100',
  currentPrice:82,
  previousClose:81,
  sourceQuoteAt:Date.parse('2026-09-30T13:30:00+08:00'),
  quality:'trade',
  source:'TWSE_MIS',
  statusMessage:'TWSE 實際成交',
  market:'TSE',
}];

const resolver:NonNullable<CoreAiToolRuntime['resolveSecurity']>=async()=>security;

const bare=await executeCoreAiReadTools('0051',{holdings,quotes,resolveSecurity:resolver});
assert.deepEqual(
  bare.results.filter(row=>row.ok).map(row=>row.tool),
  ['resolve_security','get_quote','get_holding_detail'],
  'bare symbol must become a useful App-side security summary instead of generic help',
);
const bareText=localAnswerFromCoreTools(bare)??'';
assert.match(bareText,/0051 元大中型100/);
assert.match(bareText,/82/);
assert.match(bareText,/2,000 股/);
assert.doesNotMatch(bareText,/Gemini.*無法取得|一般對話問題/);

let continuationResolverCalls=0;
const continuation=await executeCoreAiReadTools('我有幾張？',{
  holdings,quotes,
  session:{activeSecurity:security,activeTopic:'MARKET'},
  resolveSecurity:async()=>{continuationResolverCalls+=1;return security;},
});
assert.equal(continuationResolverCalls,0,'follow-up must reuse activeSecurity instead of resolving again');
assert.ok(continuation.results.some(row=>row.tool==='get_holding_detail'&&row.ok));
assert.equal(continuation.session.activeSecurity?.securityId,'TWSE:0051');

let knowledgeResolverCalls=0;
const general=await executeCoreAiReadTools('什麼是 ETF 折溢價？',{
  holdings,quotes,
  resolveSecurity:async()=>{knowledgeResolverCalls+=1;return security;},
});
assert.equal(knowledgeResolverCalls,0,'general knowledge must remain ordinary AI conversation');
assert.equal(general.results.length,0);

const pending=await executeCoreAiReadTools('0051',{
  holdings,
  quotes:[{...quotes[0],quality:'backup_realtime'}],
  resolveSecurity:resolver,
});
assert.equal(pending.results.find(row=>row.tool==='get_quote')?.meta.verificationStatus,'PENDING');
assert.match(localAnswerFromCoreTools(pending)??'',/較低驗證層級/);

const performance=await answerAiQuestion(
  '持股報酬率',
  holdings,
  {
    totalMarketValue:1000,
    totalPnl:120,
    totalUnrealizedProfit:100,
    realizedNetPnL:20,
    totalDividendsReceived:0,
  },
  [],
  [],
);
assert.match(performance.text,/持股未實現報酬率 11\.11%/);
assert.match(performance.text,/持股市值 NT\$ 1,000/);

console.log('V3.2.28 App-first AI core read tools regression PASS');
