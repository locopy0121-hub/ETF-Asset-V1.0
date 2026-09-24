import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isNewSourceTick,parseTwseQuoteSourceAt} from '../src/market/quoteFreshness';
import {buildSharedSnapshot} from '../src/finance/sharedSnapshotAdapter';
import type {CanonicalLedgerSnapshot} from '../src/finance/canonicalLedger';
import type {HoldingQuote} from '../src/domain/uiModels';

const first=Date.parse('2026-09-24T09:01:05+08:00');
const row={d:'20260924',t:'09:01:05',c:'0050',z:'112.45'};
assert.equal(parseTwseQuoteSourceAt(row,first+1_000),first,'Use the actual source timestamp, not HTTP receipt');
assert.equal(parseTwseQuoteSourceAt({...row,t:'09:01:06'},first+2_000),first+1_000);
assert.equal(parseTwseQuoteSourceAt(row,first-121_000),null,'Future source ticks must not be trusted');
assert.equal(parseTwseQuoteSourceAt({...row,d:'20260230'},first+1_000),null,'Reject invalid calendar dates');
assert.equal(parseTwseQuoteSourceAt({...row,t:'-'},first+1_000),null,'Missing trade time is not proof of fresh quotes');
assert.equal(parseTwseQuoteSourceAt({...row,t:'99:99:99'},first+1_000),null);
assert.equal(parseTwseQuoteSourceAt(row,first+32*86_400_000),null,'Reject stale month-old source dates');
assert.equal(isNewSourceTick(first,null),true);
assert.equal(isNewSourceTick(first,first),false,'A successful repeated HTTP poll must not tick the last-update clock');
assert.equal(isNewSourceTick(first,first+1_000),false);
assert.equal(isNewSourceTick(first+1_000,first),true,'New source time is a verifiable quote even with unchanged price');
assert.equal(isNewSourceTick(null,first),false);

const canonical={
  portfolio:{totalMarketValue:7_172,totalUnrealizedProfit:301,realizedNetPnL:11,totalDividendsReceived:70,totalPnl:382},
  cashBalance:90,
} as unknown as CanonicalLedgerSnapshot;
const holdings=[
  {symbol:'0050',name:'元大台灣50',price:112.45,previousClose:111.85,shares:46,avgCost:100,marketValue:5_172,pnl:291,roi:6.3,comprehensivePnl:301},
  {symbol:'00878',name:'國泰永續高股息',price:35,previousClose:35.2,shares:57,avgCost:34,marketValue:2_000,pnl:10,roi:0.5,comprehensivePnl:10},
] as unknown as HoldingQuote[];
const snapshot=buildSharedSnapshot({canonical,holdings,generatedAt:first+8_000,quoteSourceTimes:[{symbol:'0050',sourceQuoteAt:first},{symbol:'00878',sourceQuoteAt:null}]});
assert.equal(snapshot.holdings[0]?.updatedAt,new Date(first).toISOString());
assert.equal(snapshot.holdings[1]?.updatedAt,null,'One fast quote must not falsely date all other holdings');
assert.equal(snapshot.asset.marketValue,7_172,'Snapshot still copies existing canonical financial result');
assert.equal(snapshot.generatedAt,new Date(first+8_000).toISOString(),'Snapshot generation is not conflated with quote freshness');

// Native behavior is independently compiled by Gradle; these source guards prevent regression
// but are intentionally not a substitute for testing an actual Android Widget.
const native=readFileSync('native/android/TfAssetWidgetProvider.kt','utf8');
const bridge=readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const market=readFileSync('src/market/MarketRuntime.tsx','utf8');
assert.match(native,/sourceQuoteAt\(row,now\)/);
assert.match(native,/sourceAt<=maxOf\(previousOverrideAt,canonicalAt\)/);
assert.match(native,/putLong\("wall_market_source_at",newestSourceAt\)/);
// V2.1.21 copy is more precise: a successful request can return no newer VERIFIED TRADE.
assert.match(native,/未有較新成交/,'No new exchange trade must preserve old quote timestamps');
assert.match(bridge,/pending\.length\(\)==0/);
assert.match(bridge,/canonicalAt<nativeAt/);
assert.match(bridge,/TfAssetWidgetProvider\.ACTION_FORCE_REFRESH/,'Manual Native call must fetch, not just repaint');
assert.match(market,/if\(result\.updatedCount===0\)/);
assert.doesNotMatch(market,/setLastSuccessAt\(Date\.now\(\)\)/);
const ui=readFileSync('src/components/widget/WidgetControlPanel.tsx','utf8');
assert.match(ui,/刷新秒數＝前景查詢間隔/);
console.log('V2.1.20 exchange timestamp parser, stale/unchanged behavior, per-symbol snapshot and Native contract smoke: PASS; device/background exact-second scheduling pending');
