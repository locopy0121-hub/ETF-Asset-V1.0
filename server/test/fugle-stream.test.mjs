import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {FugleStream} from '../src/fugleStream.mjs';

class FakeSocket extends EventEmitter{
  constructor(){super();this.readyState=0;this.sent=[];}
  send(value){this.sent.push(JSON.parse(String(value)));}
  open(){this.readyState=1;this.emit('open');}
  close(){this.readyState=3;this.emit('close',1000,'closed');}
  terminate(){this.readyState=3;this.emit('close',1006,'terminated');}
}

test('Fugle server-side stream authenticates, subscribes and stores real trades',()=>{
  const now=Date.parse('2026-10-01T12:07:21+08:00');
  const socket=new FakeSocket();
  const stream=new FugleStream({
    apiKey:'server-only-key',
    wsFactory:()=>socket,
    idleTimeoutMs:75_000,
  });
  assert.equal(stream.start(['0050','0056']),true);
  socket.open();
  assert.deepEqual(socket.sent[0],{event:'auth',data:{apikey:'server-only-key'}});
  socket.emit('message',JSON.stringify({event:'authenticated',data:{message:'ok'}}));
  assert.deepEqual(socket.sent[1],{
    event:'subscribe',data:{channel:'trades',symbols:['0050','0056']},
  });
  socket.emit('message',JSON.stringify({
    event:'data',channel:'trades',data:{
      symbol:'0050',exchange:'TWSE',market:'TSE',
      price:112.45,volume:12345,time:now*1000,isTrial:false,
    },
  }));
  const quote=stream.latest('0050',now+1000);
  assert.equal(quote?.source,'FUGLE');
  assert.equal(quote?.currentPrice,112.45);
  assert.equal(quote?.volume,12345);
  assert.equal(quote?.sourceQuoteAt,now);

  socket.emit('message',JSON.stringify({
    event:'data',channel:'trades',data:{
      symbol:'0050',exchange:'TWSE',market:'TSE',
      price:999,volume:0,time:(now+2000)*1000,isTrial:true,
    },
  }));
  assert.equal(stream.latest('0050',now+3000)?.currentPrice,112.45,
    'trial packets must never replace an actual trade');
  assert.equal(stream.health(now+3000).state,'AUTHENTICATED');
  stream.stop();
});

test('Fugle stream can be disabled without creating a network socket',()=>{
  let created=0;
  const stream=new FugleStream({apiKey:'',wsFactory:()=>{created++;return new FakeSocket();}});
  assert.equal(stream.start(['0050']),false);
  assert.equal(created,0);
  assert.equal(stream.health().state,'DISABLED');
});
