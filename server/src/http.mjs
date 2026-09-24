import express from 'express';
import {VALID_SYMBOL} from './parser.mjs';

const parseSymbols=(value,limit=32)=>{
  const items=String(value??'').split(',').map(s=>s.trim().toUpperCase())
    .filter(Boolean);
  if(items.length>limit||items.some(s=>!VALID_SYMBOL.test(s)))return null;
  return [...new Set(items)];
};
export function makeApp({store,jobs}){
  const app=express();
  app.disable('x-powered-by');
  app.use(express.json({limit:'4kb'}));
  app.get('/health/live',(_req,res)=>res.json({status:'alive',service:'tf-asset-market-center',version:'2.3.1'}));
  app.get('/health/ready',async(_req,res)=>{
    try{const status=await store.ready();res.status(status.redis?200:206).json(status);}
    catch(error){res.status(503).json({postgres:false,redis:!!store.redis?.isReady});}
  });
  const windows=new Map();
  app.use('/v1/market',(req,res,next)=>{
    const ip=req.ip??req.socket.remoteAddress??'unknown',now=Date.now();
    const old=windows.get(ip);
    const nextWindow=!old||old.until<now?{until:now+60_000,count:1}:{
      until:old.until,count:old.count+1};
    windows.set(ip,nextWindow);
    if(windows.size>10000)for(const [key,entry] of windows)if(entry.until<now)windows.delete(key);
    if(nextWindow.count>120)return res.status(429).json({error:'market_rate_limit'});
    next();
  });
  app.get('/v1/market/quotes',async(req,res)=>{
    const symbols=parseSymbols(req.query.symbols);
    if(!symbols||!symbols.length)return res.status(400).json({error:'symbols_required_max_32'});
    try{
      const state=await store.snapshot(symbols);
      res.set('Cache-Control','no-store').json({...state,serverAt:Date.now()});
    }catch(error){res.status(503).json({error:'market_store_unavailable'});}
  });
  app.post('/v1/market/subscriptions',async(req,res)=>{
    if(process.env.MARKET_WATCH_ENABLED==='false')return res.status(403).json({error:'watch_disabled'});
    const id=String(req.body?.clientId??'');
    const arr=req.body?.symbols;
    if(!/^[a-zA-Z0-9_-]{8,64}$/.test(id)||!Array.isArray(arr)||arr.length>32
      ||arr.some(s=>typeof s!=='string'||!VALID_SYMBOL.test(s)))
      return res.status(400).json({error:'invalid_watch_symbols'});
    try{
      await store.watch(id,[...new Set(arr)]);
      res.json({accepted:true,expiresInSeconds:110});
    }catch(error){res.status(503).json({error:'watch_registry_unavailable'});}
  });
  app.get('/v1/market/status',async(req,res)=>{
    try{
      const state=await store.snapshot(parseSymbols(req.query.symbols)??[]);
      res.json({version:state.version,coveredCount:state.coveredCount,
        requestedCount:state.requestedCount,missing:state.missing,
        cache:state.cache,degraded:state.degraded,
        lastJobError:jobs.errorsInRow,nextAttemptAt:jobs.nextAttempt});
    }catch(error){res.status(503).json({error:'market_store_unavailable'});}
  });
  return app;
}
