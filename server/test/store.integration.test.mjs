import test from 'node:test';
import assert from 'node:assert/strict';
import {MarketStore} from '../src/store.mjs';
import {makeApp} from '../src/http.mjs';

const enabled=!!process.env.TEST_DATABASE_URL&&!!process.env.TEST_REDIS_URL;
test('PostgreSQL transactional quote/version, Redis cache, HTTP and reconnect safety', {skip:!enabled},async()=>{
  const store=new MarketStore({
    databaseUrl:process.env.TEST_DATABASE_URL,
    redisUrl:process.env.TEST_REDIS_URL,
  });
  await store.start();
  await store.pg.query('TRUNCATE market_quote_history, market_quotes, market_task_log');
  await store.pg.query('UPDATE market_meta SET version=0 WHERE singleton=TRUE');
  await store.redis?.flushDb();
  await store.warmCache();
  const now=Date.now(),sourceQuoteAt=now-5_000;
  const first={symbol:'0050',name:'ETF',currentPrice:123.45,previousClose:122,
    sourceQuoteAt,quality:'trade',source:'TWSE_MIS',checkedAt:now};
  try{
    const a=await store.commit([first],now);
    assert.equal(a.updatedCount,1);
    assert.equal(a.version,1);
    assert.equal((await store.snapshot(['0050'])).quotes[0].currentPrice,123.45);
    const repeated=await store.commit([first],now);
    assert.equal(repeated.updatedCount,0,'repeated HTTP poll must not advance version');
    assert.equal(repeated.version,1);
    const older=await store.commit([{...first,sourceQuoteAt:sourceQuoteAt-1000,currentPrice:900}],now);
    assert.equal(older.version,1);
    assert.equal((await store.snapshot(['0050'])).quotes[0].currentPrice,123.45);
    const b=await store.commit([{...first,symbol:'00919',name:'ETF B',
      sourceQuoteAt:sourceQuoteAt+1000,quality:'official_close',source:'TWSE_DAILY',currentPrice:25.22}],now);
    assert.equal(b.version,2);
    const mixed=await store.snapshot(['0050','00919','00713']);
    assert.equal(mixed.coveredCount,2);
    assert.deepEqual(mixed.missing,['00713']);
    assert.equal(mixed.quotes.find(q=>q.symbol==='0050').marketDataVersion,1);
    assert.equal(mixed.quotes.find(q=>q.symbol==='00919').marketDataVersion,2);
    await store.watch('test_v231_aa',['0050','00713']);
    assert.ok((await store.watchedSymbols()).includes('00713'));
    const app=makeApp({store,jobs:{errorsInRow:0,nextAttempt:0}});
    const server=app.listen(0,'127.0.0.1');
    try{
      await new Promise(resolve=>server.once('listening',resolve));
      const base='http://127.0.0.1:'+server.address().port;
      const json=await (await fetch(base+'/v1/market/quotes?symbols=0050,00919,00713')).json();
      assert.equal(json.version,2);
      assert.equal(json.coveredCount,2);
      assert.deepEqual(json.missing,['00713']);
      const invalid=await fetch(base+'/v1/market/quotes?symbols=INVALID!');
      assert.equal(invalid.status,400);
      const watch=await fetch(base+'/v1/market/subscriptions',{method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({clientId:'test_sub_1234',symbols:['0050','00919']})});
      assert.equal(watch.status,200);
    }finally{await new Promise(resolve=>server.close(resolve));}
    // Simulate cache loss: PostgreSQL still contains the authoritative data.
    await store.redis.flushDb();
    const after=await store.snapshot(['0050']);
    assert.equal(after.quotes[0].currentPrice,123.45);
    assert.equal(after.cache,'postgres');
  }finally{
    await store.redis?.flushDb();
    await store.close();
  }
});
