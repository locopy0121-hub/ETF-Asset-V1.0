import test from 'node:test';
import assert from 'node:assert/strict';
import {misNormalizedQuote,yahooQuoteFromChart,validateCandidate} from '../src/parser.mjs';
import {OfficialSources} from '../src/sources.mjs';

const now=Date.parse('2026-09-29T12:58:04+08:00');
const base={c:'00406A',n:'主動中信台灣收益',ex:'tse',ch:'tse_00406A.tw',
  d:'20260929',t:'12:58:04',y:'9.80'};

test('A layer keeps z truth separate and never promotes pz/previous-close to currentPrice',()=>{
  const pzOnly=misNormalizedQuote({...base,z:'-',pz:'9.86'},now);
  assert.equal(pzOnly,null);

  const book=misNormalizedQuote({...base,z:'-',pz:'9.86',b:'9.85_9.84_',a:'9.87_9.88_'},now);
  assert.equal(book.currentPrice,9.85);
  assert.equal(book.priceType,'BID_ASK');
  assert.equal(book.quality,'bid_ask');

  const trade=misNormalizedQuote({...base,z:'9.86'},now);
  assert.equal(trade.currentPrice,9.86);
  assert.equal(trade.officialTradePrice,9.86);
  assert.equal(trade.priceType,'REALTIME_TRADE');
  assert.equal(trade.isFallback,false);
  assert.equal(validateCandidate(trade,now),true);
});

test('Yahoo normalized backup is accepted only with source time and explicit metadata',()=>{
  const payload={chart:{result:[{meta:{regularMarketPrice:9.86,regularMarketTime:Math.floor(now/1000),
    previousClose:9.80,shortName:'00406A'}}]}};
  const quote=yahooQuoteFromChart(payload,'00406A','TSE',now);
  assert.equal(quote.source,'YAHOO');
  assert.equal(quote.priceType,'BACKUP_REALTIME');
  assert.equal(quote.isFallback,true);
  assert.equal(validateCandidate(quote,now),true);
});

test('source failover uses Yahoo when TWSE MIS request fails',async()=>{
  const feed=new OfficialSources({fetchImpl:async(url)=>{
    if(url.includes('mis.twse.com.tw'))throw new Error('MIS blocked');
    if(url.includes('query1.finance.yahoo.com'))return {ok:true,json:async()=>({chart:{result:[{meta:{
      regularMarketPrice:9.86,regularMarketTime:Math.floor(now/1000),previousClose:9.80,shortName:'00406A'
    }}]}})};
    return {ok:true,json:async()=>[]};
  }});
  const out=await feed.refresh(['00406A'],{now});
  const quote=out.quotes.find(q=>q.symbol==='00406A');
  assert.equal(quote?.source,'YAHOO');
  assert.equal(quote?.currentPrice,9.86);
  assert.ok(out.errors.some(x=>x.includes('TWSE_MIS')));
});
