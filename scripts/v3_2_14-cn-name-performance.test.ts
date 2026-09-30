import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveEtfDisplayName} from '../src/market/etfDisplayName';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const finance=read('src/finance/FinanceRuntime.tsx');
const market=read('src/market/MarketRuntime.tsx');
const home=read('src/screens/HomeScreen.tsx');

assert.equal(
  resolveEtfDisplayName('0050','元大台灣50','元大台灣50','YUANTA SECURITIES INV TRUST CO LTD'),
  '元大台灣50',
  'official/localized ETF catalog name must win over English market-feed name',
);
assert.equal(
  resolveEtfDisplayName('00878',undefined,'國泰永續高股息','CATHAY SECS INV TRUST CO LTD'),
  '國泰永續高股息',
  'ledger Chinese name must win when official catalog metadata is temporarily unavailable',
);
assert.equal(
  resolveEtfDisplayName('00919',undefined,undefined,'CAPITAL INV TRUST CORP'),
  'CAPITAL INV TRUST CORP',
  'feed name remains a fallback instead of disappearing',
);

assert.match(finance,/resolveEtfDisplayName\(/,
  'holding cards must use localized-name priority');
assert.match(finance,/catalogNameBySymbol\.get\(summary\.etfCode\)/);
assert.match(finance,/ledgerNameBySymbol\.get\(summary\.etfCode\)/,
  'the actual persisted ledger label must remain ahead of an English feed fallback');

// Performance contract: native market polling must not stringify the full catalog
// on every scheduled quote tick, and scheduled/background refreshes stay silent.
assert.match(market,/const persistedQuotes=unifiedMarketCenterAvailable\?EMPTY_PERSISTED_QUOTES:quotes/);
assert.match(market,/const persistedLastSuccessAt=unifiedMarketCenterAvailable\?null:lastSuccessAt/);
assert.match(market,/\[hydrated,config,persistedQuotes,persistedLastSuccessAt,catalog,catalogFetchedAt\]/);
assert.doesNotMatch(market,/\[hydrated,config,quotes,lastSuccessAt,catalog,catalogFetchedAt\]/);
assert.match(market,/setMissingSymbols\(current=>sameStrings\(current,nextMissing\)\?current:nextMissing\)/,
  'unchanged missing-symbol arrays must not force context rerenders');
assert.match(market,/if\(disposed\|\|AppState\.currentState!=='active'\)return;/,
  'scheduled market polling must stay silent and idle while the app is inactive');
assert.match(market,/void refresh\(\{silent:true\}\);/,
  'scheduled market polling must remain silent');
assert.match(market,/refresh\(\{force:true,silent:true\}\)/,
  'background/foreground synchronization should be silent');
assert.match(home,/market\.refresh\(\{force:true\}\)/,
  'manual Update Quotes button must remain visible to the user');

console.log('V3.2.14 localized ETF names + market refresh performance regression PASS');
