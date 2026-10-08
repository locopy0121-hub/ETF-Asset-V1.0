import assert from 'node:assert/strict';
import test from 'node:test';
import {registerEtfHoldingsApi,EtfHoldingsService} from '../src/etfHoldings.mjs';
import {MarketStore} from '../src/store.mjs';

test('ETF endpoint rejects malformed symbols and preserves missing/error states',async()=>{
  let handler;registerEtfHoldingsApi({get:(_path,fn)=>{handler=fn;}},{read:async symbol=>symbol==='0050'?{symbol,rows:[{symbol:'2330',name:'台積電',weight:56.52}]}:null});
  const invoke=async symbol=>{const result={status:200};const res={status(code){result.status=code;return this;},set(){return this;},json(data){result.data=data;return this;}};await handler({params:{symbol}},res);return result;};
  assert.equal((await invoke('../../foo')).status,400);
  assert.equal((await invoke('00878')).status,404);
  assert.deepEqual((await invoke('0050')).data.rows,[{symbol:'2330',name:'台積電',weight:56.52}]);
  registerEtfHoldingsApi({get:(_path,fn)=>{handler=fn;}},{read:async()=>{throw new Error('offline');}});
  assert.equal((await invoke('0050')).status,503);
});
test('cached registration and restart keep ETFs in the scheduled tracking universe',async()=>{
  const service=new EtfHoldingsService({pg:{query:async()=>({rows:[{symbol:'00929'}]})},symbols:['0050']});
  service.read=async symbol=>({symbol,rows:[{symbol:'2330',name:'台積電',weight:20}]});
  service.update=async()=>{};
  let post;registerEtfHoldingsApi({get(){},post(_path,handler){post=handler;}},service);
  const res={status(){return this;},json(value){return value;}};
  await post({params:{symbol:'00878'},ip:'test'},res);
  assert.ok(service.symbols.includes('00878'),'cached POST still registers a newly added holding');
  let status=200;const cachedRes={status(code){status=code;return this;},json(){return this;}};
  for(let i=0;i<30;i++)await post({params:{symbol:'00878'},ip:'test'},cachedRes);
  assert.equal(status,200,'cached reads must not consume the upstream crawl quota');
  service.start();
  await new Promise(resolve=>setImmediate(resolve));
  service.stop();
  assert.ok(service.symbols.includes('00929'),'persisted ETF is restored after restart');
});

test('ETF SQL snapshots replace atomically, preserve historical dates, and roll back invalid weights',{
  skip:!process.env.TEST_DATABASE_URL,
},async()=>{
  const store=new MarketStore({databaseUrl:process.env.TEST_DATABASE_URL,redisUrl:null});
  await store.start();
  const service=new EtfHoldingsService({pg:store.pg});
  const sample={symbol:'009999',asOf:'2026-10-08',fetchedAt:Date.parse('2026-10-08T14:30:00+08:00'),source:'元大投信',sourceUrl:'https://www.yuantaetfs.com/product/detail/009999/ratio',complete:true,
    rows:[{symbol:'2454',name:'聯發科',weight:6.26},{symbol:'2330',name:'台積電',weight:56.52}]};
  try{
    await service.save(sample,'test ETF');
    assert.equal((await service.read('009999')).rows[0].symbol,'2330');
    await service.save({...sample,complete:false,rows:[{symbol:'2330',name:'台積電',weight:57}]});
    assert.equal((await service.read('009999')).complete,true,'same-date partial response cannot destroy complete database snapshot');
    assert.equal((await service.read('009999')).rows.length,2);
    await service.save({...sample,asOf:'2026-10-07',rows:[{symbol:'2330',name:'台積電',weight:50}]});
    assert.equal((await service.read('009999')).asOf,'2026-10-08');
    await assert.rejects(service.save({...sample,rows:[{symbol:'2330',name:'台積電',weight:-1}]}));
    assert.equal((await service.read('009999')).rows[0].weight,56.52);
    await service.save({...sample,rows:[{symbol:'2454',name:'聯發科',weight:8}]});
    assert.equal((await service.read('009999')).rows.length,1,'replaced snapshot must not retain removed constituents');
  }finally{await store.pg.query('DELETE FROM etfs WHERE symbol=$1',['009999']);await store.close();}
});
