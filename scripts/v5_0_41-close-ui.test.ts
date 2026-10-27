import assert from 'node:assert/strict';
import {marketRowsToRuntimeQuotes} from '../src/market/unifiedMarketAdapter';
import {marketValuationQuoteFromRow} from '../src/market/marketCenterViews';
import type {UnifiedMarketSnapshot,UnifiedMarketRow} from '../src/native/TfAssetNativeBridge';

const now=Date.parse('2026-10-27T12:16:00Z');
const fugleAt=Date.parse('2026-10-27T04:56:23Z');
const closeAt=Date.parse('2026-10-27T05:30:00Z');
const quote=(currentPrice:number,sourceQuoteAt:number,source:'FUGLE'|'TWSE_MIS'):UnifiedMarketRow=>({
 symbol:'2330',name:'台積電',currentPrice,previousClose:2385,officialTradePrice:source==='TWSE_MIS'?currentPrice:null,
 sourceQuoteAt,sessionDate:'2026-10-27',source,quality:'trade',priceType:'REALTIME_TRADE',
 isFallback:false,market:'TSE',statusMessage:'verified actual trade',checkedAt:now,
 quoteStatus:'DELAYED',
});
const snap=(row:UnifiedMarketRow,version:number):UnifiedMarketSnapshot=>({
 version,queriedAt:now,phase:'afterHours',missing:[],quotes:[row],
});
const before=marketRowsToRuntimeQuotes(snap(quote(2385,fugleAt,'FUGLE'),1),[],now);
const after=marketRowsToRuntimeQuotes(snap(quote(2400,closeAt,'TWSE_MIS'),2),before,now);
assert.equal(before[0]?.currentPrice,2385);
assert.equal(after[0]?.currentPrice,2400);
assert.equal(after[0]?.previousClose,2385);
assert.equal(after[0]?.previousCloseKnown,true);
assert.equal(after[0]?.source,'TWSE_MIS');
assert.equal(after[0]?.marketDataVersion,2);
const holding=marketValuationQuoteFromRow(after[0],{now});
assert.equal(holding?.currentPrice,2400,'after-hours holdings must use reconciled close');
assert.equal(Number(((holding!.currentPrice-holding!.previousClose)/holding!.previousClose*100).toFixed(2)),0.63);
console.log('V5.0.41 native-to-UI close propagation and valuation PASS');
