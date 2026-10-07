import assert from 'node:assert/strict';
import {financialTone,portfolioFrameTone} from '../src/theme/financialTone';
const portfolio={totalPriceUnrealizedProfit:42,totalPnl:-100};
for(const [value,tone] of [[42,'gain'],[-42,'loss'],[0,'neutral'],[NaN,'neutral'],[Infinity,'neutral']] as const)assert.equal(financialTone(value),tone);
assert.equal(financialTone(42,false),'neutral');
for(const key of ['asset-dashboard','profit-analysis','pnl-detail','holding-quotes'])assert.equal(portfolioFrameTone('home',key,portfolio,true),'gain');
assert.equal(portfolioFrameTone('portfolio','holding-dashboard',portfolio,true),'loss','summary uses its displayed comprehensive PnL');
assert.equal(portfolioFrameTone('portfolio','holding-view',portfolio,true),'gain');
assert.equal(portfolioFrameTone('home','asset-dashboard',portfolio,false),'neutral');
assert.equal(portfolioFrameTone('home','market-news',portfolio,true),'neutral');
assert.equal(portfolioFrameTone('portfolio','allocation',portfolio,true),'neutral');
console.log('Frame financial semantics / finite / zero / unavailable PASS');
import fs from 'node:fs';
// Wiring smoke accompanies the actual FrameCard execution test.
const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
for(const key of ['asset-dashboard','profit-analysis','pnl-detail','holding-quotes'])assert.ok(home.includes("tone={portfolioFrameTone('home','"+key+"',portfolio,valuationComplete)}"));
const inventory=fs.readFileSync('src/screens/PortfolioScreen.tsx','utf8');
for(const key of ['holding-dashboard','holding-view'])assert.ok(inventory.includes("tone={portfolioFrameTone('portfolio','"+key+"',portfolio,valuationComplete)}"));
assert.ok(fs.readFileSync('src/components/PageLayoutToolWorkbench.tsx','utf8').includes('tone={portfolioFrameTone(pageKey,item.key,finance.snapshot.portfolio,finance.valuationComplete)}'));
