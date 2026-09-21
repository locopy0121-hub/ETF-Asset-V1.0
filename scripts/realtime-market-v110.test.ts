import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  hasUsableTwseQuote,
  pickBetterTwseRow,
  resolveTwseCurrentPrice,
  resolveTwsePreviousClose,
} from '../src/market/twseQuoteParser';

assert.equal(resolveTwseCurrentPrice({z:'110.65',y:'109.85'}),110.65,'real last trade must win');
assert.equal(resolveTwseCurrentPrice({z:'-',pz:'110.60',b:'110.55_110.50_',a:'110.65_',y:'109.85'}),110.60,'previous live trade field must win before book');
assert.equal(resolveTwseCurrentPrice({z:'-',pz:'-',b:'56.70_56.65_',a:'56.75_',y:'56.85'}),56.70,'live bid must win before yesterday close');
assert.equal(resolveTwseCurrentPrice({z:'-',pz:'-',b:'',a:'63.45_63.50_',y:'63.85'}),63.45,'live ask must win before yesterday close');
assert.equal(resolveTwseCurrentPrice({z:'-',pz:'-',b:'',a:'',y:'34.83'}),34.83,'previous close is last resort only');
assert.equal(resolveTwsePreviousClose({y:'109.85'}),109.85);
assert.equal(hasUsableTwseQuote({z:'-',b:'',a:'',y:'0'}),false);
assert.equal(pickBetterTwseRow({z:'-',y:'100'},{z:'101',y:'100'}).z,'101','fresher row must replace close-only row');

const market=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');
const finance=fs.readFileSync('src/finance/FinanceRuntime.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');
const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
const portfolio=fs.readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const detail=fs.readFileSync('src/screens/HoldingDetailScreen.tsx','utf8');

assert.match(market,/resolveTwseCurrentPrice/,'MarketRuntime must use the live TWSE resolver');
assert.match(market,/updatedCount/,'market refresh must track usable quote count');
assert.match(market,/unresolved/,'partial snapshots must preserve unresolved symbols instead of freezing all holdings');
assert.match(market,/部分行情暫用上次資料/,'partial refresh must surface a non-blocking warning while keeping fresh rows');
assert.match(market,/refreshPromiseRef/,'concurrent refresh calls must be coalesced');
assert.match(market,/force:true/,'foreground refresh must use the force retry path');
assert.match(market,/\[hydrated,trackedSymbols,refresh\]/,'newly tracked holdings must trigger immediate refresh');
assert.match(finance,/\[entries,market\.setTrackedSymbols\]/,'finance holdings must register their symbols with market runtime');
assert.match(finance,/\[initialCash,entries,canonicalQuotes\]/,'canonical finance snapshot must recompute when quotes change');
assert.match(finance,/buildSharedSnapshot/,'all external consumers must derive from shared snapshot');
assert.match(app,/syncNativeWidget\(widgetSettings\.config,finance\.sharedSnapshot\)/,'Widget must receive shared snapshot');
assert.match(app,/syncNativeMonitor\(monitorSettings\.config,finance\.sharedSnapshot\)/,'Monitor sync path must receive shared snapshot');
assert.match(home,/finance\.holdings/,'Home must consume reactive finance holdings');
assert.match(portfolio,/finance\.holdings/,'Portfolio must consume reactive finance holdings');
assert.match(detail,/useFinance\(\)/,'Holding detail must consume FinanceRuntime');

console.log('V1.0.10 REALTIME MARKET LINKAGE: PASS');
