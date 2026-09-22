import assert from 'node:assert/strict';

import {answerAiQuestion} from '../src/ai/aiAssistant';
import {dividendEventToLedger,type HoldingDividendEvent} from '../src/ai/dividendAssistant';
import {buildSharedSnapshot} from '../src/finance/sharedSnapshotAdapter';

const canonical:any={
  totalAssets:999999,
  cashBalance:123456,
  portfolio:{
    totalMarketValue:456789,
    totalUnrealizedProfit:12000,
    realizedNetPnL:3000,
    totalDividendsReceived:5000,
    totalPnl:20000,
  },
};
const snapshot=buildSharedSnapshot({canonical,holdings:[],generatedAt:Date.now()});
assert.equal(snapshot.asset.totalAssets,456789,'Shared totalAssets must be holdings market value, not cash-inclusive canonical totalAssets');
assert.equal(snapshot.asset.marketValue,456789);
assert.equal(snapshot.asset.cash,123456);
assert.notEqual(snapshot.asset.totalAssets,snapshot.asset.cash+snapshot.asset.marketValue,'Display totalAssets must not recombine cash');

const holdings=[{symbol:'0050',name:'元大台灣50',shares:1000,price:200,marketValue:200000,pnl:12000,roi:6,cumulativeDividend:3000,avgCost:188,realizedPnl:0,comprehensivePnl:15000}];
const portfolio={totalMarketValue:200000,totalPnl:15000,totalUnrealizedProfit:12000,realizedNetPnL:0,totalDividendsReceived:3000};
const news=[{id:'n1',symbol:'0050',name:'元大台灣50',title:'測試新聞',source:'測試來源',publishedAt:'2026-09-22T00:00:00.000Z',summary:'摘要',url:'https://example.com'}];

async function main(){
  const capabilities=await answerAiQuestion('你可以做什麼？',holdings,portfolio,news,[]);
  assert.equal(capabilities.intent,'capabilities','Capability intent must route before news or help');
  const marketValue=await answerAiQuestion('目前持股市值？',holdings,portfolio,news,[]);
  assert.equal(marketValue.intent,'market-value');
  assert.match(marketValue.text,/200,000/);
  const newsAnswer=await answerAiQuestion('最近持股有什麼新聞？',holdings,portfolio,news,[]);
  assert.equal(newsAnswer.intent,'news');
  assert.match(newsAnswer.text,/測試新聞/);
  
  const event:HoldingDividendEvent={
    id:'0050-2026-09-30',symbol:'0050',name:'元大台灣50',exDate:'2026-09-30',lastPurchaseDate:'2026-09-29',
    recordDate:'2026-10-01',paymentDate:'2026-10-20',perShareAmount:1.2,eligibleShares:1000,estimatedDividend:1200,
    distributionYield:.6,status:'尚未登錄',alreadyRecorded:false,
  };
  const ledger=dividendEventToLedger(event);
  assert.equal(ledger.kind,'dividend');
  assert.equal(ledger.symbol,'0050');
  assert.equal(ledger.perShareAmount,1.2);
  assert.equal(ledger.sharesHeld,1000);
  assert.match(ledger.note??'',/除息日 2026-09-30/);
  
  console.log('V1.1.2 carry-over behavior: PASS');
  
}

main().catch(error=>{console.error(error);process.exitCode=1;});
