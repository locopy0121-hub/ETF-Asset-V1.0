import assert from 'node:assert/strict';

import {answerAiQuestion} from '../src/ai/aiAssistant';

const holdings=[
  {symbol:'0050',name:'元大台灣50',shares:170,price:196,marketValue:33320,pnl:1200,roi:3.74,cumulativeDividend:300,avgCost:188,realizedPnl:0,comprehensivePnl:1500},
  {symbol:'0056',name:'元大高股息',shares:800,price:38,marketValue:30400,pnl:-500,roi:-1.62,cumulativeDividend:1200,avgCost:38.6,realizedPnl:0,comprehensivePnl:700},
  {symbol:'00878',name:'國泰永續高股息',shares:1200,price:22,marketValue:26400,pnl:600,roi:2.32,cumulativeDividend:900,avgCost:21.5,realizedPnl:0,comprehensivePnl:1500},
] as const;
const portfolio={totalMarketValue:90120,totalPnl:3700,totalUnrealizedProfit:1300,realizedNetPnL:0,totalDividendsReceived:2400};
const entries=[
  {id:'b1',date:'2026-09-01',kind:'buy',symbol:'0050',name:'元大台灣50',shares:100,price:180,amount:18000,fee:25,tax:0,cashFlow:-18025},
  {id:'b2',date:'2026-09-18',kind:'buy',symbol:'0050',name:'元大台灣50',shares:70,price:190,amount:13300,fee:18,tax:0,cashFlow:-13318},
  {id:'b3',date:'2026-08-22',kind:'buy',symbol:'0056',name:'元大高股息',shares:800,price:38.6,amount:30880,fee:44,tax:0,cashFlow:-30924},
  {id:'b4',date:'2026-07-12',kind:'buy',symbol:'00878',name:'國泰永續高股息',shares:1200,price:21.5,amount:25800,fee:36,tax:0,cashFlow:-25836},
] as any;

const answer=await answerAiQuestion('我有哪些持股？',holdings,portfolio,[],entries);
assert.equal(answer.intent,'holdings');
for(const expected of [
  '0050 元大台灣50｜170 股｜最近紀錄 2026-09-18',
  '0056 元大高股息｜800 股｜最近紀錄 2026-08-22',
  '00878 國泰永續高股息｜1,200 股｜最近紀錄 2026-07-12',
])assert.ok(answer.text.includes(expected),'missing '+expected);
assert.equal(answer.actions?.length,3);
assert.deepEqual(answer.actions?.map(action=>({kind:action.kind,label:action.label,question:'question' in action?action.question:null})),[
  {kind:'openDividend',label:'查看 0050 股息資訊',question:'更新 0050 股息日'},
  {kind:'openDividend',label:'查看 0056 股息資訊',question:'更新 0056 股息日'},
  {kind:'openDividend',label:'查看 00878 股息資訊',question:'更新 00878 股息日'},
]);

const dividend=await answerAiQuestion('0050 股息',holdings,portfolio,[],entries);
assert.equal(dividend.intent,'dividend');
assert.equal(dividend.actions?.[0]?.kind,'openDividend');

console.log('V1.1.3 AI holdings and dividend actions: PASS');
