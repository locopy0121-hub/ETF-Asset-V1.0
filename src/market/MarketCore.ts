export type MarketSource='FUGLE'|'TWSE_MIS'|'YAHOO'|'CACHE';
export type QuoteQuality='LIVE'|'DELAYED'|'STALE'|'OFFLINE';
export type ProviderAvailability='READY'|'THROTTLED'|'COOLDOWN';
export type ProviderCircuitState='HEALTHY'|'DEGRADED'|'COOLDOWN'|'RECOVERING';
export type MarketProviderCapability='STREAM'|'POLL'|'BATCH';

export type MarketQuote=Readonly<{
  symbol:string;
  name:string;
  exchange?:string;
  market?:string;
  price:number;
  previousClose?:number;
  open?:number;
  high?:number;
  low?:number;
  change?:number;
  changePercent?:number;
  volume?:number;
  bid?:number;
  ask?:number;
  source:MarketSource;
  quality:QuoteQuality;
  sourceTimestampEpochMillis:number;
  receivedAtEpochMillis:number;
  sessionDate:string;
  fallbackLevel:number;
  sequence?:number;
  isTrial?:boolean;
  isClose?:boolean;
  priceKind?:'lastTrade'|'bid'|'ask'|'regularMarketPrice';
}>;

export type MarketProviderPolicy=Readonly<{
  minFetchIntervalMillis:number;
  maxBackoffMillis:number;
}>;

export type ProviderHealth=Readonly<{
  source:MarketSource;
  availability:ProviderAvailability;
  consecutiveFailures:number;
  lastAttemptEpochMillis:number|null;
  lastSuccessEpochMillis:number|null;
  nextAllowedEpochMillis:number;
  circuitState:ProviderCircuitState;
}>;

export type MarketBatch=Readonly<{
  quotes:ReadonlyMap<string,MarketQuote>;
  staleQuotes:ReadonlyMap<string,MarketQuote>;
  unresolvedSymbols:ReadonlySet<string>;
  sourcesTried:readonly MarketSource[];
  refreshedAtEpochMillis:number;
  providerHealth:readonly ProviderHealth[];
}>;

export class MarketProviderException extends Error{
  readonly httpStatusCode:number|null;
  readonly retryAfterMillis:number|null;
  constructor(message:string,options?:{httpStatusCode?:number|null;retryAfterMillis?:number|null}){
    super(message);
    this.name='MarketProviderException';
    this.httpStatusCode=options?.httpStatusCode??null;
    this.retryAfterMillis=options?.retryAfterMillis??null;
  }
}

export interface MarketQuoteProvider{
  readonly source:MarketSource;
  readonly capabilities:ReadonlySet<MarketProviderCapability>;
  fetch(symbols:ReadonlySet<string>):Promise<ReadonlyMap<string,MarketQuote>>;
}

export function normalizeSymbol(value:string):string{
  return value.trim().toUpperCase();
}

export function taipeiDate(epochMillis:number):string{
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',
  }).formatToParts(new Date(epochMillis));
  const get=(type:string)=>parts.find(part=>part.type===type)?.value??'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function qualityRank(value:QuoteQuality):number{
  return value==='LIVE'?4:value==='DELAYED'?3:value==='STALE'?2:1;
}

const DEFAULT_SOURCE_PRIORITY:Readonly<Record<MarketSource,number>>={
  FUGLE:0,TWSE_MIS:1,YAHOO:2,CACHE:3,
};

export type ArbitrationReason=
  |'ACCEPT_EMPTY'|'ACCEPT_NEWER_SESSION'|'ACCEPT_NEWER_SEQUENCE'|'ACCEPT_NEWER_TIMESTAMP'
  |'ACCEPT_BETTER_QUALITY'|'ACCEPT_LOWER_FALLBACK_LEVEL'|'ACCEPT_HIGHER_SOURCE_PRIORITY'
  |'ACCEPT_NEWER_RECEIVED_AT'|'REJECT_INVALID'|'REJECT_OLDER_SESSION'
  |'REJECT_OUT_OF_ORDER_SEQUENCE'|'REJECT_OLDER_TIMESTAMP'|'KEEP_EXISTING';

