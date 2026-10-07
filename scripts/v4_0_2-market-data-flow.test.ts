import assert from 'node:assert/strict';
import fs from 'node:fs';
import {marketRowsToRuntimeQuotes} from '../src/market/unifiedMarketAdapter';
import {marketValuationComplete} from '../src/market/marketCenterViews';
import {calculateCanonicalLedgerSnapshot,freezeTradeEntry} from '../src/finance/canonicalLedger';
import {ensureLedgerQuoteCoverage} from '../src/finance/runtimeQuoteCoverage';
import type {UnifiedMarketSnapshot} from '../src/native/TfAssetNativeBridge';
const fixture=JSON.parse(fs.readFileSync(process.argv[2]??'/tmp/tf-native-bridge-fixture.json','utf8')) as UnifiedMarketSnapshot&{queriedAt:number};
const quotes=marketRowsToRuntimeQuotes(fixture,[],fixture.queriedAt);
assert.equal(quotes.length,9,'every native verified price must reach the App');
assert.ok(marketValuationComplete(quotes,fixture.quotes.map(row=>row.symbol),{now:fixture.queriedAt}));
for(const row of fixture.quotes){
  const quote=quotes.find(item=>item.symbol===row.symbol)!;
  assert.equal(quote.currentPrice,row.currentPrice,'App and center must match exactly');
  assert.equal(quote.sourceQuoteAt,row.sourceQuoteAt,'receipt time cannot replace source time');
  assert.equal(quote.quoteStatus,row.quoteStatus,'freshness metadata must survive the bridge');
}
const entries=quotes.map((quote,i)=>freezeTradeEntry({id:'regression-'+i,date:'2026-10-01',kind:'buy',symbol:quote.symbol,name:quote.name,shares:170,price:100,tradeMode:'ROUND_LOT'}));
const snapshot=calculateCanonicalLedgerSnapshot({initialCash:0,entries,quotes:ensureLedgerQuoteCoverage(entries,quotes)});
for(const holding of snapshot.holdings){
  const row=fixture.quotes.find(item=>item.symbol===holding.etfCode)!;
  assert.equal(holding.currentPrice,row.currentPrice);
  assert.equal(holding.currentMarketValue,Math.floor(170*row.currentPrice));
}
const rejected={...fixture,quotes:fixture.quotes.map(row=>({...row,quality:'backup_realtime',priceType:'BACKUP_REALTIME',source:'TWSE_MIS'}))};
assert.equal(marketRowsToRuntimeQuotes(rejected as UnifiedMarketSnapshot,[],fixture.queriedAt).length,0,'invalid retired provenance must still be rejected');
console.log('Native JSON → App quotes → existing canonical valuation: nine symbols PASS');
