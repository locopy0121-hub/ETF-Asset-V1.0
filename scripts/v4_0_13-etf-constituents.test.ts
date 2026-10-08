import assert from 'node:assert/strict';
import {parseYuantaConstituents,parseMoneyDjConstituents} from '../src/market/etfConstituents';

// Catch reading only the five SSR rows, executing the external script, mixing
// other ETFs, or substituting a region-allocation date for the holding date.
const yuanta=`<h2>0050 元大台灣50</h2><h3>基金權重-股票</h3>交易日期: 2026/10/08
<script>window.__NUXT__=(function(a,b,c,d){return {FundWeights:{StockWeights:[
{code:a,name:b,weights:56.52,qty:565219945},
{code:c,name:d,weights:6.26,qty:34037924}],BondWeights:[]}}}("2330","台積電","2454","聯發科"));</script>`;
const y=parseYuantaConstituents(yuanta,'0050',123);
assert.ok(y,'complete Yuanta payload should yield constituents');
assert.equal(y.asOf,'2026-10-08');
assert.equal(y.complete,true);
assert.deepEqual(y.rows,[{symbol:'2330',name:'台積電',weight:56.52},{symbol:'2454',name:'聯發科',weight:6.26}]);
assert.equal(parseYuantaConstituents(yuanta,'0056',123),null,'wrong ETF must be rejected');
assert.equal(parseYuantaConstituents(yuanta.replace('2026/10/08','2026/02/30'),'0050',123),null,'impossible dates must be rejected');
assert.equal(parseYuantaConstituents(yuanta.replace('56.52','101'),'0050',123),null,'invalid weights must not enter cache');
assert.equal(parseYuantaConstituents(yuanta.replace('"2330"','globalThis.pwned=true'),'0050',123),null,'scripts must never execute');
assert.equal((globalThis as any).pwned,undefined);
assert.equal(parseYuantaConstituents(yuanta.replace('function(a,b,c,d)','function(a,b,c,d,e,f)').replace('"聯發科"));','"聯發科",-.02,.02));'),'0050',123)?.rows.length,2,'Nuxt compact decimal arguments are data, not executable expressions');
assert.equal(parseYuantaConstituents(yuanta.replace('function(a,b,c,d)','function(a,b,c,d,e)').replace('"聯發科"));','"聯發科",Array(7)));'),'0050',123)?.rows.length,2,'unused sparse-array markers should not discard stocks');

const dj=`<title>富邦台50〈006208.TW〉</title>資料日期：2026/08/31
<div>持股明細</div><div>資料日期：2026/10/08</div>
<table><tr><th>個股名稱</th><th>投資比例(%)</th><th>持有股數</th></tr>
<tr><td><a>聯發科(2454.TW)</a></td><td>6.26</td><td>1,000</td></tr>
<tr><td><a>台積電(2330.TW)</a></td><td>56.49</td><td>2,000</td></tr></table>`;
const m=parseMoneyDjConstituents(dj,'006208',123);
assert.ok(m);
assert.equal(m.asOf,'2026-10-08');
assert.equal(m.rows[0]!.symbol,'2330','descending weight order');
assert.equal(m.rows[0]!.name,'台積電');
assert.equal(m.rows[0]!.weight,56.49);
assert.equal(m.complete,true);
assert.equal(parseMoneyDjConstituents(dj+'<a href="Basic0007B.xdjhtm?etfid=006208.TW">全部</a>','006208',123)?.complete,false);
assert.equal(parseMoneyDjConstituents(dj,'00878',123),null);
assert.equal(parseMoneyDjConstituents(dj.replace('56.49','--'),'006208',123),null,'incomplete numeric rows must not be silently dropped');
assert.equal(parseMoneyDjConstituents(dj.replace('2026/10/08','2026/13/08'),'006208',123),null);
console.log('ETF issuer payload, full constituents, source date, identity, weights and no-script-execution: PASS');
