import test from 'node:test';
import assert from 'node:assert/strict';
import {EtfNavService,parseMisEtfNav} from '../src/nav.mjs';

const now=Date.parse('2026-10-01T11:07:36+08:00');
const payload={a1:[{msgArray:[
  {a:'0050',b:'元大台灣50',e:'112.30',f:'112.10',g:'0.18',i:'20261001',j:'11:07:30'},
]}]};

test('MIS ETF NAV adapter isolates raw field names and preserves source timestamp',()=>{
  const nav=parseMisEtfNav(payload,'0050',now);
  assert.equal(nav?.estimatedNav,112.1);
  assert.equal(nav?.marketPrice,112.3);
  assert.equal(nav?.publishedPremiumDiscountPercent,0.18);
  assert.equal(nav?.sourceAt,Date.parse('2026-10-01T11:07:30+08:00'));
});

test('ETF NAV service computes premium/discount from newest market quote',async()=>{
  const service=new EtfNavService({fetchImpl:async()=>({
    ok:true,status:200,json:async()=>payload,
  })});
  const quote={
    symbol:'0050',currentPrice:112.40,source:'FUGLE',sourceQuoteAt:now,
    quality:'trade',
  };
  const out=await service.get('0050',quote,now);
  assert.equal(out.available,true);
  assert.equal(out.marketPrice,112.4);
  assert.ok(Math.abs(out.premiumDiscountPercent-((112.4-112.1)/112.1*100))<1e-9);
  assert.equal(out.premiumDiscountState,'PREMIUM');
  assert.equal(out.quoteSource,'FUGLE');
  assert.equal(out.navSource,'TWSE_MIS_ETF_NAV');
});

test('NAV missing is explicit and is never invented from market price',async()=>{
  const service=new EtfNavService({fetchImpl:async()=>({
    ok:true,status:200,json:async()=>({a1:[]}),
  })});
  const out=await service.get('0050',{currentPrice:112.4},now);
  assert.equal(out.available,false);
  assert.equal('estimatedNav' in out,false);
});
