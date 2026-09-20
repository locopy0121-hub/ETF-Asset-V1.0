import assert from 'node:assert/strict';
import { calculateCanonicalLedgerSnapshot, freezeTradeEntry } from '../src/finance/canonicalLedger';
import { ensureLedgerQuoteCoverage } from '../src/finance/runtimeQuoteCoverage';
import type { RuntimeQuote } from '../src/finance/financeSeed';

const symbols=['0050','00878','00919','00929','00713','00406','00940','006208'];
const entries=symbols.map((symbol,index)=>freezeTradeEntry({
  id:'v106-'+symbol,
  date:'2026-09-'+String(index+1).padStart(2,'0'),
  kind:'buy',
  symbol,
  name:'ETF '+symbol,
  tradeMode:'ODD_LOT',
  shares:100+index,
  price:20+index,
}));
const marketQuotes:RuntimeQuote[]=symbols.slice(0,5).map((symbol,index)=>({
  symbol,
  name:'ETF '+symbol,
  currentPrice:30+index,
  previousClose:29+index,
  liquidationTradeMode:'ODD_LOT',
  dividendFrequency:4,
  sparkline:[29+index,30+index],
}));

const covered=ensureLedgerQuoteCoverage(entries,marketQuotes);
assert.equal(covered.length,8,'Ledger 8 holdings must not collapse to 5 when only 5 live quotes exist');
for(const symbol of symbols) assert.ok(covered.some(x=>x.symbol===symbol),'missing quote coverage for '+symbol);

const snapshot=calculateCanonicalLedgerSnapshot({initialCash:100000,entries,quotes:covered});
const held=snapshot.holdings.filter(x=>x.totalShares>0);
assert.equal(held.length,8,'Canonical snapshot must preserve all 8 ledger holdings');
assert.deepEqual(new Set(held.map(x=>x.etfCode)),new Set(symbols));

console.log('V1.0.6 HOLDING INTEGRITY: PASS');