export class MarketArbitrator{
  constructor(private readonly sourcePriority:Readonly<Record<MarketSource,number>>=DEFAULT_SOURCE_PRIORITY){}
  decide(existing:MarketQuote|undefined,candidate:MarketQuote):Readonly<{accepted:boolean;reason:ArbitrationReason}>{
    if(!Number.isFinite(candidate.price)||candidate.price<=0||candidate.isTrial)return {accepted:false,reason:'REJECT_INVALID'};
    if(!existing)return {accepted:true,reason:'ACCEPT_EMPTY'};
    if(candidate.sessionDate>existing.sessionDate)return {accepted:true,reason:'ACCEPT_NEWER_SESSION'};
    if(candidate.sessionDate<existing.sessionDate)return {accepted:false,reason:'REJECT_OLDER_SESSION'};
    if(candidate.source===existing.source&&candidate.sequence!=null&&existing.sequence!=null){
      if(candidate.sequence>existing.sequence)return {accepted:true,reason:'ACCEPT_NEWER_SEQUENCE'};
      if(candidate.sequence<existing.sequence)return {accepted:false,reason:'REJECT_OUT_OF_ORDER_SEQUENCE'};
    }
    if(candidate.sourceTimestampEpochMillis>existing.sourceTimestampEpochMillis)return {accepted:true,reason:'ACCEPT_NEWER_TIMESTAMP'};
    if(candidate.sourceTimestampEpochMillis<existing.sourceTimestampEpochMillis)return {accepted:false,reason:'REJECT_OLDER_TIMESTAMP'};
    const cq=qualityRank(candidate.quality),eq=qualityRank(existing.quality);
    if(cq>eq)return {accepted:true,reason:'ACCEPT_BETTER_QUALITY'};
    if(cq<eq)return {accepted:false,reason:'KEEP_EXISTING'};
    if(candidate.fallbackLevel<existing.fallbackLevel)return {accepted:true,reason:'ACCEPT_LOWER_FALLBACK_LEVEL'};
    if(candidate.fallbackLevel>existing.fallbackLevel)return {accepted:false,reason:'KEEP_EXISTING'};
    const cp=this.sourcePriority[candidate.source]??Number.MAX_SAFE_INTEGER;
    const ep=this.sourcePriority[existing.source]??Number.MAX_SAFE_INTEGER;
    if(cp<ep)return {accepted:true,reason:'ACCEPT_HIGHER_SOURCE_PRIORITY'};
    if(cp>ep)return {accepted:false,reason:'KEEP_EXISTING'};
    if(candidate.receivedAtEpochMillis>existing.receivedAtEpochMillis)return {accepted:true,reason:'ACCEPT_NEWER_RECEIVED_AT'};
    return {accepted:false,reason:'KEEP_EXISTING'};
  }
}

export type CircuitBreakerPolicy=Readonly<{
  failureThreshold:number;
  recoverySuccessThreshold:number;
  defaultCooldownMillis:number;
  maxCooldownMillis:number;
}>;

const DEFAULT_BREAKER_POLICY:CircuitBreakerPolicy={
  failureThreshold:2,recoverySuccessThreshold:2,defaultCooldownMillis:5000,maxCooldownMillis:15*60*1000,
};

export class ProviderCircuitBreaker{
  private state:ProviderCircuitState='HEALTHY';
  private consecutiveFailures=0;
  private recoverySuccesses=0;
  private cooldownUntilEpochMillis=0;
  constructor(private readonly policy:CircuitBreakerPolicy=DEFAULT_BREAKER_POLICY){}
  canAttempt(now:number):boolean{
    if(this.state==='COOLDOWN'&&now>=this.cooldownUntilEpochMillis){
      this.state='RECOVERING';this.recoverySuccesses=0;
    }
    if(this.state==='COOLDOWN')return false;
    if(this.state==='DEGRADED')return now>=this.cooldownUntilEpochMillis;
    return true;
  }
  recordSuccess(now:number):void{
    if(this.state==='RECOVERING'){
      this.recoverySuccesses+=1;
      if(this.recoverySuccesses<this.policy.recoverySuccessThreshold)return;
    }
    if(this.state==='COOLDOWN'&&now<this.cooldownUntilEpochMillis)return;
    this.state='HEALTHY';this.consecutiveFailures=0;this.recoverySuccesses=0;this.cooldownUntilEpochMillis=0;
  }
  recordFailure(now:number,cooldownMillis?:number):void{
    this.consecutiveFailures+=1;this.recoverySuccesses=0;
    const shouldOpen=this.state==='RECOVERING'||this.consecutiveFailures>=this.policy.failureThreshold;
    const requested=cooldownMillis??this.policy.defaultCooldownMillis;
    this.cooldownUntilEpochMillis=now+Math.max(1000,Math.min(this.policy.maxCooldownMillis,requested));
    this.state=shouldOpen?'COOLDOWN':'DEGRADED';
  }
  forceCooldown(now:number,cooldownMillis:number):void{
    this.consecutiveFailures=Math.max(this.consecutiveFailures+1,this.policy.failureThreshold);
    this.recoverySuccesses=0;this.state='COOLDOWN';
    this.cooldownUntilEpochMillis=now+Math.max(1000,Math.min(this.policy.maxCooldownMillis,cooldownMillis));
  }
  snapshot(now:number){
    if(this.state==='COOLDOWN'&&now>=this.cooldownUntilEpochMillis){
      this.state='RECOVERING';this.recoverySuccesses=0;
    }
    return {
      state:this.state,consecutiveFailures:this.consecutiveFailures,
      recoverySuccesses:this.recoverySuccesses,cooldownUntilEpochMillis:this.cooldownUntilEpochMillis,
    } as const;
  }
}

