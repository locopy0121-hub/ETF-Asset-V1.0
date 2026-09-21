import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {answerAiQuestion} from '../src/ai/aiAssistant';

const holdings=[
  {symbol:'0050',name:'元大台灣50',shares:100,price:50,marketValue:5000,pnl:500,roi:11.11,cumulativeDividend:100,avgCost:45,comprehensivePnl:600},
  {symbol:'0056',name:'元大高股息',shares:200,price:40,marketValue:8000,pnl:800,roi:11.11,cumulativeDividend:300,avgCost:36,comprehensivePnl:1100},
] as const;
const portfolio={totalMarketValue:13000,totalPnl:1700,totalUnrealizedProfit:1300,realizedNetPnL:100,totalDividendsReceived:400};

const contextual=await answerAiQuestion('那市值呢？',holdings,portfolio,[],[],{
  networkSearchEnabled:false,
  conversation:[{role:'user',text:'幫我看 0050'}],
});
assert.equal(contextual.intent,'market-value');
assert.match(contextual.text,/0050 元大台灣50/);
assert.match(contextual.text,/5,000/);

const directWins=await answerAiQuestion('0056 市值呢？',holdings,portfolio,[],[],{
  networkSearchEnabled:false,
  conversation:[{role:'user',text:'幫我看 0050'}],
});
assert.match(directWins.text,/0056 元大高股息/);

const box=readFileSync('src/components/AiQuestionBox.tsx','utf8');
const globalAi=readFileSync('src/components/GlobalFloatingAi.tsx','utf8');
const aiScreen=readFileSync('src/screens/AiScreen.tsx','utf8');
assert.match(box,/confirmBeforeAction&&confirming!==action\.id/);
assert.match(box,/useHistory\s*\?\s*messages\.slice/);
assert.match(globalAi,/confirmBeforeAction=\{prefs\.confirmBeforeWrite\}/);
assert.match(globalAi,/useHistory=\{prefs\.useHistory\}/);
assert.match(aiScreen,/confirmBeforeAction=\{settings\.prefs\.ai\.confirmBeforeWrite\}/);
assert.match(aiScreen,/useHistory=\{settings\.prefs\.ai\.useHistory\}/);

console.log('v1.1.2 AI settings runtime wiring PASS');
