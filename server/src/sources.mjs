import {
  misNormalizedQuote,yahooQuoteFromChart,officialClose,fugleQuoteFromPayload,
  shioajiQuoteFromPayload,VALID_SYMBOL,
} from './parser.mjs';
import {CircuitBreaker,SourceError,CircuitOpenError} from './circuitBreaker.mjs';
import {isZeroCostSourceAllowed,zeroCostPolicy} from './zeroCostPolicy.mjs';
import {isSession} from './clock.mjs';

const MIS='https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=';
const FUGLE='https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/';
const YAHOO='https://query1.finance.yahoo.com/v8/finance/chart/';
const DAILY={
  TWSE_DAILY:'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
  TPEX_DAILY:'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes',
};
const QUALITY_RANK={trade:50,backup_realtime:40,bid_ask:30,official_close:20,previous_close:10};
const SOURCE_PRIORITY={TWSE_MIS:10,FUGLE:11,SHIOAJI:20,YAHOO:30,TWSE_DAILY:40,TPEX_DAILY:41};

const choosePreferred=(current,candidate)=>{
  if(!current)return candidate;
  const a=QUALITY_RANK[current.quality]??0,b=QUALITY_RANK[candidate.quality]??0;
  const currentTradeLike=current.quality==='trade'||current.quality==='backup_realtime';
  const candidateTradeLike=candidate.quality==='trade'||candidate.quality==='backup_realtime';
  if(currentTradeLike&&candidateTradeLike&&candidate.sourceQuoteAt!==current.sourceQuoteAt)
    return candidate.sourceQuoteAt>current.sourceQuoteAt?candidate:current;
  if(b!==a)return b>a?candidate:current;
  if(candidate.sourceQuoteAt!==current.sourceQuoteAt)
    return candidate.sourceQuoteAt>current.sourceQuoteAt?candidate:current;
  return (SOURCE_PRIORITY[candidate.source]??999)<(SOURCE_PRIORITY[current.source]??999)?candidate:current;
};

export class OfficialSources {
  constructor({
    fetchImpl=globalThis.fetch,
    dailyCacheMs=300_000,
    fugleApiKey=process.env.FUGLE_API_KEY??'',
    shioajiBridgeUrl=process.env.SHIOAJI_BRIDGE_URL??'',
    timeoutMs=2_500,
    breakerThreshold=3,
    breakerCooldownMs=5*60_000,
  }={}){
    this.fetch=fetchImpl;
    this.dailyCacheMs=dailyCacheMs;
    this.dailyCache=new Map();
    this.intradayCache=new Map();
    this.fugleApiKey=String(fugleApiKey).trim();
    this.shioajiBridgeUrl=String(shioajiBridgeUrl).trim().replace(/\/$/,'');
    this.timeoutMs=Math.max(500,Number(timeoutMs)||2_500);
    this.breakers=Object.fromEntries(
      ['TWSE_MIS','FUGLE','SHIOAJI','YAHOO','TWSE_DAILY','TPEX_DAILY'].map(source=>[
        source,new CircuitBreaker(source,{threshold:breakerThreshold,cooldownMs:breakerCooldownMs}),
      ]),
    );
  }

  configured(source){
    if(!isZeroCostSourceAllowed(source))return false;
    if(source==='FUGLE')return Boolean(this.fugleApiKey);
    if(source==='SHIOAJI')return Boolean(this.shioajiBridgeUrl);
    return true;
  }

  async json(source,url,{headers={},method='GET',body=null,now=Date.now(),timeoutMs=this.timeoutMs}={}){
    const breaker=this.breakers[source];
    if(!breaker)throw new Error('unknown source '+source);
    return breaker.execute(async()=>{
      let res;
      try{
        res=await this.fetch(url,{
          method,body,signal:AbortSignal.timeout(timeoutMs),
          headers:{Accept:'application/json','Cache-Control':'no-cache',
            'User-Agent':'TF-Asset-MarketCenter/3.2.38',
            Referer:source==='YAHOO'?'https://finance.yahoo.com/':'https://mis.twse.com.tw/stock/index.jsp',
            ...headers},
        });
      }catch(error){
        throw new SourceError('NETWORK',source+' network/timeout',{cause:error});
      }
      if(!res.ok){
        const status=Number(res.status)||0;
        throw new SourceError(status===429?'RATE_LIMIT':'HTTP_'+status,
          source+' HTTP '+status,{status,breakerFailure:status===429||status>=500||status===0});
      }
      try{return await res.json();}
      catch(error){throw new SourceError('INVALID_JSON',source+' invalid JSON',{cause:error});}
    },{now});
  }

  errorText(source,error){
    if(error instanceof CircuitOpenError)return source+': circuit OPEN until '+new Date(error.retryAt).toISOString();
    return source+': '+String(error?.message??error).slice(0,160);
  }

