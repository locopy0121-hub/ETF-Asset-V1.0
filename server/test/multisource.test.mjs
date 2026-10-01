import test from 'node:test';
import assert from 'node:assert/strict';
import {OfficialSources} from '../src/sources.mjs';

const now=Date.parse('2026-10-01T11:07:36+08:00');
const fugleBody={
  date:'2026-10-01',exchange:'TWSE',market:'TSE',symbol:'0050',name:'元大台灣50',
  previousClose:112.05,closePrice:112.30,change:0.25,changePercent:0.22,
  total:{tradeVolume:32100,time:now*1000},
  lastTrade:{price:112.30,time:now*1000},
  lastUpdated:now*1000,
};
const misBody={msgArray:[
  {c:'0050',n:'元大台灣50',d:'20261001',t:'11:07:35',z:'112.29',y:'112.05'},
]};

test('Fugle is primary and valid quote prevents unnecessary MIS request',async()=>{
  let misCalls=0,fugleCalls=0;
  const feed=new OfficialSources({
    fugleApiKey:'test-key',
    fetchImpl:async(url)=>{
      if(url.includes('api.fugle.tw')){fugleCalls++;return {ok:true,status:200,json:async()=>fugleBody};}
      if(url.includes('mis.twse.com.tw')){misCalls++;return {ok:true,status:200,json:async()=>misBody};}
      return {ok:true,status:200,json:async()=>[]};
    },
  });
  const out=await feed.refresh(['0050'],{now});
  assert.equal(out.quotes[0]?.source,'FUGLE');
  assert.equal(out.quotes[0]?.currentPrice,112.3);
  assert.equal(out.quotes[0]?.volume,32100);
  assert.equal(fugleCalls,1);
  assert.equal(misCalls,0,'valid Fugle trade should remain primary');
  const cached=await feed.refresh(['0050'],{now:now+1000});
  assert.equal(cached.quotes[0]?.source,'FUGLE');
  assert.equal(fugleCalls,1,'REST bootstrap hot cache prevents 1-second API polling');
});

test('three Fugle 429 failures open circuit and fail over to MIS',async()=>{
  let misCalls=0,fugleCalls=0;
  const feed=new OfficialSources({
    fugleApiKey:'test-key',
    breakerThreshold:3,
    breakerCooldownMs:300_000,
    fetchImpl:async(url)=>{
      if(url.includes('api.fugle.tw')){fugleCalls++;return {ok:false,status:429,json:async()=>({})};}
      if(url.includes('mis.twse.com.tw')){misCalls++;return {ok:true,status:200,json:async()=>misBody};}
      return {ok:true,status:200,json:async()=>[]};
    },
  });
  for(let i=0;i<3;i++){
    const out=await feed.refresh(['0050'],{now:now+i*1000});
    assert.equal(out.quotes[0]?.source,'TWSE_MIS');
  }
  assert.equal(fugleCalls,3);
  assert.equal(misCalls,3);
  assert.equal(feed.health(now+4000).FUGLE.state,'OPEN');
  const fourth=await feed.refresh(['0050'],{now:now+4000});
  assert.equal(fourth.quotes[0]?.source,'TWSE_MIS');
  assert.equal(fugleCalls,3,'open Fugle circuit must skip REST network');
  assert.equal(misCalls,4);
});

test('Shioaji normalized read-only bridge backs up missing primary quotes',async()=>{
  const feed=new OfficialSources({
    shioajiBridgeUrl:'https://quotes.internal.example',
    fetchImpl:async(url)=>{
      if(url.includes('mis.twse.com.tw'))
        return {ok:true,status:200,json:async()=>({msgArray:[]})};
      if(url.includes('quotes.internal.example'))
        return {ok:true,status:200,json:async()=>({quotes:[{
          symbol:'0050',name:'元大台灣50',close:112.28,previousClose:112.05,
          datetime:new Date(now).toISOString(),total_volume:31000,exchange:'TSE',
        }]})};
      return {ok:true,status:200,json:async()=>[]};
    },
  });
  const out=await feed.refresh(['0050'],{now});
  assert.equal(out.quotes[0]?.source,'SHIOAJI');
  assert.equal(out.quotes[0]?.quality,'backup_realtime');
  assert.equal(out.quotes[0]?.currentPrice,112.28);
});

test('Fugle parser never promotes trial quote over actual lastTrade',async()=>{
  const body={...fugleBody,isTrial:true,lastPrice:999,lastTrial:{price:999,time:now*1000}};
  const feed=new OfficialSources({
    fugleApiKey:'test-key',
    fetchImpl:async(url)=>{
      if(url.includes('api.fugle.tw'))return {ok:true,status:200,json:async()=>body};
      if(url.includes('mis.twse.com.tw'))return {ok:true,status:200,json:async()=>({msgArray:[]})};
      return {ok:true,status:200,json:async()=>[]};
    },
  });
  const out=await feed.refresh(['0050'],{now});
  assert.equal(out.quotes[0]?.currentPrice,112.3);
});
