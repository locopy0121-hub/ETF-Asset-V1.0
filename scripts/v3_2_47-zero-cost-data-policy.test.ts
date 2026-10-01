import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {
  ZERO_COST_DATA_SOURCES,
  EXCLUDED_METERED_OR_CONDITIONAL_SOURCES,
  assertZeroCostSourceSet,
  isZeroCostDataSource,
} from '../src/dataSources/zeroCostRegistry';
import {resolveSecurityViaOpenFigi} from '../src/market/securityResolver';

for(const source of ZERO_COST_DATA_SOURCES){
  assert.equal(source.monetaryCost,0,source.id);
  assert.equal(source.creditCardRequired,false,source.id);
  assert.equal(source.autoBillingAllowed,false,source.id);
  assert.equal(source.trialOnly,false,source.id);
  assert.equal(source.productionEligible,true,source.id);
}
for(const required of ['TWSE_OPENAPI','TWSE_MIS','TPEX_OPENAPI','OPENFIGI','PORTFOLIO_OPTIMIZER','FRED'])
  assert.equal(isZeroCostDataSource(required),true,required);
for(const blocked of ['TWELVE_DATA','MARKETSTACK','EODHD','ALPHA_VANTAGE','FINBRIDGE','FUGLE','SHIOAJI']){
  assert.ok(EXCLUDED_METERED_OR_CONDITIONAL_SOURCES.includes(blocked as never),blocked);
  assert.equal(isZeroCostDataSource(blocked),false,blocked);
}
assert.doesNotThrow(()=>assertZeroCostSourceSet(['TWSE_MIS','OPENFIGI','FRED']));
assert.throws(()=>assertZeroCostSourceSet(['TWSE_MIS','FUGLE']),/ZERO_COST_POLICY_BLOCKED/);

let body='';
const fakeFetch=(async(_input:RequestInfo|URL,init?:RequestInit)=>{
  body=String(init?.body??'');
  return new Response(JSON.stringify([{data:[{
    figi:'BBGTEST009816',ticker:'009816',name:'凱基台灣TOP50',
  }]}]),{status:200,headers:{'Content-Type':'application/json'}});
}) as typeof fetch;
const mapped=await resolveSecurityViaOpenFigi('009816',fakeFetch);
assert.equal(mapped?.symbol,'009816');
assert.equal(mapped?.figi,'BBGTEST009816');
assert.equal(mapped?.securityId,'FIGI:BBGTEST009816');
assert.ok(body.includes('"exchCode":"TT"'));
assert.ok(body.includes('"idType":"TICKER"'));

const serverPolicy=readFileSync('server/src/zeroCostPolicy.mjs','utf8');
for(const token of ['ZERO_COST_ONLY=true','TWSE_MIS','TWSE_DAILY','TPEX_DAILY','YAHOO','FUGLE','SHIOAJI','autoBillingAllowed:false'])
  assert.ok(serverPolicy.includes(token),token);

const sources=readFileSync('server/src/sources.mjs','utf8');
assert.ok(sources.includes("from './zeroCostPolicy.mjs'"));
assert.ok(sources.includes("if(!isZeroCostSourceAllowed(source))return false;"));
assert.ok(sources.includes('policy:zeroCostPolicy(source)'));

const aiCatalog=readFileSync('src/ai/aiIngredientCatalog.ts','utf8');
assert.ok(aiCatalog.includes('OpenFIGI zero-cost fallback'));

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const app=JSON.parse(readFileSync('app.json','utf8'));
assert.equal(pkg.version,'3.2.47');
assert.equal(app.expo.version,'3.2.47');
assert.equal(app.expo.android.versionCode,30247);

console.log('V3.2.47 zero-cost data-source policy / OpenFIGI fallback PASS');