  async mis(symbols,now){
    const chosen=new Map(),errors=[];
    for(let start=0;start<symbols.length;start+=25){
      const chunk=symbols.slice(start,start+25);
      const query=chunk.flatMap(s=>['tse_'+s+'.tw','otc_'+s+'.tw']).join('|');
      try{
        const body=await this.json('TWSE_MIS',MIS+encodeURIComponent(query)+'&json=1&delay=0&_='+now,{now});
        for(const row of Array.isArray(body.msgArray)?body.msgArray:[]){
          const quote=misNormalizedQuote(row,now);
          if(!quote||!chunk.includes(quote.symbol))continue;
          chosen.set(quote.symbol,choosePreferred(chosen.get(quote.symbol),quote));
        }
      }catch(error){errors.push(this.errorText('TWSE_MIS',error));}
    }
    return {quotes:[...chosen.values()],errors};
  }

  async fugle(symbol,now){
    if(!this.fugleApiKey)return {quote:null,errors:[]};
    try{
      const body=await this.json('FUGLE',FUGLE+encodeURIComponent(symbol),{
        now,headers:{'X-API-KEY':this.fugleApiKey},
      });
      return {quote:fugleQuoteFromPayload(body,symbol,now),errors:[]};
    }catch(error){return {quote:null,errors:[this.errorText('FUGLE',error)]};}
  }

  async shioaji(symbols,now){
    if(!this.shioajiBridgeUrl||!symbols.length)return {quotes:[],errors:[]};
    // Credentials stay inside the separately deployed Shioaji bridge.
    // TF Asset consumes only this normalized read-only quote contract.
    try{
      const body=await this.json('SHIOAJI',
        this.shioajiBridgeUrl+'/v1/market/quotes?symbols='+encodeURIComponent(symbols.join(',')),{now});
      const rows=Array.isArray(body)?body:Array.isArray(body?.quotes)?body.quotes:[];
      const quotes=[];
      for(const symbol of symbols){
        const row=rows.find(item=>String(item?.symbol??item?.code??'').trim().toUpperCase()===symbol);
        const quote=shioajiQuoteFromPayload(row,symbol,now);
        if(quote)quotes.push(quote);
      }
      return {quotes,errors:[]};
    }catch(error){return {quotes:[],errors:[this.errorText('SHIOAJI',error)]};}
  }

  async yahoo(symbol,now=Date.now()){
    const errors=[];
    for(const [suffix,market] of [['.TW','TSE'],['.TWO','OTC']]){
      try{
        const body=await this.json('YAHOO',
          YAHOO+encodeURIComponent(symbol+suffix)+'?interval=1m&range=1d',
          {now,headers:{Referer:'https://finance.yahoo.com/'}});
        const quote=yahooQuoteFromChart(body,symbol,market,now);
        if(quote)return {quote,errors};
      }catch(error){errors.push(this.errorText('YAHOO',error));}
    }
    return {quote:null,errors};
  }

  async trades(symbols,now=Date.now()){
    const wanted=[...new Set(symbols.filter(s=>VALID_SYMBOL.test(s)))];
    const chosen=new Map(),errors=[];
    const add=q=>{if(q&&wanted.includes(q.symbol))chosen.set(q.symbol,choosePreferred(chosen.get(q.symbol),q));};

    // Primary A: TWSE MIS
    const mis=await this.mis(wanted,now);
    errors.push(...mis.errors);mis.quotes.forEach(add);

    // Primary B: Fugle. Spend quota only where MIS did not produce an actual trade.
    if(this.configured('FUGLE')){
      const needsFugle=wanted.filter(symbol=>(QUALITY_RANK[chosen.get(symbol)?.quality]??0)<QUALITY_RANK.trade);
      for(const symbol of needsFugle){
        const out=await this.fugle(symbol,now);
        errors.push(...out.errors);add(out.quote);
      }
    }

    // Secondary A: Shioaji bridge, only when no trade/backup realtime is available.
    const needsRealtime=()=>wanted.filter(symbol=>
      (QUALITY_RANK[chosen.get(symbol)?.quality]??0)<QUALITY_RANK.backup_realtime);
    if(this.configured('SHIOAJI')){
      const pending=needsRealtime();
      const out=await this.shioaji(pending,now);
      errors.push(...out.errors);out.quotes.forEach(add);
    }

    // Secondary B: Yahoo.
    for(const symbol of needsRealtime()){
      const out=await this.yahoo(symbol,now);
      errors.push(...out.errors);add(out.quote);
    }

    return {quotes:[...chosen.values()],errors};
  }

