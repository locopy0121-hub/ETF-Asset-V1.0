import cron from 'node-cron';
import {fetchEtfConstituents,isEtfSymbol} from './etfConstituentParser.mjs';

export class EtfHoldingsService {
  constructor({pg,redis=null,symbols=[]}){this.pg=pg;this.redis=redis;this.symbols=[...new Set(symbols.filter(isEtfSymbol))].slice(0,300);this.task=null;this.running=false;this.pending=new Map();}
  async save(snapshot,name=''){
    const client=await this.pg.connect();
    try{
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[snapshot.symbol]);
      const existing=await client.query('SELECT complete FROM etf_holding_snapshots WHERE etf_symbol=$1 AND as_of=$2 AND source=$3',
        [snapshot.symbol,snapshot.asOf,snapshot.source]);
      if(!snapshot.complete&&existing.rows.some(row=>row.complete)){await client.query('COMMIT');return;}
      await client.query(`INSERT INTO etfs(symbol,name) VALUES($1,$2) ON CONFLICT(symbol) DO UPDATE
        SET name=CASE WHEN EXCLUDED.name='' THEN etfs.name ELSE EXCLUDED.name END,updated_at=now()`,[snapshot.symbol,name]);
      const basis=snapshot.basis??(snapshot.source==='元大投信'?'issuer_disclosed':'third_party_disclosed');
      const result=await client.query(`INSERT INTO etf_holding_snapshots(etf_symbol,as_of,source,source_url,basis,complete,fetched_at)
        VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(etf_symbol,as_of,source,basis) DO UPDATE
        SET complete=EXCLUDED.complete,fetched_at=EXCLUDED.fetched_at,source_url=EXCLUDED.source_url RETURNING id`,
        [snapshot.symbol,snapshot.asOf,snapshot.source,snapshot.sourceUrl,basis,snapshot.complete,new Date(snapshot.fetchedAt)]);
      const id=result.rows[0].id;
      await client.query('DELETE FROM etf_holdings WHERE snapshot_id=$1',[id]);
      await client.query(`INSERT INTO etf_holdings(snapshot_id,stock_symbol,stock_name,weight)
        SELECT $1,x.symbol,x.name,x.weight FROM jsonb_to_recordset($2::jsonb) AS x(symbol text,name text,weight numeric)`,[id,JSON.stringify(snapshot.rows)]);
      await client.query('COMMIT');
      // Invalidate after commit; reads always reconstruct one atomic snapshot.
      if(this.redis?.isReady)await this.redis.del('etf:holdings:'+snapshot.symbol).catch(()=>{});
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
    finally{client.release();}
  }
  async read(symbol){
    if(!isEtfSymbol(symbol))throw new Error('invalid_etf_symbol');
    if(this.redis?.isReady){try{const raw=await this.redis.get('etf:holdings:'+symbol);if(raw)return JSON.parse(raw);}catch{}}
    const result=await this.pg.query(`WITH latest AS (
      SELECT * FROM etf_holding_snapshots WHERE etf_symbol=$1
      ORDER BY as_of DESC,complete DESC,fetched_at DESC LIMIT 1)
      SELECT s.etf_symbol AS symbol,to_char(s.as_of,'YYYY-MM-DD') AS "asOf",s.source,s.source_url AS "sourceUrl",
        s.basis,s.complete,extract(epoch FROM s.fetched_at)*1000 AS "fetchedAt",
        jsonb_agg(jsonb_build_object('symbol',h.stock_symbol,'name',h.stock_name,'weight',h.weight) ORDER BY h.weight DESC,h.stock_symbol) AS rows
      FROM latest s JOIN etf_holdings h ON h.snapshot_id=s.id GROUP BY s.id,s.etf_symbol,s.as_of,s.source,s.source_url,s.basis,s.complete,s.fetched_at`,[symbol]);
    const data=result.rows[0];if(!data)return null;
    data.fetchedAt=Number(data.fetchedAt);
    if(this.redis?.isReady)await this.redis.set('etf:holdings:'+symbol,JSON.stringify(data),{EX:300}).catch(()=>{});
    return data;
  }
  registerSymbol(symbol){
    if(!isEtfSymbol(symbol))throw new Error('invalid_etf_symbol');
    if(!this.symbols.includes(symbol)){if(this.symbols.length>=300)throw new Error('tracking_limit');this.symbols.push(symbol);}
  }
  async track(symbol){
    this.registerSymbol(symbol);
    const existing=this.pending.get(symbol);if(existing)return existing;
    const request=(async()=>{
      const name=['0050','0056','00713'].includes(symbol)?'元大':'';
      const data=await fetchEtfConstituents(symbol,name,new AbortController().signal);
      await this.save(data,name);return this.read(symbol);
    })().finally(()=>this.pending.delete(symbol));
    this.pending.set(symbol,request);return request;
  }
  async update(){
    if(this.running)return;this.running=true;
    try{for(const symbol of this.symbols){
      try{await this.track(symbol);}catch{console.warn('[etf-holdings]',symbol,'update failed; preserving prior snapshot');}
    }}finally{this.running=false;}
  }
  start(){
    // Three separate daily checkpoints, independent of the live quote engine.
    this.task=cron.schedule('0 30 8,14 * * 1-5',()=>void this.update(),{timezone:'Asia/Taipei'});
    this.preclose=cron.schedule('0 20 13 * * 1-5',()=>void this.update(),{timezone:'Asia/Taipei'});
    void this.pg.query('SELECT symbol FROM etfs ORDER BY updated_at DESC LIMIT 300').then(result=>{
      for(const row of result.rows){if(this.symbols.length<300)this.registerSymbol(row.symbol);}
    }).catch(()=>{}).then(()=>this.update());
  }
  stop(){this.task?.stop();this.preclose?.stop();}
}
export function registerEtfHoldingsApi(app,service){
  const attempts=new Map();
  if(typeof app.post==='function')app.post('/api/v1/etf/:symbol/track',async(req,res)=>{
    const symbol=String(req.params.symbol??'').toUpperCase(),now=Date.now();
    if(!isEtfSymbol(symbol))return res.status(400).json({error:'invalid_etf_symbol'});
    try{const cached=await service.read(symbol);if(cached){service.registerSymbol(symbol);return res.json(cached);}}
    catch{return res.status(503).json({error:'etf_holdings_store_unavailable'});}
    const ip=req.ip??'unknown';const old=attempts.get(ip);
    const window=!old||old.until<now?{count:1,until:now+60000}:{...old,count:old.count+1};
    if(attempts.size>=10000)for(const [key,value] of attempts)if(value.until<now)attempts.delete(key);
    if(attempts.size>=10000&&!attempts.has(ip))return res.status(429).json({error:'tracking_rate_limit'});
    attempts.set(ip,window);if(window.count>20)return res.status(429).json({error:'tracking_rate_limit'});
    try{service.registerSymbol(symbol);return res.json(await service.track(symbol));}
    catch{return res.status(503).json({error:'etf_holdings_source_unavailable'});}
  });
  app.get('/api/v1/etf/:symbol/holdings',async(req,res)=>{
    const symbol=String(req.params.symbol??'').toUpperCase();
    if(!isEtfSymbol(symbol))return res.status(400).json({error:'invalid_etf_symbol'});
    try{
      // GET reads cache/DB only. Anonymous callers cannot trigger upstream crawls.
      const snapshot=await service.read(symbol);
      if(!snapshot)return res.status(404).json({error:'etf_holdings_not_available',symbol});
      res.set('Cache-Control','public, max-age=60').json(snapshot);
    }catch{return res.status(503).json({error:'etf_holdings_store_unavailable'});}
  });
}