export class MemoryMarketStore{
  private readonly quotes=new Map<string,MarketQuote>();
  private readonly listeners=new Set<(snapshot:ReadonlyMap<string,MarketQuote>)=>void>();
  constructor(initial?:Iterable<readonly [string,MarketQuote]>){
    if(initial)for(const [,quote] of initial)this.setInternal(quote);
  }
  private setInternal(raw:MarketQuote):void{
    const symbol=normalizeSymbol(raw.symbol);
    if(!symbol||!Number.isFinite(raw.price)||raw.price<=0)return;
    this.quotes.set(symbol,{...raw,symbol});
  }
  publish(updates:Iterable<MarketQuote>):ReadonlyMap<string,MarketQuote>{
    let changed=false;
    for(const quote of updates){const before=this.quotes.get(normalizeSymbol(quote.symbol));this.setInternal(quote);changed=changed||before!==this.quotes.get(normalizeSymbol(quote.symbol));}
    if(changed)this.emit();
    return this.snapshot();
  }
  replace(input:Iterable<MarketQuote>):ReadonlyMap<string,MarketQuote>{
    this.quotes.clear();for(const quote of input)this.setInternal(quote);this.emit();return this.snapshot();
  }
  snapshot(symbols?:ReadonlySet<string>):ReadonlyMap<string,MarketQuote>{
    if(!symbols||symbols.size===0)return new Map(this.quotes);
    const requested=new Set([...symbols].map(normalizeSymbol));
    return new Map([...this.quotes].filter(([symbol])=>requested.has(symbol)));
  }
  subscribe(listener:(snapshot:ReadonlyMap<string,MarketQuote>)=>void):()=>void{
    this.listeners.add(listener);return()=>this.listeners.delete(listener);
  }
  private emit(){const snapshot=this.snapshot();for(const listener of this.listeners)listener(snapshot);}
}

type ProviderRuntime={lastAttemptEpochMillis:number|null;lastSuccessEpochMillis:number|null;breaker:ProviderCircuitBreaker};

const DEFAULT_POLICIES:Readonly<Partial<Record<MarketSource,MarketProviderPolicy>>>={
  TWSE_MIS:{minFetchIntervalMillis:1000,maxBackoffMillis:60000},
  YAHOO:{minFetchIntervalMillis:15000,maxBackoffMillis:5*60*1000},
};

