import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveTwsePriceDecision,pickBetterTwseRow} from '../src/market/twseQuoteParser';
import {isTrustedMarketRow,normalizeUnifiedIntradaySeries} from '../src/market/unifiedMarketAdapter';

const now=Date.parse('2026-10-02T09:46:10+08:00');

const pzBug={
  c:'0050',n:'元大台灣50',d:'20261002',t:'09:46:10',
  z:'-',pz:'112.90',b:'112.35_112.30_',a:'112.40_112.45_',y:'112.90',
};
const decision=resolveTwsePriceDecision(pzBug);
assert.ok(decision);
assert.equal(decision.price,112.35);
assert.equal(decision.quality,'bid_ask');
assert.equal(decision.priceType,'BID_ASK');
assert.equal(decision.officialTradePrice,null);

assert.equal(resolveTwsePriceDecision({
  c:'0050',d:'20261002',t:'09:46:10',z:'-',pz:'112.90',b:'',a:'',y:'112.90',
}),null,'pz/previous-close only row must not become currentPrice');

assert.equal(resolveTwsePriceDecision({
  c:'0050',d:'20261002',t:'09:46:10',z:'112.35',pz:'112.90',b:'112.30_',a:'112.40_',y:'112.90',
})?.quality,'trade');

const picked=pickBetterTwseRow(
  {c:'0050',z:'-',pz:'112.90',b:'',a:'',y:'112.90'},
  {c:'0050',z:'-',pz:'112.90',b:'112.35_',a:'112.40_',y:'112.90'},
);
assert.equal(String(picked.b),'112.35_');

const yahooRow={
  symbol:'0050',name:'元大台灣50',currentPrice:112.35,previousClose:112.90,
  officialTradePrice:null,sourceQuoteAt:now,quality:'backup_realtime',source:'YAHOO',
  priceType:'BACKUP_REALTIME',isFallback:true,market:'TSE',statusMessage:'Yahoo backup',checkedAt:now,
};
assert.equal(isTrustedMarketRow(yahooRow,now),true);

const legacyMisPz={...yahooRow,source:'TWSE_MIS',statusMessage:'legacy pz'};
assert.equal(isTrustedMarketRow(legacyMisPz,now),false,'legacy TWSE_MIS backup_realtime must be rejected');

const series=normalizeUnifiedIntradaySeries({
  date:'2026-10-02',previousClose:112.90,points:[
    {at:now,price:112.90,quality:'backup_realtime',source:'TWSE_MIS'},
    {at:now+1000,price:112.35,quality:'backup_realtime',source:'YAHOO'},
  ],
},now+2000);
assert.ok(series);
assert.equal(series.points.length,1);
assert.equal(series.points[0]?.source,'YAHOO');

const native=fs.readFileSync('native/android/TfAssetMarketCenter.kt','utf8');
assert.doesNotMatch(native,/val pz=finitePositive\(row\.optString\("pz"/);
assert.match(native,/if\(missing\.isNotEmpty\(\)&&!isLiveSession\(now\)\)/);
assert.match(native,/source=="TWSE_MIS"&&quality=="backup_realtime"/);

const db=fs.readFileSync('native/android/TfAssetMarketDatabase.kt','utf8');
assert.match(db,/tf_asset_market_center_v1\.db",null,7/);
assert.match(db,/quality=\? OR \(source=\? AND price_type=\?\)/);
assert.match(db,/arrayOf\("previous_close","TWSE_MIS","BACKUP_REALTIME"\)/);

const serverParser=fs.readFileSync('server/src/parser.mjs','utf8');
assert.doesNotMatch(serverParser,/pz=positive\(row\?\.pz\)/);
const serverSources=fs.readFileSync('server/src/sources.mjs','utf8');
assert.match(serverSources,/isSession\(now\)\?\[\]/);

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8'));
assert.equal(pkg.version,'3.2.48');
assert.equal(app.expo.version,'3.2.48');
assert.equal(app.expo.android.versionCode,30248);
assert.equal(app.expo.ios.buildNumber,'30248');

for(const locked of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(fs.existsSync(locked),locked);

console.log('V3.2.48 live quote integrity / pz-previous-close regression PASS');