  async intraday(symbols,now=Date.now()){
    const output={};
    for(const symbol of symbols){
      if(!VALID_SYMBOL.test(symbol))continue;
      const cached=this.intradayCache.get(symbol);
      if(cached&&cached.expires>now){output[symbol]=cached.series;continue;}
      let series=null;
      for(const [suffix] of [['.TW'],['.TWO']]){
        try{
          const body=await this.json('YAHOO',
            YAHOO+encodeURIComponent(symbol+suffix)+'?interval=1m&range=1d',
            {now,headers:{Referer:'https://finance.yahoo.com/'},timeoutMs:4_000});
          const result=body?.chart?.result?.[0];
          const previousClose=Number(result?.meta?.chartPreviousClose??result?.meta?.previousClose);
          const timestamps=Array.isArray(result?.timestamp)?result.timestamp:[];
          const closes=Array.isArray(result?.indicators?.quote?.[0]?.close)?result.indicators.quote[0].close:[];
          const points=[];let date=null;
          for(let i=0;i<Math.min(timestamps.length,closes.length);i++){
            const at=Number(timestamps[i])*1000,price=Number(closes[i]);
            if(!Number.isFinite(at)||at<=0||at>now+120_000||!Number.isFinite(price)||price<=0)continue;
            const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
              timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',
              hour:'2-digit',minute:'2-digit',hourCycle:'h23',
            }).formatToParts(new Date(at)).map(p=>[p.type,p.value]));
            const minute=Number(parts.hour)*60+Number(parts.minute);
            if(minute<540||minute>810)continue;
            const day=parts.year+'-'+parts.month+'-'+parts.day;
            if(date===null||day>date){date=day;points.length=0;}
            if(day!==date)continue;
            points.push({at,price,quality:'backup_realtime',source:'YAHOO'});
          }
          if(date&&points.length){
            series={date,previousClose:Number.isFinite(previousClose)&&previousClose>0?previousClose:null,points};
            break;
          }
        }catch{}
      }
      if(series){
        const local=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',
          hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now));
        const get=t=>local.find(p=>p.type===t)?.value??'0';
        const minute=Number(get('hour'))*60+Number(get('minute'));
        const ttl=minute>815?6*60*60_000:30_000;
        this.intradayCache.set(symbol,{series,expires:now+ttl});
        output[symbol]=series;
      }
    }
    return output;
  }

  async daily(source,now=Date.now()){
    const hit=this.dailyCache.get(source);
    if(hit&&hit.expires>now)return hit;
    try{
      const rows=await this.json(source,DAILY[source],{now,timeoutMs:5_000});
      if(!Array.isArray(rows))throw new SourceError('BAD_PAYLOAD',source+' payload must be array');
      const mapped=rows.map(row=>officialClose(row,source,now)).filter(Boolean);
      const entry={quotes:mapped,errors:[],expires:now+this.dailyCacheMs};
      this.dailyCache.set(source,entry);return entry;
    }catch(error){
      const entry={quotes:hit?.quotes??[],errors:[this.errorText(source,error)],expires:now+60_000};
      this.dailyCache.set(source,entry);return entry;
    }
  }

  async closes(symbols,now=Date.now()){
    const wanted=new Set(symbols),chosen=new Map(),errors=[];
    for(const source of Object.keys(DAILY)){
      const out=await this.daily(source,now);errors.push(...out.errors);
      for(const q of out.quotes)if(wanted.has(q.symbol))
        chosen.set(q.symbol,choosePreferred(chosen.get(q.symbol),q));
    }
    return {quotes:[...chosen.values()],errors};
  }

  async refresh(symbols,{dailyOnly=false,now=Date.now()}={}){
    const list=[...new Set(symbols.map(s=>String(s).trim().toUpperCase()))].filter(s=>VALID_SYMBOL.test(s));
    if(!list.length)return {quotes:[],errors:[],requested:[],sources:this.health(now)};
    const trades=dailyOnly?{quotes:[],errors:[]}:await this.trades(list,now);
    const live=new Map(trades.quotes.map(q=>[q.symbol,q]));
    const needs=dailyOnly?list:(isSession(now)?[]:list.filter(s=>!live.has(s)||live.get(s)?.quality==='previous_close'));
    const closes=needs.length?await this.closes(needs,now):{quotes:[],errors:[]};
    const combined=new Map([...live.entries()]);
    for(const q of closes.quotes)combined.set(q.symbol,choosePreferred(combined.get(q.symbol),q));
    return {quotes:[...combined.values()],errors:[...trades.errors,...closes.errors],
      requested:list,sources:this.health(now)};
  }

  health(now=Date.now()){
    return Object.fromEntries(Object.entries(this.breakers).map(([source,breaker])=>[
      source,{
        configured:this.configured(source),
        priority:SOURCE_PRIORITY[source],
        policy:zeroCostPolicy(source),
        ...breaker.health(now),
      },
    ]));
  }
}
