import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p:string)=>fs.readFileSync(p,'utf8');
const runtime=read('src/market/MarketRuntime.tsx');
const settings=read('src/screens/SettingsScreen.tsx');

assert.match(runtime,/const refreshMeta=await refreshUnifiedMarketData\(symbolsRef\.current\);[\s\S]*?const state=await loadUnifiedMarketData\(\);/,
  'network refresh must commit through native center and App must then read SQLite');
assert.doesNotMatch(runtime,/const state=await refreshUnifiedMarketData\(symbolsRef\.current\);/,
  'App must not render the network refresh return value as its authoritative snapshot');
assert.match(runtime,/const next=marketRowsToRuntimeQuotes\(state,quotesRef\.current\)/,
  'all App consumers must project from the SQLite snapshot');
assert.match(runtime,/if\(unifiedMarketCenterAvailable\)\{[\s\S]*?const snapshot=await loadUnifiedMarketData\(\)/,
  'App startup must hydrate market data from SQLite before scheduled refresh');
assert.match(runtime,/const persistedQuotes=unifiedMarketCenterAvailable\?EMPTY_PERSISTED_QUOTES:quotes/,
  'native market truth must not be duplicated into AsyncStorage');
assert.match(settings,/本機 SQLite 正式行情資料中心/);
assert.match(settings,/TWSE／備援來源先寫入 SQLite，首頁、庫存、圖表、損益與 Widget 再統一讀取 SQLite/);

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.2.19');
assert.equal(app.expo.version,'3.2.19');
assert.equal(app.expo.android.versionCode,30219);
assert.equal(app.expo.ios.buildNumber,'30219');
assert.equal(pkg.scripts['test:v3_2_19'],'npm run test:v3_2_18 && tsx scripts/v3_2_19-sqlite-single-source.test.ts');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.19 TWSE <=> SQLite <=> App single-source contract PASS');
