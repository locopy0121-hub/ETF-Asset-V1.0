import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeUnifiedIntradaySeries,marketRowsToRuntimeQuotes} from '../src/market/unifiedMarketAdapter';
import type {UnifiedMarketSnapshot} from '../src/native/TfAssetNativeBridge';

const read=(p:string)=>readFileSync(p,'utf8');
const t0900=Date.UTC(2026,8,29,1,0,0);
const t0905=Date.UTC(2026,8,29,1,5,0);
const t0830=Date.UTC(2026,8,29,0,30,0);
const tNext0900=Date.UTC(2026,8,30,1,0,0);
const now=Date.UTC(2026,8,29,2,0,0);

const normalized=normalizeUnifiedIntradaySeries({
  date:'2026-09-29',
  previousClose:34.88,
  points:[
    {at:t0830,price:34.90,quality:'trade',source:'TWSE_MIS'},
    {at:t0900,price:34.85,quality:'trade',source:'TWSE_MIS'},
    {at:t0905,price:34.83,quality:'backup_realtime',source:'YAHOO'},
  ],
},now);
assert.ok(normalized);
assert.equal(normalized?.points.length,2,'pre-open values must never enter the 09:00-13:30 Mini series');
assert.equal(normalized?.points[0]?.at,t0900);
assert.equal(normalized?.previousClose,34.88);

const snapshot:UnifiedMarketSnapshot={
  version:11,
  quotes:[{
    symbol:'00878',name:'國泰永續高股息',currentPrice:34.83,previousClose:34.88,officialTradePrice:34.83,
    sourceQuoteAt:t0905,quality:'trade',source:'TWSE_MIS',priceType:'REALTIME_TRADE',
    isFallback:false,market:'TSE',statusMessage:'TWSE MIS z 實際成交價',checkedAt:now,
  }],
  intraday:{'00878':{
    date:'2026-09-29',
    previousClose:34.88,
    points:[
      {at:t0900,price:34.85,quality:'trade',source:'TWSE_MIS'},
      {at:t0905,price:34.83,quality:'backup_realtime',source:'YAHOO'},
    ],
  }},
};
const runtime=marketRowsToRuntimeQuotes(snapshot,[],now);
assert.equal(runtime[0]?.intraday?.length,2);
assert.equal(runtime[0]?.intradayDate,'2026-09-29');
assert.equal(runtime[0]?.intradayPreviousClose,34.88);

// After close and next-day pre-open, keep the last completed session on screen.
// Only the first verified 09:00+ point of the new session rolls the Mini chart to the new date.
const preOpen=marketRowsToRuntimeQuotes({version:12,quotes:snapshot.quotes},runtime,Date.UTC(2026,8,30,0,30,0));
assert.equal(preOpen[0]?.intradayDate,'2026-09-29','overnight/pre-open must keep the previous trading session visible');
assert.equal(preOpen[0]?.intraday?.length,2);
const nextSession:UnifiedMarketSnapshot={
  version:13,
  quotes:[{...snapshot.quotes[0]!,sourceQuoteAt:tNext0900,currentPrice:34.90,previousClose:34.83,checkedAt:tNext0900}],
  intraday:{'00878':{date:'2026-09-30',previousClose:34.83,points:[
    {at:tNext0900,price:34.90,quality:'trade',source:'TWSE_MIS'},
  ]}},
};
const rolled=marketRowsToRuntimeQuotes(nextSession,preOpen,tNext0900+30_000);
assert.equal(rolled[0]?.intradayDate,'2026-09-30','new session must begin only after an actual 09:00+ point exists');
assert.equal(rolled[0]?.intraday?.length,1);
assert.equal(rolled[0]?.intradayPreviousClose,34.83);

const mini=read('src/components/MiniHoldingChart.tsx');
for(const token of [
  'holding.intraday',
  'SESSION_START_MINUTE=9*60',
  'SESSION_END_MINUTE=13*60+30',
  '(minute-SESSION_START_MINUTE)/SESSION_MINUTES',
  '分時走勢待取得',
  '09:00',
  '13:30',
]) assert.ok(mini.includes(token),'Mini intraday renderer missing '+token);
assert.ok(!mini.includes('holding.sparkline'),'Mini chart must not draw the old rolling quote samples');
assert.ok(!mini.includes('[previous,holding.price]'),'Mini chart must not synthesize a straight previous-close to current-price path');

