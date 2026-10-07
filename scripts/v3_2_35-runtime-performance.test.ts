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
  assert.match(market,/const batch=await center\.refresh\(\{/,
    'V4 MarketDataCenter refresh result must be consumed directly');
  assert.match(market,/if\(batch\.quotes\.size>0\)/,
    'direct MarketDataCenter batch must drive runtime quote publication metadata');
  assert.doesNotMatch(market,/refreshUnifiedMarketData\(/,
    'V4 runtime must not reintroduce the retired native refresh path');
  assert.doesNotMatch(market,/loadUnifiedMarketData\(/,
    '1-second V4 refresh must not immediately re-read the same native SQLite snapshot');

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
