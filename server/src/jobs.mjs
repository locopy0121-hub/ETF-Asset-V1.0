import cron from 'node-cron';
import {isSession,taipeiClock} from './clock.mjs';
import {VALID_SYMBOL} from './parser.mjs';

export class MarketJobs{
  constructor({store,sources,navService=null,staticSymbols=[],pollSeconds=1,logger=console}){
    this.store=store;this.sources=sources;this.navService=navService;this.staticSymbols=staticSymbols
      .map(s=>s.trim().toUpperCase()).filter(s=>VALID_SYMBOL.test(s));
    // TF Asset live market cadence supports 1 second minimum; source breakers protect providers.
    this.pollSeconds=Math.max(1,Math.min(60,Number(pollSeconds)||1));
    this.logger=logger;this.tasks=[];this.busy=false;this.closeBusy=false;
    this.errorsInRow=0;this.nextAttempt=0;
  }
  async symbols(){
    const watched=await this.store.watchedSymbols().catch(()=>[]);
    return [...new Set([...this.staticSymbols,...watched])];
  }
  async runQuotes({now=Date.now(),force=false}={}){
    if(this.busy)return {skipped:'in_progress'};
    if(!force&&!isSession(now))return {skipped:'outside_session'};
    if(!force&&now<this.nextAttempt)return {skipped:'provider_backoff'};
    this.busy=true;
    try{
      const symbols=await this.symbols();
      if(!symbols.length)return {skipped:'no_subscribers'};
      const result=await this.sources.refresh(symbols,{now});
      const committed=await this.store.commit(result.quotes,now);
      // Failed provider queries trigger exponential backoff, never rapid-fire retries.
      if(result.errors.length&&result.quotes.length===0){
        this.errorsInRow++;this.nextAttempt=now+Math.min(300_000,10_000*2**Math.min(this.errorsInRow,5));
      }else{
        this.errorsInRow=0;this.nextAttempt=0;
      }
      return {...committed,requestedCount:symbols.length,
        fetchedCount:result.quotes.length,errors:result.errors};
    }catch(error){
      this.errorsInRow++;
      this.nextAttempt=now+Math.min(300_000,10_000*2**Math.min(this.errorsInRow,5));
      this.logger.warn('Market quote job failed:',error.message);
      return {error:error.message};
    }finally{this.busy=false;}
  }
  async runDaily(now=Date.now()){
    const clock=taipeiClock(now);
    if(!clock.workingDay||clock.hour*60+clock.minute<850)return {skipped:'before_daily_close'};
    if(this.closeBusy)return {skipped:'daily_in_progress'};
    this.closeBusy=true;
    const client=await this.store.pg.connect();
    let locked=false;
    try{
      const lock=await client.query("SELECT pg_try_advisory_lock(hashtext('tfasset_market_daily_v231')) AS ok");
      if(!lock.rows[0]?.ok)return {skipped:'another_worker_running'};
      locked=true;
      const old=await client.query("SELECT last_status FROM market_task_log WHERE task='official_daily' AND trading_day=$1",[clock.date]);
      if(old.rows[0]?.last_status==='ok')return {skipped:'already_completed'};
      const symbols=await this.symbols();
      // A daily job refreshes all tracked securities only; it never uploads
      // the user's private transactions to the market backend.
      const data=await this.sources.refresh(symbols,{dailyOnly:true,now});
      const outcome=await this.store.commit(data.quotes,now);
      const status=data.errors.length?'partial':'ok';
      await client.query("INSERT INTO market_task_log(task,trading_day,last_status,detail,completed_at) VALUES('official_daily',$1,$2,$3,NOW()) ON CONFLICT(task,trading_day) DO UPDATE SET last_status=EXCLUDED.last_status,detail=EXCLUDED.detail,completed_at=EXCLUDED.completed_at",
        [clock.date,status,JSON.stringify({fetched:data.quotes.length,updated:outcome.updatedCount,errors:data.errors})]);
      return {...outcome,status,errors:data.errors};
    }catch(error){
      this.logger.warn('Official close job failed:',error.message);
      return {error:error.message};
    }finally{
      if(locked)await client.query("SELECT pg_advisory_unlock(hashtext('tfasset_market_daily_v231'))").catch(()=>{});
      client.release();this.closeBusy=false;
    }
  }
  async runNav(now=Date.now()){
    if(!this.navService)return {skipped:'NO_NAV_SERVICE'};
    if(!isSession(now))return {skipped:'outside_session'};
    const symbols=await this.symbols();
    if(!symbols.length)return {skipped:'no_subscribers'};
    try{
      const state=await this.store.snapshot(symbols);
      const quoteMap=new Map(state.quotes.map(q=>[q.symbol,q]));
      const nav=await this.navService.refresh(symbols,quoteMap,now);
      return {requestedCount:symbols.length,availableCount:nav.filter(row=>row.available).length};
    }catch(error){
      this.logger.warn('ETF NAV job failed:',error.message);
      return {error:error.message};
    }
  }
  start(){
    // node-cron supports seconds; strict Taipei exchange-time check inside job.
    // 1s is the minimum TF Asset cadence. Circuit breakers prevent provider retry storms.
    const quote=cron.schedule('*/'+this.pollSeconds+' * * * * *',
      ()=>{void this.runQuotes();},{timezone:'Asia/Taipei'});
    const nav=cron.schedule('*/15 * * * * *',
      ()=>{void this.runNav();},{timezone:'Asia/Taipei'});
    const daily=cron.schedule('0 10 14 * * 1-5',
      ()=>{void this.runDaily();},{timezone:'Asia/Taipei'});
    this.tasks=[quote,nav,daily];
    // Missed 14:10 due to a server restart is recovered during subsequent
    // trading-day boot (if after market close).
    void this.runDaily().catch(()=>{});
  }
  stop(){for(const task of this.tasks)task.stop();this.tasks=[];}
}
