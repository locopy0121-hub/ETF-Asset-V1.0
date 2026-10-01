import test from 'node:test';
import assert from 'node:assert/strict';
import {OfficialSources} from '../src/sources.mjs';
import {assertZeroCostSourceSet,isZeroCostSourceAllowed,zeroCostPolicy} from '../src/zeroCostPolicy.mjs';

const now=Date.parse('2026-10-01T11:07:36+08:00');

test('strict zero-cost registry allows only production zero-cost market sources',()=>{
  for(const source of ['TWSE_MIS','TWSE_DAILY','TPEX_DAILY','YAHOO'])
    assert.equal(isZeroCostSourceAllowed(source),true,source);
  for(const source of ['FUGLE','SHIOAJI','TWELVE_DATA','MARKETSTACK'])
    assert.equal(isZeroCostSourceAllowed(source),false,source);
  assert.doesNotThrow(()=>assertZeroCostSourceSet(['TWSE_MIS','YAHOO']));
  assert.throws(()=>assertZeroCostSourceSet(['TWSE_MIS','FUGLE']),/ZERO_COST_POLICY_BLOCKED/);
});

test('credentials cannot bypass zero-cost production policy',()=>{
  const feed=new OfficialSources({
    fugleApiKey:'paid-or-free-key-must-not-decide-policy',
    shioajiBridgeUrl:'https://quotes.internal.example',
  });
  assert.equal(feed.configured('FUGLE'),false);
  assert.equal(feed.configured('SHIOAJI'),false);
  assert.equal(feed.configured('TWSE_MIS'),true);
  assert.equal(feed.configured('YAHOO'),true);
  assert.equal(feed.health(now).FUGLE.policy.allowed,false);
  assert.equal(feed.health(now).SHIOAJI.policy.allowed,false);
  assert.equal(feed.health(now).TWSE_MIS.policy.monetaryCost,0);
});

test('MIS failure skips blocked conditional sources and falls back to zero-cost Yahoo',async()=>{
  let fugleCalls=0,shioajiCalls=0,yahooCalls=0;
  const feed=new OfficialSources({
    fugleApiKey:'test-key',
    shioajiBridgeUrl:'https://quotes.internal.example',
    fetchImpl:async url=>{
      if(url.includes('mis.twse.com.tw'))return {ok:false,status:429,json:async()=>({})};
      if(url.includes('api.fugle.tw')){fugleCalls++;return {ok:true,status:200,json:async()=>({})};}
      if(url.includes('quotes.internal.example')){shioajiCalls++;return {ok:true,status:200,json:async()=>({quotes:[]})};}
      if(url.includes('query1.finance.yahoo.com')){
        yahooCalls++;
        return {ok:true,status:200,json:async()=>({chart:{result:[{meta:{
          regularMarketPrice:112.3,
          regularMarketTime:Math.floor(now/1000),
          previousClose:112.05,
          shortName:'元大台灣50',
          regularMarketVolume:32100,
        }}]}})};
      }
      return {ok:true,status:200,json:async()=>[]};
    },
  });
  const out=await feed.refresh(['0050'],{now});
  assert.equal(out.quotes[0]?.source,'YAHOO');
  assert.equal(out.quotes[0]?.currentPrice,112.3);
  assert.equal(fugleCalls,0);
  assert.equal(shioajiCalls,0);
  assert.equal(yahooCalls,1);
});

test('policy metadata never permits auto billing',()=>{
  for(const source of ['TWSE_MIS','TWSE_DAILY','TPEX_DAILY','YAHOO']){
    const policy=zeroCostPolicy(source);
    assert.equal(policy.allowed,true);
    assert.equal(policy.autoBillingAllowed,false);
    assert.equal(policy.monetaryCost,0);
  }
});
