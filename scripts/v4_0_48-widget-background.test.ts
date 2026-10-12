import type {UnifiedMarketRow} from '../src/native/TfAssetNativeBridge';
import assert from 'node:assert/strict';
import {buildBackgroundWidgetSnapshot} from '../src/widget/backgroundWidgetProjection';
const now=Date.parse('2026-10-12T03:00:00Z');
const ledger={schema:4,initialCash:0,cashConfigured:false,entries:[{id:'b1',kind:'buy',symbol:'0050',name:'元大台灣50',date:'2026-10-01',shares:100,price:10,tradeMode:'ROUND_LOT'}]};
const quote:UnifiedMarketRow={officialTradePrice:11,symbol:'0050',name:'元大台灣50',currentPrice:11,previousClose:10,sourceQuoteAt:now,sessionDate:'2026-10-12',source:'FUGLE',quality:'trade',priceType:'REALTIME_TRADE',quoteStatus:'LIVE',streamingHealthy:true,streamingCheckedAt:now,isFallback:false,market:'TSE',statusMessage:'live',checkedAt:now};
const snapshot=buildBackgroundWidgetSnapshot(ledger,{version:2,queriedAt:now,phase:'live',quotes:[quote]},[],now)!;
assert.equal(snapshot.asset.marketValue,1100);
assert.equal(snapshot.holdings[0]?.pnl,59,'Widget must use canonical fees/tax, not a second PnL formula');
assert.equal(snapshot.holdings[0]?.updatedAt,new Date(now).toISOString());
assert.equal(snapshot.holdings[0]?.streamingHealthy,true);
assert.equal(buildBackgroundWidgetSnapshot({...ledger,schema:999},{version:2,queriedAt:now,quotes:[quote]},[],now),null);
assert.equal(buildBackgroundWidgetSnapshot(null,{version:2,queriedAt:now,quotes:[quote]},[],now),null);
console.log('V4.0.49 headless Widget canonical market value/PnL/ledger validation PASS');

const holidayNow=Date.parse('2026-10-13T03:00:00Z');
const holiday=buildBackgroundWidgetSnapshot(ledger,{version:3,queriedAt:holidayNow,closedDates:['2026-10-13'],quotes:[{...quote,streamingHealthy:false,quoteStatus:'DELAYED'}]},[],holidayNow)!;
assert.equal(holiday.asset.marketValue,1100,'official closure must retain prior session reference valuation');