export class MarketDataCenter{
  private readonly cache=new Map<string,MarketQuote>();
  private readonly runtime=new Map<MarketSource,ProviderRuntime>();
  constructor(
    private readonly providers:readonly MarketQuoteProvider[],
    private readonly options:Readonly<{
      liveThresholdMillis?:number;
      maxOfflineCacheAgeMillis?:number;
      providerPolicies?:Readonly<Partial<Record<MarketSource,MarketProviderPolicy>>>;
      hotStore?:MemoryMarketStore;
      arbitrator?:MarketArbitrator;
    }>={},
  ){
    for(const provider of providers)this.runtime.set(provider.source,{lastAttemptEpochMillis:null,lastSuccessEpochMillis:null,breaker:new ProviderCircuitBreaker()});
  }
  private get hotStore(){return this.options.hotStore??this.defaultHotStore;}
  private readonly defaultHotStore=new MemoryMarketStore();
  private get arbitrator(){return this.options.arbitrator??this.defaultArbitrator;}
  private readonly defaultArbitrator=new MarketArbitrator();
  subscribe(listener:(snapshot:ReadonlyMap<string,MarketQuote>)=>void):()=>void{return this.hotStore.subscribe(listener);}
  memoryQuotes(symbols?:ReadonlySet<string>):ReadonlyMap<string,MarketQuote>{return this.hotStore.snapshot(symbols);}
  cachedQuotes(symbols:ReadonlySet<string>):ReadonlyMap<string,MarketQuote>{
    const requested=new Set([...symbols].map(normalizeSymbol));
    return new Map([...this.cache].filter(([symbol])=>requested.has(symbol)));
  }
  seedCache(quotes:Iterable<MarketQuote>,publish=true):void{
    const accepted:MarketQuote[]=[];
    for(const quote of quotes){
      const symbol=normalizeSymbol(quote.symbol);
      if(!symbol||!Number.isFinite(quote.price)||quote.price<=0)continue;
      const normalized={...quote,symbol,source:'CACHE' as const,quality:quote.quality==='LIVE'?'STALE' as const:quote.quality};
      this.cache.set(symbol,normalized);accepted.push(normalized);
    }
    if(publish&&accepted.length)this.hotStore.publish(accepted);
  }
  private qualityFor(quoteTime:number,now:number,currentDate:string):QuoteQuality{
    if(taipeiDate(quoteTime)!==currentDate)return 'STALE';
    return Math.max(0,now-quoteTime)<=(this.options.liveThresholdMillis??30000)?'LIVE':'DELAYED';
  }
  private policy(source:MarketSource):MarketProviderPolicy{
    return this.options.providerPolicies?.[source]??DEFAULT_POLICIES[source]??{minFetchIntervalMillis:1000,maxBackoffMillis:60000};
  }
  private canAttempt(runtime:ProviderRuntime,policy:MarketProviderPolicy,now:number):boolean{
    if(!runtime.breaker.canAttempt(now))return false;
    return runtime.lastAttemptEpochMillis==null||now-runtime.lastAttemptEpochMillis>=policy.minFetchIntervalMillis;
  }
  private backoffFor(error:unknown,failures:number,policy:MarketProviderPolicy):number{
    if(error instanceof MarketProviderException){
      if(error.retryAfterMillis&&error.retryAfterMillis>0)return Math.min(error.retryAfterMillis,15*60*1000);
      if(error.httpStatusCode===429)return 60000;
      if(error.httpStatusCode===403)return 5*60*1000;
    }
    const exponent=Math.max(0,Math.min(6,failures-1));
    const delay=2000*(2**exponent);
    const jitter=(failures*137)%750;
    return Math.min(delay+jitter,policy.maxBackoffMillis);
  }
  async refresh(input:{symbols:ReadonlySet<string>;nowEpochMillis:number;currentTaipeiDate:string;tradingSessionActive:boolean}):Promise<MarketBatch>{
    const requested=new Set([...input.symbols].map(normalizeSymbol).filter(Boolean));
    if(!requested.size)return {
      quotes:new Map(),staleQuotes:new Map(),unresolvedSymbols:new Set(),sourcesTried:[],
      refreshedAtEpochMillis:input.nowEpochMillis,providerHealth:this.providerHealthSnapshot(input.nowEpochMillis),
    };
    const accepted=new Map<string,MarketQuote>(),stale=new Map<string,MarketQuote>(),pending=new Set(requested);
    const sourcesTried:MarketSource[]=[];
    for(const raw of this.hotStore.snapshot(pending).values()){
      if(raw.source!=='FUGLE')continue;
      const normalized={...raw,quality:this.qualityFor(raw.sourceTimestampEpochMillis,input.nowEpochMillis,input.currentTaipeiDate)};
      if(normalized.sessionDate===input.currentTaipeiDate&&normalized.quality==='LIVE'){
        accepted.set(normalized.symbol,normalized);pending.delete(normalized.symbol);
      }
    }
    for(const provider of this.providers){
      if(!pending.size)break;
      const runtime=this.runtime.get(provider.source)??{lastAttemptEpochMillis:null,lastSuccessEpochMillis:null,breaker:new ProviderCircuitBreaker()};
      this.runtime.set(provider.source,runtime);
      const policy=this.policy(provider.source);
      if(!this.canAttempt(runtime,policy,input.nowEpochMillis))continue;
      sourcesTried.push(provider.source);runtime.lastAttemptEpochMillis=input.nowEpochMillis;
      let result:ReadonlyMap<string,MarketQuote>;
      try{
        result=await provider.fetch(new Set(pending));
        runtime.lastSuccessEpochMillis=input.nowEpochMillis;runtime.breaker.recordSuccess(input.nowEpochMillis);
      }catch(error){
        const failures=runtime.breaker.snapshot(input.nowEpochMillis).consecutiveFailures+1;
        const delay=this.backoffFor(error,failures,policy);
        const immediate=error instanceof MarketProviderException&&(error.retryAfterMillis!=null||error.httpStatusCode===429||error.httpStatusCode===403);
        if(immediate)runtime.breaker.forceCooldown(input.nowEpochMillis,delay);else runtime.breaker.recordFailure(input.nowEpochMillis,delay);
        result=new Map();
      }
      for(const raw of result.values()){
        const symbol=normalizeSymbol(raw.symbol);
        if(!pending.has(symbol)||!Number.isFinite(raw.price)||raw.price<=0)continue;
        const sourceTime=raw.sourceTimestampEpochMillis>0?raw.sourceTimestampEpochMillis:input.nowEpochMillis;
        const normalized:MarketQuote={...raw,symbol,sourceTimestampEpochMillis:sourceTime,
          receivedAtEpochMillis:raw.receivedAtEpochMillis>0?raw.receivedAtEpochMillis:input.nowEpochMillis,
          sessionDate:raw.sessionDate||taipeiDate(sourceTime),
          quality:this.qualityFor(sourceTime,input.nowEpochMillis,input.currentTaipeiDate)};
        const existing=this.hotStore.snapshot(new Set([symbol])).get(symbol)??this.cache.get(symbol);
        if(!this.arbitrator.decide(existing,normalized).accepted)continue;
        this.cache.set(symbol,normalized);
        if(input.tradingSessionActive&&normalized.sessionDate!==input.currentTaipeiDate){
          stale.set(symbol,{...normalized,quality:'STALE'});
        }else{
          accepted.set(symbol,normalized);pending.delete(symbol);
        }
      }
    }
    for(const symbol of [...pending]){
      const cached=this.cache.get(symbol);if(!cached)continue;
      const age=Math.max(0,input.nowEpochMillis-cached.sourceTimestampEpochMillis);
      if(age>(this.options.maxOfflineCacheAgeMillis??7*24*60*60*1000))continue;
      const normalized={...cached,quality:this.qualityFor(cached.sourceTimestampEpochMillis,input.nowEpochMillis,input.currentTaipeiDate)};
      if(input.tradingSessionActive&&normalized.sessionDate!==input.currentTaipeiDate){
        stale.set(symbol,{...normalized,quality:'STALE'});
      }else{
        accepted.set(symbol,normalized);pending.delete(symbol);
      }
    }
    if(accepted.size)this.hotStore.publish(accepted.values());
    return {quotes:accepted,staleQuotes:stale,unresolvedSymbols:pending,sourcesTried,
      refreshedAtEpochMillis:input.nowEpochMillis,providerHealth:this.providerHealthSnapshot(input.nowEpochMillis)};
  }
  acceptStreamingQuote(raw:MarketQuote,nowEpochMillis=Date.now(),currentTaipeiDate=taipeiDate(Date.now())):boolean{
    const symbol=normalizeSymbol(raw.symbol);
    if(!symbol||!Number.isFinite(raw.price)||raw.price<=0||raw.isTrial)return false;
    const sourceTime=raw.sourceTimestampEpochMillis;
    if(taipeiDate(sourceTime)!==currentTaipeiDate)return false;
    const normalized:MarketQuote={...raw,symbol,sessionDate:currentTaipeiDate,
      receivedAtEpochMillis:raw.receivedAtEpochMillis>0?raw.receivedAtEpochMillis:nowEpochMillis,
      quality:this.qualityFor(sourceTime,nowEpochMillis,currentTaipeiDate)};
    const existing=this.hotStore.snapshot(new Set([symbol])).get(symbol)??this.cache.get(symbol);
    if(!this.arbitrator.decide(existing,normalized).accepted)return false;
    this.cache.set(symbol,normalized);this.hotStore.publish([normalized]);return true;
  }
  providerHealthSnapshot(now:number):readonly ProviderHealth[]{
    return this.providers.map(provider=>{
      const runtime=this.runtime.get(provider.source)??{lastAttemptEpochMillis:null,lastSuccessEpochMillis:null,breaker:new ProviderCircuitBreaker()};
      this.runtime.set(provider.source,runtime);
      const policy=this.policy(provider.source);
      const nextByInterval=(runtime.lastAttemptEpochMillis??0)+policy.minFetchIntervalMillis;
      const breaker=runtime.breaker.snapshot(now);
      const nextAllowed=Math.max(nextByInterval,breaker.cooldownUntilEpochMillis);
      const availability:ProviderAvailability=breaker.state==='COOLDOWN'?'COOLDOWN':
        breaker.state==='RECOVERING'||now<nextAllowed?'THROTTLED':'READY';
      return {source:provider.source,availability,consecutiveFailures:breaker.consecutiveFailures,
        lastAttemptEpochMillis:runtime.lastAttemptEpochMillis,lastSuccessEpochMillis:runtime.lastSuccessEpochMillis,
        nextAllowedEpochMillis:nextAllowed,circuitState:breaker.state};
    });
  }
}
