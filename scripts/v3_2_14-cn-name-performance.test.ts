import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveEtfDisplayName} from '../src/market/etfDisplayName';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const finance=read('src/finance/FinanceRuntime.tsx');
const market=read('src/market/MarketRuntime.tsx');
const nativeRuntime=read('native/android/SaiEtfMarketRuntime.kt');
const persistenceController=read('native/android/SaiEtfMarketPersistenceController.kt');
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

assert.match(finance,/resolveEtfDisplayName\(/,'holding cards must use localized-name priority');
assert.match(finance,/catalogNameBySymbol\.get\(summary\.etfCode\)/);
assert.match(finance,/ledgerNameBySymbol\.get\(summary\.etfCode\)/,
  'the actual persisted ledger label must remain ahead of an English feed fallback');

// V4 performance contract: React Native consumes the SaiETF native core.
// High-frequency quotes are not serialized into AsyncStorage on every tick.
assert.match(market,/loadUnifiedMarketData\(\)/,'cold start must hydrate through the native SaiETF market bridge');
assert.match(market,/refreshUnifiedMarketData\(symbolsRef\.current\)/,'scheduled refresh must use the native SaiETF market bridge');
assert.doesNotMatch(market,/new MarketDataCenter\(/,'React runtime must not own a duplicate quote engine');
assert.match(nativeRuntime,/MarketPersistenceController/,'native SaiETF core must own market persistence');
assert.match(persistenceController,/PERSIST_INTERVAL_MILLIS = 5_000L/,
  'native market persistence must remain throttled instead of writing SQLite every quote');
assert.match(market,/const payload:PersistedMarketRuntime=\{schema:5,config,catalog,lastSuccessAt\}/);
assert.match(market,/\[hydrated,config,catalog,lastSuccessAt\]/);
assert.doesNotMatch(market,/\[hydrated,config,quotes,lastSuccessAt,catalog\]/,
  'scheduled quote ticks must not stringify the live quote set');
assert.match(market,/setUnresolvedSymbols\(current=>sameStrings\(current,missing\)\?current:missing\)/,
  'unchanged missing-symbol arrays must not force context rerenders');
assert.match(market,/if\(disposed\|\|AppState\.currentState!=='active'\)return;/,
  'scheduled market polling must stay idle while the app is inactive');
assert.match(market,/void refresh\(\{silent:true\}\);/,'scheduled market polling must remain silent');
assert.match(market,/refresh\(\{force:true,silent:true\}\)/,'foreground synchronization should be silent');
assert.match(home,/market\.refresh\(\{force:true\}\)/,'manual Update Quotes button must remain visible to the user');

console.log('V3.2.14 localized ETF names + SaiETF native market performance regression PASS');
