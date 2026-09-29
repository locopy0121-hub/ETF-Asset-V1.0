import express from 'express';
import {VALID_SYMBOL} from './parser.mjs';

const parseSymbols=(value,limit=32)=>{
  const items=String(value??'').split(',').map(s=>s.trim().toUpperCase())
    .filter(Boolean);
  if(items.length>limit||items.some(s=>!VALID_SYMBOL.test(s)))return null;
  return [...new Set(items)];
};
const mergeIntraday=(stored={},fallback={})=>{
  const symbols=new Set([...Object.keys(fallback),...Object.keys(stored)]);
  const output={};
  for(const symbol of symbols){
    const candidates=[fallback[symbol],stored[symbol]].filter(Boolean);
    if(!candidates.length)continue;
    const date=candidates.map(series=>series.date).filter(Boolean).sort().at(-1);
    if(!date)continue;
    const byMinute=new Map();
    for(const series of candidates){
      if(series.date!==date||!Array.isArray(series.points))continue;
      for(const point of series.points){
        const at=Number(point.at),price=Number(point.price);
        if(!Number.isFinite(at)||!Number.isFinite(price)||price<=0)continue;
        const key=Math.floor(at/60_000);
        const old=byMinute.get(key);
        const rank=point.quality==='trade'?2:1;
        const oldRank=old?.quality==='trade'?2:old?1:0;
        if(!old||rank>oldRank||at>old.at)byMinute.set(key,{at,price,quality:point.quality,source:point.source});
      }
    }
    const points=[...byMinute.values()].sort((a,b)=>a.at-b.at);
    if(points.length)output[symbol]={date,points};
  }
  return output;
};

export function makeApp({store,jobs,sources}){
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
      const includeIntraday=req.query.intraday==='1';
      let intraday;
      if(includeIntraday){
        const [stored,fallback]=await Promise.all([
          store.intraday(symbols),
          sources?.intraday? sources.intraday(symbols):Promise.resolve({}),
        ]);
        intraday=mergeIntraday(stored,fallback);
      }
      res.set('Cache-Control','no-store').json({...state,...(includeIntraday?{intraday}:{}),serverAt:Date.now()});
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
