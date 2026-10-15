async function main(){
  import assert from 'node:assert/strict';
  import fs from 'node:fs';
  import {
    MarketDataCenter,type MarketProviderCapability,type MarketQuote,type MarketQuoteProvider,
  } from '../src/market/MarketCore';
  
  const date='2026-10-15';
  const now=Date.parse('2026-10-15T10:01:10+08:00');
  const fugle:MarketQuote={
    symbol:'2330',name:'台積電',price:1465,source:'FUGLE',quality:'LIVE',
    sourceTimestampEpochMillis:Date.parse('2026-10-15T10:00:00+08:00'),
    receivedAtEpochMillis:Date.parse('2026-10-15T10:00:00.100+08:00'),
    sessionDate:date,fallbackLevel:0,sequence:100,
  };
  let fallbackCalls=0;
  const capabilities:ReadonlySet<MarketProviderCapability>=new Set(['POLL']);
  const mis:MarketQuoteProvider={
    source:'TWSE_MIS',capabilities,
    async fetch(){
      fallbackCalls+=1;
      return new Map([['2330',{
        ...fugle,price:1460,source:'TWSE_MIS',quality:'LIVE',fallbackLevel:1,sequence:undefined,
        sourceTimestampEpochMillis:Date.parse('2026-10-15T10:01:00+08:00'),
        receivedAtEpochMillis:now,
      }]]);
    },
  };
  const center=new MarketDataCenter([mis]);
  assert.equal(center.acceptStreamingQuote(fugle,now,date),true);
  const protectedBatch=await center.refresh({
    symbols:new Set(['2330']),nowEpochMillis:now,currentTaipeiDate:date,tradingSessionActive:true,
    primarySourceHealthy:true,
  });
  assert.equal(fallbackCalls,0,'healthy Fugle must remain the live authority even when the last trade is older than 30 seconds');
  assert.equal(protectedBatch.quotes.get('2330')?.source,'FUGLE');
  
  const degradedBatch=await center.refresh({
    symbols:new Set(['2330']),nowEpochMillis:now+1000,currentTaipeiDate:date,tradingSessionActive:true,
    primarySourceHealthy:false,
  });
  assert.equal(fallbackCalls,1,'fallback may run only after the primary stream is unhealthy');
  assert.equal(degradedBatch.quotes.get('2330')?.source,'TWSE_MIS');
  
  const runtime=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');
  const persistence=fs.readFileSync('src/market/MarketPersistence.ts','utf8');
  const nativeModule=fs.readFileSync('native/android/TfAssetNativeModule.kt','utf8');
  const nativeDb=fs.readFileSync('native/android/TfAssetMarketDatabase.kt','utf8');
  
  assert.doesNotMatch(runtime,/setInterval\s*\(/,'MarketRuntime must not poll REST providers on a seconds timer');
  assert.match(runtime,/setTrackedSymbolsState\(normalizedUnique\)/,'tracked symbols must be replaceable so removed holdings/watchlist items unsubscribe');
  assert.doesNotMatch(runtime,/\.\.\.current,\.\.\.normalized/,'tracked symbols must not be an append-only union');
  assert.match(runtime,/primarySourceHealthy/,'runtime must pass transport health into market arbitration');
  assert.doesNotMatch(runtime,/fugleRef\.current\?\.disconnect\(\)/,'backgrounding must not explicitly tear down the live stream');
  assert.match(persistence,/dirtyQuotes/,'persistence must track changed quotes instead of rewriting the whole hot store');
  assert.match(persistence,/flushPromise/,'persistence must coalesce overlapping flushes');
  assert.match(persistence,/loadNativeMarketSnapshots/,'cold start quote hydration must not load all candles');
  assert.match(nativeModule,/loadMarketSnapshots/,'native bridge must expose snapshot-only cold-start loading');
  assert.match(nativeDb,/fun loadSnapshots\(/,'native database must support snapshot-only hydration');
  
  console.log('TF ASSET V5.0.1 MARKET ROOT-CAUSE GATES: PASS');
  
}

void main().catch(error=>{console.error(error);process.exit(1);});
