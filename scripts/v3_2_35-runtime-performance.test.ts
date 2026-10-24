import assert from 'node:assert/strict';
import fs from 'node:fs';

import {executeCoreAiReadTools} from '../src/ai/coreAiToolRegistry';
import type {ResolvedSecurity} from '../src/market/securityResolver';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const security:ResolvedSecurity={
  securityId:'TWSE:0050',
  symbol:'0050',
  market:'TWSE',
  name:'元大台灣50',
  assetType:'ETF',
};

async function main(){
  const now=Date.now();
  let refreshCalls=0;
  const freshPlan=await executeCoreAiReadTools('0050即時行情',{
    holdings:[],
    quotes:[{
      symbol:'0050',name:'元大台灣50',currentPrice:65.1,previousClose:64.8,
      sourceQuoteAt:now-1_000,checkedAt:now,quality:'trade',source:'TWSE_MIS',
      statusMessage:'TWSE MIS z 實際成交價',market:'TSE',
    }],
    resolveSecurity:async()=>security,
    refreshQuote:async()=>{
      refreshCalls++;
      throw new Error('fresh App quote should not trigger a provider refresh');
    },
  });
  assert.equal(refreshCalls,0,'fresh verified SQLite quote must answer AI without a second network/native refresh');
  const freshQuote=freshPlan.results.find(row=>row.tool==='get_quote');
  assert.equal(freshQuote?.meta.verificationStatus,'VERIFIED');

  refreshCalls=0;
  const stalePlan=await executeCoreAiReadTools('0050即時行情',{
    holdings:[],
    quotes:[{
      symbol:'0050',name:'元大台灣50',currentPrice:64.9,previousClose:64.8,
      sourceQuoteAt:now-10*60_000,checkedAt:now,quality:'trade',source:'TWSE_MIS',
      statusMessage:'舊成交',market:'TSE',
    }],
    resolveSecurity:async()=>security,
    refreshQuote:async()=>{
      refreshCalls++;
      return {
        symbol:'0050',name:'元大台灣50',currentPrice:65.2,previousClose:64.8,
        sourceQuoteAt:now-500,checkedAt:now,quality:'trade',source:'TWSE_MIS',
        statusMessage:'更新後成交',market:'TSE',
      };
    },
  });
  assert.equal(refreshCalls,1,'stale quote must still refresh when AI needs market data');
  const staleQuote=stalePlan.results.find(row=>row.tool==='get_quote');
  assert.equal(staleQuote?.meta.verificationStatus,'VERIFIED');
  assert.equal((staleQuote?.data as {price?:number})?.price,65.2);

  const market=read('src/market/MarketRuntime.tsx');
  const nativeRuntime=read('native/android/SaiEtfMarketRuntime.kt');
  const nativeModule=read('native/android/TfAssetNativeModule.kt');
  assert.match(market,/refreshUnifiedMarketData\(combinedSymbols\(\)\)/,
    'React runtime must use the imported SaiETF native market core');
  assert.match(market,/loadUnifiedMarketData\(\)/,
    'cold-start hydration must come from the native SaiETF core snapshot');
  assert.match(market,/refreshPromiseRef\.current/,
    '1-second scheduler and manual refresh must coalesce overlapping bridge requests');
  assert.doesNotMatch(market,/new MarketDataCenter\(/,
    'React runtime must not instantiate a duplicate quote engine');
  assert.doesNotMatch(market,/new FugleWebSocketProvider\(/,
    'React runtime must not instantiate a duplicate Fugle stream');
  assert.match(nativeRuntime,/private val center = MarketDataCenter\(/);
  assert.match(nativeRuntime,/streamingController\.updateSymbols\(symbols\)/);
  assert.match(nativeRuntime,/val batch = center\.refresh\(/);
  assert.match(nativeRuntime,/persistenceController\.flushNow\(\)/);
  assert.match(nativeModule,/saietfMarket\.refresh\(symbols\)/,
    'native bridge must route refreshes to the imported SaiETF runtime');

  const history=read('src/finance/useDailyPnlHistory.ts');
  assert.match(history,/marketDataVersionRef=useRef\(input\.marketDataVersion\)/);
  assert.match(history,/marketDataVersion:marketDataVersionRef\.current/);
  assert.doesNotMatch(history,/\[input\.hydrated,storageHydrated,input\.entries,input\.initialCash,input\.marketDataVersion/,
    'live quote version must not abort/restart the full official history fetch');

  const app=read('App.tsx');
  assert.match(app,/consumeNativeMarketForceRefreshRequests/);
  assert.match(app,/useLatestAsyncJob/);
  assert.match(app,/state\.pending=value/);
  assert.match(app,/InteractionManager\.runAfterInteractions/);
  assert.doesNotMatch(app,/consumeNativeWidgetForceRefreshRequest/);
  assert.doesNotMatch(app,/consumeNativeMonitorForceRefreshRequest/);

  const home=read('src/screens/HomeScreen.tsx');
  assert.match(home,/catalogBySymbol=useMemo/);
  assert.match(home,/dividendReminders=useMemo/);
  assert.match(home,/transactionCountBySymbol=useMemo/);
  assert.doesNotMatch(home,/finance\.entries\.filter\(entry=>'symbol' in entry&&entry\.symbol===row\.symbol/,
    'dashboard transaction chart must not rescan the whole ledger for every holding on every live quote render');

  const native=read('native/android/TfAssetNativeModule.kt');
  assert.match(native,/fun consumeMarketForceRefreshRequests\(promise:Promise\)/);
  assert.match(native,/remove\("widget_force_refresh_requested_at"\)/);
  assert.match(native,/remove\("monitor_force_refresh_requested_at"\)/);

  for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
    assert.ok(read(core).length>0,'immutable finance core missing: '+core);

  console.log('V3.2.35 runtime performance / AI fast path / native bridge coalescing PASS');
}

void main().catch(error=>{console.error(error);process.exitCode=1;});
