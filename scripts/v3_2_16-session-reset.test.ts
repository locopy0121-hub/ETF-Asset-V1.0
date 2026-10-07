import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  marketIntradaySessionDateChanged,
  marketRowsToRuntimeQuotes,
  normalizeUnifiedIntradaySeries,
} from '../src/market/unifiedMarketAdapter';
import type {UnifiedMarketSnapshot} from '../src/native/TfAssetNativeBridge';

const day1Open=Date.UTC(2026,8,29,1,0,0);
const day1Late=Date.UTC(2026,8,29,5,20,0);
const day2Open=Date.UTC(2026,8,30,1,0,0);
const day2Now=day2Open+30_000;

const quote={
  symbol:'0050',name:'元大台灣50',currentPrice:111.0,previousClose:110.5,officialTradePrice:111.0,
  sourceQuoteAt:day1Late,quality:'trade' as const,source:'TWSE_MIS' as const,priceType:'REALTIME_TRADE' as const,
  isFallback:false,market:'TSE' as const,statusMessage:'TWSE MIS z 實際成交價',checkedAt:day1Late,
};
const yesterday:UnifiedMarketSnapshot={
  version:21,
  quotes:[quote],
  intraday:{'0050':{date:'2026-09-29',previousClose:109.8,points:[
    {at:day1Open,price:110.0,quality:'trade',source:'TWSE_MIS'},
    {at:day1Late,price:111.0,quality:'trade',source:'TWSE_MIS'},
  ]}},
};
const prior=marketRowsToRuntimeQuotes(yesterday,[],day1Late+10_000);
assert.equal(prior[0]?.intradayDate,'2026-09-29');
assert.equal(prior[0]?.intraday?.length,2);

// Missing intraday payload means "no new Market Center session decision yet".
// This is the expected pre-open behavior: keep the completed previous session.
const preOpen=marketRowsToRuntimeQuotes({version:21,quotes:[quote]},prior,day2Open-60_000);
assert.equal(preOpen[0]?.intradayDate,'2026-09-29');
assert.equal(preOpen[0]?.intraday?.length,2);

// An explicit empty session is NOT missing data. It means the exchange session
// rolled to today and the chart must wait empty for today's first valid point.
const emptyToday=normalizeUnifiedIntradaySeries({
  date:'2026-09-30',previousClose:111.0,points:[],
},day2Now);
assert.ok(emptyToday);
assert.equal(emptyToday?.points.length,0);

const opening:UnifiedMarketSnapshot={
  version:21,
  quotes:[quote],
  intraday:{'0050':{date:'2026-09-30',previousClose:111.0,points:[]}},
};
const reset=marketRowsToRuntimeQuotes(opening,preOpen,day2Now);
assert.equal(reset[0]?.intradayDate,'2026-09-30');
assert.equal(reset[0]?.intraday?.length,0);
assert.equal(reset[0]?.intradayPreviousClose,111.0);
assert.equal(marketIntradaySessionDateChanged(preOpen,reset),true);
assert.equal(marketIntradaySessionDateChanged(reset,reset),false);

// App restart during the session must hydrate all already persisted points for
// today rather than beginning from the process launch time.
const restarted:UnifiedMarketSnapshot={
  version:22,
  quotes:[{...quote,currentPrice:111.4,sourceQuoteAt:day2Open+30*60_000,checkedAt:day2Open+30*60_000}],
  intraday:{'0050':{date:'2026-09-30',previousClose:111.0,points:[
    {at:day2Open,price:111.1,quality:'trade',source:'TWSE_MIS'},
    {at:day2Open+10*60_000,price:111.2,quality:'trade',source:'TWSE_MIS'},
    {at:day2Open+30*60_000,price:111.4,quality:'trade',source:'TWSE_MIS'},
  ]}},
};
const hydrated=marketRowsToRuntimeQuotes(restarted,[],day2Open+31*60_000);
assert.equal(hydrated[0]?.intradayDate,'2026-09-30');
assert.equal(hydrated[0]?.intraday?.length,3);
assert.equal(hydrated[0]?.intraday?.[0]?.at,day2Open);

const read=(path:string)=>fs.readFileSync(path,'utf8');
const nativeDb=read('native/android/TfAssetMarketDatabase.kt');
for(const token of [
  'activeTradingDay',
  'SESSION_START_MINUTE=9*60',
  'val currentDay=activeTradingDay(now)',
  'val viewDay=currentDay?:latestDay?:continue',
  'if(perMinute.isEmpty()&&currentDay==null)continue',
  'JSONArray(perMinute.values.toList())',
]) assert.ok(nativeDb.includes(token),'native current-session reset contract missing '+token);
assert.ok(!nativeDb.includes('DELETE FROM market_intraday'),
  'session rollover must retain historical intraday rows instead of deleting yesterday');

const runtime=read('src/market/MarketRuntime.tsx');
const persistence=read('src/market/MarketPersistence.ts');
assert.match(persistence,/loadCandles\(symbol:string,sessionDate:string\)/,
  'V4 persistence must expose session-scoped minute candles for restart hydration');
assert.match(runtime,/persistence\.loadCandles\(quote\.symbol,quote\.sessionDate\)/,
  'V4 runtime must hydrate all already persisted points for the active persisted session');
assert.match(runtime,/persistedPointsBySymbol\.get\(row\.symbol\)/);
assert.match(runtime,/resetRuntimeIntradaySession\(current,sessionDate\)/,
  'market-open rollover must reset yesterday intraday data before the first valid tick');
assert.match(runtime,/if\(currentPhase==='live'\)/);
assert.match(persistence,/if\(quote\.source==='CACHE'\)/,
  'rehydrated CACHE snapshots must not manufacture duplicate minute candles');

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,app.expo.version,'package/app semantic versions must stay aligned');
assert.ok(Number(app.expo.android.versionCode)>=30216,'session-reset regression requires build 30216 or newer');
assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode),'iOS/Android build identities must stay aligned');
assert.equal(pkg.scripts['test:v3_2_16'],'npm run test:v3_2_15 && tsx scripts/v3_2_16-session-reset.test.ts');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.16 market-open intraday session reset regression PASS');
