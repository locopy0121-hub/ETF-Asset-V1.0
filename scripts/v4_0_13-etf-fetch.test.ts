import assert from 'node:assert/strict';
import {fetchEtfConstituents,cachedEtfConstituents,restoreEtfConstituents,normalizeEtfHoldingsApiUrl} from '../src/market/etfConstituents';

async function run(){
  const original=globalThis.fetch;
  const snapshot={symbol:'00878',asOf:'2026-10-08',fetchedAt:Date.now(),source:'MoneyDJ 理財網',sourceUrl:'https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid=00878.TW',complete:true,rows:[{symbol:'2330',name:'台積電',weight:20}]};
  try{
    let count=0;
    globalThis.fetch=async()=>{count++;return new Response(JSON.stringify(snapshot),{status:200});};
    const data=await fetchEtfConstituents('00878','國泰永續高股息',new AbortController().signal,'https://example.test');
    assert.equal(data.rows[0]!.symbol,'2330');
    assert.equal(count,1,'configured data center must avoid issuer fanout');
    globalThis.fetch=async()=>new Response('{"symbol":"00878","rows":[]}',{status:200});
    await assert.rejects(fetchEtfConstituents('00878','國泰永續高股息',new AbortController().signal,'https://example.test'),'invalid API payload must not report old cached data as a successful update');
    globalThis.fetch=async()=>new Response('',{status:503});
    await assert.rejects(fetchEtfConstituents('00878','國泰永續高股息',new AbortController().signal,'https://example.test'));
    assert.equal(cachedEtfConstituents('00878')?.rows[0]?.weight,20,'failure preserves cache');
    restoreEtfConstituents([{...snapshot,rows:[{symbol:'2330',name:12,weight:20}]}]);
    assert.equal(cachedEtfConstituents('00878')?.rows[0]?.name,'台積電');
    restoreEtfConstituents([{...snapshot,fetchedAt:snapshot.fetchedAt+1,complete:false,rows:[{symbol:'2330',name:'台積電',weight:21}]}]);
    assert.equal(cachedEtfConstituents('00878')?.complete,true,'partial cache response must not downgrade a complete snapshot');
    const abort=new AbortController();abort.abort();
    await assert.rejects(fetchEtfConstituents('00878','國泰永續高股息',abort.signal));
    assert.equal(normalizeEtfHoldingsApiUrl('https://user:pass@example.test'),'');
    assert.equal(normalizeEtfHoldingsApiUrl('http://example.test'),'');
    assert.equal(normalizeEtfHoldingsApiUrl('https://example.test/'),'https://example.test');
    console.log('API response validation / no fanout / failed refresh retention / cancellation / safe URL: PASS');
  }finally{globalThis.fetch=original;}
}
void run();
