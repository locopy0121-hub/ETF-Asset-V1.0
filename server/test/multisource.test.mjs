import test from 'node:test';
import assert from 'node:assert/strict';
import {fugleQuoteFromPayload,shioajiQuoteFromPayload} from '../src/parser.mjs';
import {OfficialSources} from '../src/sources.mjs';

const now=Date.parse('2026-10-01T11:07:36+08:00');
const fugleBody={date:'2026-10-01',exchange:'TWSE',market:'TSE',symbol:'0050',name:'元大台灣50',previousClose:112.05,closePrice:112.30,change:0.25,changePercent:0.22,total:{tradeVolume:32100,time:now*1000},lastTrade:{price:112.30,time:now*1000},lastUpdated:now*1000};

test('Fugle parser remains readable while source policy blocks runtime use',()=>{
  const quote=fugleQuoteFromPayload(fugleBody,'0050',now);
  assert.equal(quote?.source,'FUGLE');
  assert.equal(quote?.currentPrice,112.3);
  const feed=new OfficialSources({fugleApiKey:'test-key'});
  assert.equal(feed.configured('FUGLE'),false);
});

test('Shioaji parser remains readable while source policy blocks runtime use',()=>{
  const quote=shioajiQuoteFromPayload({symbol:'0050',name:'元大台灣50',close:112.28,previousClose:112.05,datetime:new Date(now).toISOString(),total_volume:31000,exchange:'TSE'},'0050',now);
  assert.equal(quote?.source,'SHIOAJI');
  assert.equal(quote?.quality,'backup_realtime');
  const feed=new OfficialSources({shioajiBridgeUrl:'local-test'});
  assert.equal(feed.configured('SHIOAJI'),false);
});

test('Fugle parser never promotes trial quote over actual lastTrade',()=>{
  const quote=fugleQuoteFromPayload({...fugleBody,isTrial:true,lastPrice:999,lastTrial:{price:999,time:now*1000}},'0050',now);
  assert.equal(quote?.currentPrice,112.3);
});
