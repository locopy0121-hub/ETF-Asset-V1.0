import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FALLBACK_QUOTES,type RuntimeQuote} from '../src/finance/financeSeed';
import {restoreVerifiedQuotes,isVerifiedRuntimeQuote} from '../src/market/quoteProvenance';
import {ensureLedgerQuoteCoverage} from '../src/finance/runtimeQuoteCoverage';
import {freezeTradeEntry,calculateCanonicalLedgerSnapshot} from '../src/finance/canonicalLedger';
import {buildSharedSnapshot} from '../src/finance/sharedSnapshotAdapter';

const now=Date.now();
const at=now-60_000;
const verified={symbol:'0050',name:'元大台灣50',currentPrice:112.1,previousClose:111.2,
  sourceQuoteAt:at,liquidationTradeMode:'ROUND_LOT' as const,dividendFrequency:4 as const,sparkline:[112.1]};
assert.equal(restoreVerifiedQuotes(FALLBACK_QUOTES,2,now).length,0,'Hard-coded demo prices are never live quotes');
assert.equal(restoreVerifiedQuotes([verified],1,now).length,0,'Unproven legacy receipt-clock caches must be discarded');
assert.deepEqual(restoreVerifiedQuotes([verified],2,now),[verified],'Verified V2.1.21 trades survive migration');
assert.equal(restoreVerifiedQuotes([{...verified,currentPrice:0}],2,now).length,0,'Zero-price placeholders are never restored');
assert.equal(restoreVerifiedQuotes([{...verified,sourceQuoteAt:null}],2,now).length,0);
assert.equal(restoreVerifiedQuotes([{...verified,sourceQuoteAt:now-32*86_400_000}],2,now).length,0);
assert.equal(isVerifiedRuntimeQuote(verified,now),true);
const ledger=['0050','0056','00406A','00919','00713'].map((symbol,index)=>freezeTradeEntry({
  id:'v221-'+symbol,date:'2026-09-23',kind:'buy',symbol,name:'ETF '+symbol,tradeMode:'ODD_LOT',
  shares:100+index,price:20+index,
}));
const corrupt=[
  {...verified,currentPrice:0,symbol:'0056',sourceQuoteAt:null},
  {...verified,currentPrice:23.84,symbol:'00919',sourceQuoteAt:null},
  {...verified,currentPrice:53.75,symbol:'00713',sourceQuoteAt:null},
] as RuntimeQuote[];
const coverage=ensureLedgerQuoteCoverage(ledger,[verified,...corrupt]);
const named=(symbol:string)=>coverage.find(row=>row.symbol===symbol)!;
assert.equal(coverage.length,5,'All ledger holdings retain quote coverage');
assert.equal(named('0050').currentPrice,112.1);
assert.equal(named('0056').currentPrice,21,'0056 zero placeholder must not destroy valuation');
assert.equal(named('00406A').currentPrice,22,'00406A without quote uses clearly labeled ledger reference');
assert.equal(named('00919').currentPrice,23,'00919 fake seed price must not enter canonical input');
assert.equal(named('00713').currentPrice,24,'00713 fake seed price must not enter canonical input');
const snapshot=calculateCanonicalLedgerSnapshot({initialCash:100000,entries:ledger,quotes:coverage});
assert.equal(snapshot.holdings.length,5);
const share=buildSharedSnapshot({canonical:snapshot,holdings:[{
  symbol:'0056',name:'ETF 0056',quoteVerified:false,price:21,previousClose:21,shares:101,
  avgCost:21,tradeAvg:21,costAvg:21,marketValue:2121,pnl:0,pricePnl:0,roi:0,weight:0,
  cumulativeDividend:0,realizedPnl:0,comprehensivePnl:0,sparkline:[],
}],generatedAt:null,quoteSourceTimes:[]});
assert.equal(share.asset.valuationComplete,false);
assert.equal(share.holdings[0]?.price,null,'Native surfaces must not present trade reference as live');
assert.equal(share.holdings[0]?.marketStatus,'unavailable');
for(const path of ['src/screens/HomeScreen.tsx','src/screens/PortfolioScreen.tsx','src/screens/HoldingDetailScreen.tsx',
  'src/components/HoldingQuoteModule.tsx','src/domain/portfolioList.ts']){
  assert.match(readFileSync(path,'utf8'),/待核對|待取得/,'Unverified valuation visibly labeled: '+path);
}
const market=readFileSync('src/market/MarketRuntime.tsx','utf8');
assert.doesNotMatch(market,/useState<RuntimeQuote\[\]>\(\(\)=>\[\.\.\.FALLBACK_QUOTES\]\)/);
assert.match(market,/restoreVerifiedQuotes/);
assert.match(market,/return old\?\[old\]:\[\]/);
console.log('V2.2.1 cold launch, seed rejection, zero placeholders, historical cache, ledger coverage and cross-surface safety: PASS');
