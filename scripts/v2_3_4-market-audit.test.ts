import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditMarketSymbols,MARKET_AUDIT_LABEL} from '../src/market/marketQuoteAudit';
import type {RuntimeQuote} from '../src/finance/financeSeed';
const now=Date.parse('2026-09-25T01:00:00+08:00');
const row=(symbol:string,quality:'trade'|'official_close',sourceAt:number):RuntimeQuote=>({
  symbol,name:symbol,currentPrice:25,previousClose:24,liquidationTradeMode:'ROUND_LOT',
  dividendFrequency:4,sparkline:[25],quality,source:quality==='trade'?'TWSE_MIS':'TWSE_DAILY',
  sourceQuoteAt:sourceAt,checkedAt:now,marketDataVersion:78,
});
const result=auditMarketSymbols(
  ['0050','00919','00878','00929','0050','###'],[
    row('0050','trade',now-3_000),
    row('00919','official_close',now-86_400_000),
    row('00878','trade',now-120_000),
    {...row('00929','trade',now-1_000),source:undefined},
  ],['00878'],now,
);
assert.deepEqual(result.map(x=>x.symbol),['0050','00919','00878','00929']);
assert.deepEqual(result.map(x=>x.status),['verified_trade','verified_official_close','previous_verified','unavailable']);
assert.equal(result[0]?.sourceQuoteAt,now-3_000);
assert.equal(result[0]?.checkedAt,now);
assert.equal(result[0]?.marketDataVersion,78);
assert.equal(result[1]?.status,'verified_official_close','official close is not a live trade');
assert.equal(result[2]?.price,25,'previous official quote retained but labelled old');
assert.equal(result[3]?.price,null,'unverified seed must not be a trusted price');
assert.equal(auditMarketSymbols(['0050'],[row('0050','trade',now+150_000)],[],now)[0]?.status,'unavailable');
assert.equal(auditMarketSymbols(['00713'],[],[],now)[0]?.status,'unavailable');
assert.match(MARKET_AUDIT_LABEL.previous_verified,/保留上次/);
const read=(path:string)=>readFileSync(path,'utf8');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'2.3.4');assert.equal(app.expo.version,'2.3.4');
assert.equal(app.expo.android.versionCode,20304);
const screen=read('src/screens/SettingsScreen.tsx'),market=read('src/market/MarketRuntime.tsx');
assert.match(screen,/逐檔行情來源對帳/);
assert.match(screen,/auditMarketSymbols\(trackedSymbols,quotes,missingSymbols\)/);
assert.match(market,/trackedSymbols:readonly string\[\]/);
assert.match(market,/setMissingSymbols\(Array\.isArray\(snapshot\.missing\)/);
console.log('V2.3.4 source audit: verified trade, official close, old verified quote, missing quote, no fake timestamps: PASS');
