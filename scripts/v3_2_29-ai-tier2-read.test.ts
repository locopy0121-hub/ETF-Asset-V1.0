import assert from 'node:assert/strict';
import fs from 'node:fs';

import {executeCoreAiReadTools,localAnswerFromCoreTools} from '../src/ai/coreAiToolRegistry';
import type {ResolvedSecurity} from '../src/market/securityResolver';

async function main(){
  const tsmc:ResolvedSecurity={
    securityId:'TWSE:2330',symbol:'2330',market:'TWSE',name:'台積電',assetType:'STOCK',
  };
  const holdings=[{
    symbol:'2330',name:'台積電',shares:2000,price:950,avgCost:580,
    marketValue:1_900_000,pnl:740_000,roi:63.79,cumulativeDividend:10_000,comprehensivePnl:750_000,
  }];
  const entries:any[]=[
    {
      id:'b2330',date:'2026-09-01',kind:'buy',symbol:'2330',name:'台積電',
      tradeMode:'oddLot',shares:1000,price:580,amount:580000,
      calculatedFee:20,calculatedTax:0,actualFee:20,actualTax:0,brokerProfileId:'default',
    },
    {
      id:'d2330',date:'2026-09-20',kind:'dividend',symbol:'2330',name:'台積電',
      perShareAmount:5,sharesHeld:2000,
    },
    {
      id:'b0050',date:'2026-09-25',kind:'buy',symbol:'0050',name:'元大台灣50',
      tradeMode:'oddLot',shares:1000,price:60,amount:60000,
      calculatedFee:20,calculatedTax:0,actualFee:20,actualTax:0,brokerProfileId:'default',
    },
    {
      id:'d0050',date:'2026-09-26',kind:'dividend',symbol:'0050',name:'元大台灣50',
      perShareAmount:1,sharesHeld:1000,
    },
    {id:'cash',date:'2026-09-27',kind:'other',label:'現金調整',amount:1000},
  ];

  let resolverCalls=0;
  const resolver=async()=>{resolverCalls++;return null;};

  const dividendPlan=await executeCoreAiReadTools('那股息呢？',{
    holdings,quotes:[],entries,session:{activeSecurity:tsmc,activeTopic:'MARKET'},resolveSecurity:resolver,
  });
  assert.equal(resolverCalls,0,'pronoun dividend follow-up must keep activeSecurity');
  assert.equal(dividendPlan.resolvedSecurity?.symbol,'2330');
  const dividendResult=dividendPlan.results.find(row=>row.tool==='get_dividends');
  assert.equal(dividendResult?.ok,true);
  assert.equal(dividendResult?.meta.source,'CANONICAL_LEDGER');
  const dividendData=dividendResult?.data as {security?:ResolvedSecurity|null;rows?:Array<{symbol:string}>;totalRecordedNet?:number};
  assert.equal(dividendData.security?.symbol,'2330');
  assert.equal(dividendData.rows?.length,1);
  assert.equal(dividendData.rows?.[0]?.symbol,'2330');
  assert.ok(Number(dividendData.totalRecordedNet)>0);
  assert.match(localAnswerFromCoreTools(dividendPlan)??'',/2330 台積電/);

  resolverCalls=0;
  const annualDividendPlan=await executeCoreAiReadTools('今年股息多少？',{
    holdings,quotes:[],entries,resolveSecurity:resolver,
  });
  assert.equal(resolverCalls,0,'portfolio-wide dividend question must not call the security resolver');
  const annualDividend=annualDividendPlan.results.find(row=>row.tool==='get_dividends')?.data as {period?:string;rows?:unknown[]};
  assert.equal(annualDividend.period,'CURRENT_YEAR');
  assert.equal(annualDividend.rows?.length,2);

  const buyPlan=await executeCoreAiReadTools('我最近買了什麼？',{
    holdings,quotes:[],entries,
  });
  const buys=buyPlan.results.find(row=>row.tool==='get_transactions')?.data as {kinds?:string[];rows?:Array<{kind:string;symbol?:string}>};
  assert.deepEqual(buys.kinds,['buy']);
  assert.equal(buys.rows?.length,2);
  assert.ok(buys.rows?.every(row=>row.kind==='buy'));

  const latestTradePlan=await executeCoreAiReadTools('最近 1 筆交易',{
    holdings,quotes:[],entries,
  });
  const latestTrade=latestTradePlan.results.find(row=>row.tool==='get_transactions')?.data as {limit?:number;kinds?:string[];rows?:Array<{kind:string}>};
  assert.equal(latestTrade.limit,1);
  assert.deepEqual(latestTrade.kinds,['buy','sell']);
  assert.equal(latestTrade.rows?.length,1);
  assert.equal(latestTrade.rows?.[0]?.kind,'buy');

  const assetPlan=await executeCoreAiReadTools('我目前總資產和總損益？',{
    holdings,quotes:[],entries,
    assetSummary:{
      totalAssets:2_000_000,marketValue:1_900_000,cash:100_000,
      unrealizedPnl:740_000,realizedPnl:20_000,dividendIncome:10_000,totalReturn:770_000,
    },
  });
  const asset=assetPlan.results.find(row=>row.tool==='get_portfolio_summary');
  assert.equal(asset?.ok,true);
  assert.equal(asset?.meta.source,'CANONICAL_SHARED_SNAPSHOT');
  assert.equal((asset?.data as {totalAssets?:number})?.totalAssets,2_000_000);
  assert.match(localAnswerFromCoreTools(assetPlan)??'',/2,000,000/);

  const registry=fs.readFileSync('src/ai/coreAiToolRegistry.ts','utf8');
  const gemini=fs.readFileSync('src/ai/geminiAssistant.ts','utf8');
  const aiScreen=fs.readFileSync('src/screens/AiScreen.tsx','utf8');
  assert.match(registry,/get_portfolio_summary/);
  assert.match(registry,/get_transactions/);
  assert.match(registry,/get_dividends/);
  assert.match(registry,/calculateLedgerCashFlow/,'ledger cash flows must reuse the current Canonical Finance Core');
  assert.doesNotMatch(registry,/SELECT\s|INSERT\s|UPDATE\s|DELETE\s/i,'AI tier-2 READ tools must not query SQLite directly');
  assert.match(gemini,/entries,/,'full in-memory Canonical ledger must be available to the App-side Tool runtime');
  assert.match(gemini,/ledgerToolCovered/,'structured ledger Tool output must replace redundant raw ledger grounding');
  assert.match(gemini,/portfolioToolCovered/,'structured portfolio Tool output must replace redundant full portfolio grounding');
  assert.match(aiScreen,/finance\.sharedSnapshot\.asset/,'AI must receive the current Canonical shared asset snapshot from the App');

  console.log('V3.2.29 current-App canonical portfolio / ledger / dividend READ tools PASS');
}

void main().catch(error=>{console.error(error);process.exitCode=1;});