const finance=read('src/finance/FinanceRuntime.tsx');
assert.match(finance,/marketIntradaySeries(?:For\(market\.quotes,summary\.etfCode\)|FromRow\(rawQuote\))/,
  'FinanceRuntime must consume the market-center intraday view instead of coupling chart readiness to quote rows');
assert.match(finance,/intraday:intraday\.points/);
assert.match(finance,/intradayDate:intraday\.date/);
assert.match(finance,/intradayPreviousClose:intraday\.previousClose/);
const marketViews=read('src/market/marketCenterViews.ts');
assert.match(marketViews,/export function marketIntradaySeriesFor/,
  'intraday series must remain an independent market-center consumer view');
assert.match(marketViews,/export function marketValuationQuoteFor/,
  'valuation readiness must remain independent from intraday readiness');

const nativeDb=read('native/android/TfAssetMarketDatabase.kt');
for(const token of [
  'null,4',
  'market_intraday',
  'previous_close REAL',
  'intradayCoverage',
  "quality IN ('trade','backup_realtime')",
  "source IN ('TWSE_MIS','YAHOO')",
  'intradaySnapshot',
]) assert.ok(nativeDb.includes(token),'native intraday DB missing '+token);
assert.ok(!nativeDb.includes("quality IN ('trade','backup_realtime','bid_ask')"),'bid/ask must never be recorded as an actual trade path');

const nativeCenter=read('native/android/TfAssetMarketCenter.kt');
for(const token of [
  'yahooIntraday',
  'backfillIntraday',
  '?interval=1m&range=1d',
  '&intraday=1',
  'incompleteAfterClose',
  'previousClose',
]) assert.ok(nativeCenter.includes(token),'native intraday market center missing '+token);

const bridge=read('src/native/TfAssetNativeBridge.ts');
assert.match(bridge,/UnifiedMarketIntradayPoint/);
assert.match(bridge,/intraday\?:Record<string,UnifiedMarketIntradaySeries>/);
assert.match(bridge,/previousClose\?:number\|null/);

const adapter=read('src/market/unifiedMarketAdapter.ts');
assert.match(adapter,/normalizeUnifiedIntradaySeries/);
assert.match(adapter,/local\.minute<540\|\|local\.minute>810/);
assert.match(adapter,/intradayPreviousClose/);

const serverStore=read('server/src/store.mjs');
assert.match(serverStore,/async intraday\(symbols=\[\]\)/);
assert.match(serverStore,/date_trunc\('minute'/);
assert.match(serverStore,/previous_close/);
const serverSource=read('server/src/sources.mjs');
assert.match(serverSource,/async intraday\(symbols,now=Date\.now\(\)\)/);
assert.match(serverSource,/interval=1m&range=1d/);
const serverHttp=read('server/src/http.mjs');
assert.match(serverHttp,/req\.query\.intraday==='1'/);
assert.match(serverHttp,/mergeIntraday/);

const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.match(pkg.version,/^3\.2\.[1-9]\d*$/);
assert.equal(app.expo.version,pkg.version);
assert.ok(Number.isInteger(app.expo.android.versionCode)&&app.expo.android.versionCode>0);
assert.equal(String(app.expo.ios.buildNumber),String(app.expo.android.versionCode));
assert.equal(pkg.scripts['test:v3_2_11'],'npm run test:v3_2_10 && tsx scripts/v3_2_11-intraday-mini-chart.test.ts');
assert.ok(read('src/settings/BackupService.ts').includes("APP_VERSION='"+pkg.version+"'"));
assert.ok(read('src/screens/SettingsScreen.tsx').includes("VERSION='"+pkg.version+"'"));

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.11 true 09:00-13:30 intraday Mini chart regression PASS');
