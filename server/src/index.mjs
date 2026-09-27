import http from 'node:http';
import {WebSocketServer,WebSocket} from 'ws';
import {MarketStore} from './store.mjs';
import {OfficialSources} from './sources.mjs';
import {MarketJobs} from './jobs.mjs';
import {makeApp} from './http.mjs';
import {VALID_SYMBOL} from './parser.mjs';

const port=Number(process.env.PORT||8080);
const store=new MarketStore();
store.on('warning',message=>console.warn('[market-center]',message));
await store.start();
const sources=new OfficialSources();
const jobs=new MarketJobs({store,sources,
  staticSymbols:(process.env.MARKET_TRACKED_SYMBOLS??'').split(','),
  pollSeconds:process.env.MARKET_POLL_SECONDS});
const server=http.createServer(makeApp({store,jobs}));
const wss=new WebSocketServer({noServer:true,maxPayload:1024});
const allSockets=new Set();
server.on('upgrade',(request,socket,head)=>{
  let url;
  try{url=new URL(request.url,'http://127.0.0.1');}catch{socket.destroy();return;}
  if(url.pathname!=='/v1/market/events'||allSockets.size>=100){socket.destroy();return;}
  const raw=url.searchParams.get('symbols')??'';
  const symbols=[...new Set(raw.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean))];
  if(!symbols.length||symbols.length>32||symbols.some(s=>!VALID_SYMBOL.test(s))){
    socket.destroy();return;
  }
  wss.handleUpgrade(request,socket,head,ws=>{
    ws.symbols=new Set(symbols);
    ws.lastVersion=0;
    allSockets.add(ws);
    ws.on('close',()=>allSockets.delete(ws));
    ws.send(JSON.stringify({type:'ready',service:'tf-asset-market-center'}));
  });
});
const broadcast=event=>{
  for(const ws of allSockets){
    if(ws.readyState!==WebSocket.OPEN||event.version<=ws.lastVersion)continue;
    const rows=event.quotes.filter(q=>ws.symbols.has(q.symbol));
    if(!rows.length)continue;
    ws.lastVersion=event.version;
    ws.send(JSON.stringify({type:'market_changed',version:event.version,
      symbols:rows.map(q=>q.symbol),sourceQuoteTimes:rows.map(q=>q.sourceQuoteAt)}));
  }
};
store.on('changed',broadcast);
let sub=null;
if(store.redis?.isReady){
  try{sub=store.redis.duplicate();sub.on('error',()=>{});
    await sub.connect();
    await sub.subscribe('market:changed',raw=>{
      try{broadcast(JSON.parse(raw));}catch{}
    });
  }catch(error){console.warn('[market-center] Redis cross-instance push unavailable');}
}
const heartbeat=setInterval(()=>{
  for(const ws of allSockets)if(ws.readyState===WebSocket.OPEN)ws.ping();
},30_000);
server.listen(port,'0.0.0.0',()=>console.log(
  '[market-center] v2.3.1 listening on',port,
  '; public endpoints never receive the private Ledger',
));
jobs.start();
let shuttingDown=false;
async function shutdown(){
  if(shuttingDown)return;shuttingDown=true;
  jobs.stop();clearInterval(heartbeat);
  for(const ws of allSockets)ws.close(1001,'service closing');
  wss.close();
  await new Promise(resolve=>server.close(resolve));
  await sub?.quit().catch(()=>{});
  await store.close();
}
process.on('SIGTERM',()=>{void shutdown().then(()=>process.exit(0));});
process.on('SIGINT',()=>{void shutdown().then(()=>process.exit(0));});
