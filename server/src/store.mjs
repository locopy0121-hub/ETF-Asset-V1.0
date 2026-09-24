import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {EventEmitter} from 'node:events';
import {Pool} from 'pg';
import {createClient} from 'redis';
import {validateCandidate,chooseNewer,VALID_SYMBOL} from './parser.mjs';

const rowJson=row=>({
  symbol:row.symbol,name:row.name,currentPrice:Number(row.price),
  previousClose:row.previous_close===null?null:Number(row.previous_close),
  sourceQuoteAt:new Date(row.source_at).getTime(),
  quality:row.quality,source:row.source,
  checkedAt:new Date(row.checked_at).getTime(),marketDataVersion:Number(row.version),
});
export class MarketStore extends EventEmitter{
  constructor({databaseUrl=process.env.DATABASE_URL,redisUrl=process.env.REDIS_URL}={}){
    super();
    if(!databaseUrl)throw new Error('DATABASE_URL is required');
    this.pg=new Pool({connectionString:databaseUrl,max:10,
      connectionTimeoutMillis:7000,idleTimeoutMillis:30_000});
    this.redis=redisUrl?createClient({url:redisUrl,
      socket:{connectTimeout:3000,reconnectStrategy:retries=>Math.min(30_000,500*2**Math.min(retries,6))}}):null;
    this.redis?.on('error',()=>{}); // best-effort cache; PostgreSQL is authoritative
    this.cacheHealthy=false;
  }
  async start(){
    const sql=await readFile(fileURLToPath(new URL('../sql/001_market_center.sql',import.meta.url)),'utf8');
    await this.pg.query(sql);
    if(this.redis){
      try{await Promise.race([this.redis.connect(),new Promise((_,reject)=>
        setTimeout(()=>reject(new Error('Redis connect timeout')),4_000))]);
        this.cacheHealthy=true;await this.warmCache();
      }catch(error){this.cacheHealthy=false;this.emit('warning','Redis unavailable: '+String(error.message));}
    }
  }
  async close(){await Promise.allSettled([this.redis?.quit(),this.pg.end()]);}
  async dbVersion(client=this.pg){
    const result=await client.query("SELECT version FROM market_meta WHERE singleton=TRUE");
    return Number(result.rows[0]?.version??0);
  }
  async dbSnapshot(symbols=[]){
    const client=await this.pg.connect();
    try{
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const version=await this.dbVersion(client);
      const rows=symbols.length
        ?await client.query('SELECT * FROM market_quotes WHERE symbol = ANY($1::varchar[]) ORDER BY symbol',[symbols])
        :await client.query('SELECT * FROM market_quotes ORDER BY symbol');
      await client.query('COMMIT');
      return {version,quotes:rows.rows.map(rowJson),cache:'postgres',degraded:false};
    }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
    finally{client.release();}
  }
  async warmCache(){
    if(!this.redis?.isReady)return;
    const state=await this.dbSnapshot();
    const tx=this.redis.multi();
    for(const q of state.quotes)tx.set('market:quote:'+q.symbol,JSON.stringify(q),{EX:600});
    tx.set('market:version',String(state.version),{EX:3600});
    await tx.exec();
  }
  async snapshot(symbols=[]){
    const normalized=[...new Set(symbols.map(s=>String(s).trim().toUpperCase()))]
      .filter(s=>VALID_SYMBOL.test(s));
    let cached=null;
    if(this.redis?.isReady&&normalized.length){
      try{
        const v=await this.redis.get('market:version');
        if(v!==null){
          const values=await this.redis.mGet(normalized.map(s=>'market:quote:'+s));
          cached={version:Number(v),quotes:values.map(s=>s?JSON.parse(s):null).filter(Boolean)};
          if(cached.quotes.length===normalized.length){
            // A Redis write failure must never serve old quotes as the newest revision.
            const committed=await this.dbVersion();
            if(committed===cached.version)return {
              ...cached,cache:'redis',degraded:false,
              requestedCount:normalized.length,coveredCount:cached.quotes.length,missing:[],
            };
          }
        }
      }catch(e){this.cacheHealthy=false;}
    }
    try{
      const state=await this.dbSnapshot(normalized);
      const present=new Set(state.quotes.map(q=>q.symbol));
      return {...state,requestedCount:normalized.length,
        coveredCount:state.quotes.length,missing:normalized.filter(s=>!present.has(s))};
    }catch(error){
      if(cached?.quotes.length){
        const present=new Set(cached.quotes.map(q=>q.symbol));
        return {...cached,cache:'redis-degraded',degraded:true,
          requestedCount:normalized.length,coveredCount:cached.quotes.length,
          missing:normalized.filter(s=>!present.has(s))};
      }
      throw error;
    }
  }
  async commit(candidates,now=Date.now()){
    const bySymbol=new Map();
    for(const q of candidates)if(validateCandidate(q,now))
      bySymbol.set(q.symbol,chooseNewer(bySymbol.get(q.symbol),q));
    if(!bySymbol.size)return {updatedCount:0,conflictCount:0,version:await this.dbVersion()};
    const client=await this.pg.connect();
    let version=0,accepted=[],conflictCount=0;
    try{
      await client.query('BEGIN');
      const meta=await client.query('SELECT version FROM market_meta WHERE singleton=TRUE FOR UPDATE');
      version=Number(meta.rows[0].version);
      for(const q of bySymbol.values()){
        const prior=await client.query('SELECT * FROM market_quotes WHERE symbol=$1 FOR UPDATE',[q.symbol]);
        const old=prior.rows[0]??null;
        if(old){
          const at=new Date(old.source_at).getTime();
          if(q.sourceQuoteAt<at)continue;
          if(q.sourceQuoteAt===at){
            if(old.quality==='trade'||q.quality===old.quality){
              if(Math.abs(Number(old.price)-q.currentPrice)>0.0001)conflictCount++;
              continue;
            }
            if(q.quality!=='trade')continue;
          }
        }
        accepted.push(q);
      }
      if(accepted.length){
        version++;
        await client.query('UPDATE market_meta SET version=$1,changed_at=NOW() WHERE singleton=TRUE',[version]);
        for(const q of accepted){
          const args=[q.symbol,q.name,q.currentPrice,q.previousClose,
            new Date(q.sourceQuoteAt),q.source,q.quality,new Date(q.checkedAt),version];
          await client.query('INSERT INTO market_quotes '+
            '(symbol,name,price,previous_close,source_at,source,quality,checked_at,version) '+
            'VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) '+
            'ON CONFLICT(symbol) DO UPDATE SET '+
            'name=EXCLUDED.name,price=EXCLUDED.price,previous_close=COALESCE(EXCLUDED.previous_close,market_quotes.previous_close),'+
            'source_at=EXCLUDED.source_at,source=EXCLUDED.source,quality=EXCLUDED.quality,'+
            'checked_at=EXCLUDED.checked_at,version=EXCLUDED.version',args);
          await client.query('INSERT INTO market_quote_history '+
            '(symbol,name,price,previous_close,source_at,source,quality,received_at) '+
            'VALUES($1,$2,$3,$4,$5,$6,$7,$8) '+
            'ON CONFLICT(symbol,source_at,quality) DO NOTHING',args.slice(0,8));
        }
      }
      await client.query('COMMIT');
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
    finally{client.release();}
    if(accepted.length){
      const rows=await this.dbSnapshot(accepted.map(q=>q.symbol));
      if(this.redis?.isReady){
        try{
          const tx=this.redis.multi();
          for(const q of rows.quotes)tx.set('market:quote:'+q.symbol,JSON.stringify(q),{EX:600});
          tx.set('market:version',String(version),{EX:3600});
          await tx.exec();
          await this.redis.publish('market:changed',JSON.stringify({version,quotes:rows.quotes}));
          this.cacheHealthy=true;
        }catch(error){this.cacheHealthy=false;this.emit('warning','Redis post-commit cache failed');}
      }
      this.emit('changed',{version,quotes:rows.quotes});
    }
    return {version,updatedCount:accepted.length,conflictCount};
  }
  async watch(id,symbols){
    if(!this.redis?.isReady)throw new Error('Redis watch registry unavailable');
    await this.redis.set('market:watch:'+id,
      JSON.stringify({symbols,expires:Date.now()+110_000}),{EX:110});
  }
  async watchedSymbols(){
    if(!this.redis?.isReady)return [];
    const out=new Set(),iter=this.redis.scanIterator({MATCH:'market:watch:*',COUNT:100});
    for await(const key of iter){
      const raw=await this.redis.get(key);
      if(!raw)continue;
      try{const p=JSON.parse(raw);if(p.expires>Date.now()){
        for(const s of p.symbols??[])if(VALID_SYMBOL.test(s))out.add(s);
      }}catch{}
    }
    return [...out];
  }
  async ready(){
    await this.pg.query('SELECT 1');
    return {postgres:true,redis:!!this.redis?.isReady};
  }
}
