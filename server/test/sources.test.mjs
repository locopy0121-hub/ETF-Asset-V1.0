import test from 'node:test';
import assert from 'node:assert/strict';
import {OfficialSources} from '../src/sources.mjs';
const now=Date.parse('2026-09-24T15:00:00+08:00');
const mis={msgArray:[
  {c:'0050',n:'元大台灣50',d:'20260924',t:'13:28:05',z:'113.20',y:'112.20'},
  {c:'00713',d:'20260924',t:'13:28:05',z:'-',pz:'53.44',b:'53.42'},
]};
const urls=[];
const feed=new OfficialSources({dailyCacheMs:300_000,fetchImpl:async(url)=>{
  urls.push(url);
  const data=url.includes('getStockInfo')?mis:url.includes('STOCK_DAY_ALL')
    ?[{Code:'0050',Name:'元大台灣50',Date:'1150924',ClosingPrice:'113.22'}]
    :[{SecuritiesCompanyCode:'00713',CompanyName:'元大高息低波',Date:'1150924',Close:'53.25'}];
  return {ok:true,json:async()=>data};
}});
test('missing z ignores pz and uses live order book before other fallbacks',async()=>{
  const result=await feed.refresh(['0050','00713'],{now});
  const a=result.quotes.find(q=>q.symbol==='0050');
  const b=result.quotes.find(q=>q.symbol==='00713');
  assert.equal(a.quality,'trade');
  assert.equal(a.currentPrice,113.2);
  assert.equal(b.quality,'bid_ask');
  assert.equal(b.currentPrice,53.42);
  assert.equal(b.source,'TWSE_MIS');
  assert.equal(b.priceType,'BID_ASK');
  assert.equal(b.isFallback,true);
  assert.equal(b.officialTradePrice,null);
  assert.ok(urls.length>=1,'MIS must be queried');
  const before=urls.length;
  await feed.refresh(['0050','00713'],{now:now+5000});
  assert.equal(urls.length-before,3,'each poll retries MIS plus both Yahoo market suffixes while bid/ask lacks a realtime trade');
});
test('a down provider leaves other official data available',async()=>{
  const bad=new OfficialSources({fetchImpl:async(url)=>{
    if(url.includes('getStockInfo'))throw new Error('network down');
    return {ok:true,json:async()=>[{Code:'0050',Date:'1150924',Name:'ETF',ClosingPrice:'113.22'}]};
  }});
  const result=await bad.refresh(['0050'],{now});
  assert.equal(result.quotes[0]?.quality,'official_close');
  assert.ok(result.errors.some(s=>s.includes('MIS')));
});

test('live session never promotes previous close or pz to currentPrice',async()=>{
  const t=Date.parse('2026-10-02T09:46:10+08:00');
  const onlyClose=new OfficialSources({fetchImpl:async(url)=>{
    if(url.includes('getStockInfo'))return {ok:true,json:async()=>({msgArray:[
      {c:'0050',n:'元大台灣50',d:'20261002',t:'09:46:10',z:'-',pz:'112.90',b:'',a:'',y:'112.90'},
    ]})};
    if(url.includes('query1.finance.yahoo.com'))throw new Error('backup unavailable');
    throw new Error('daily endpoint must not run in live session');
  }});
  const result=await onlyClose.refresh(['0050'],{now:t});
  assert.equal(result.quotes.length,0);
  assert.ok(result.errors.some(x=>x.includes('YAHOO')));
});
