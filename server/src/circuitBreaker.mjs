export class SourceError extends Error {
  constructor(code,message,{status=null,breakerFailure=true,cause=null}={}){
    super(message,{cause});
    this.name='SourceError';
    this.code=code;
    this.status=status;
    this.breakerFailure=breakerFailure;
  }
}

export class CircuitOpenError extends Error {
  constructor(source,retryAt){
    super(source+' circuit is OPEN');
    this.name='CircuitOpenError';
    this.source=source;
    this.retryAt=retryAt;
    this.breakerFailure=false;
  }
}

/**
 * Per-provider circuit breaker.
 * CLOSED -> 3 consecutive operational failures -> OPEN for 5 minutes.
 * After cooldown the first request is HALF_OPEN; success closes it, failure re-opens it.
 */
export class CircuitBreaker {
  constructor(source,{threshold=3,cooldownMs=5*60_000}={}){
    this.source=source;
    this.threshold=Math.max(1,threshold);
    this.cooldownMs=Math.max(1_000,cooldownMs);
    this.failures=0;
    this.openUntil=0;
    this.halfOpenProbe=false;
  }
  state(now=Date.now()){
    if(this.openUntil===0)return 'CLOSED';
    if(now<this.openUntil)return 'OPEN';
    return 'HALF_OPEN';
  }
  async execute(fn,{now=Date.now()}={}){
    const state=this.state(now);
    if(state==='OPEN')throw new CircuitOpenError(this.source,this.openUntil);
    if(state==='HALF_OPEN'){
      if(this.halfOpenProbe)throw new CircuitOpenError(this.source,this.openUntil);
      this.halfOpenProbe=true;
    }
    try{
      const value=await fn();
      this.failures=0;
      this.openUntil=0;
      return value;
    }catch(error){
      const count=error?.breakerFailure!==false;
      if(count){
        this.failures++;
        if(state==='HALF_OPEN'||this.failures>=this.threshold)
          this.openUntil=now+this.cooldownMs;
      }
      throw error;
    }finally{
      if(state==='HALF_OPEN')this.halfOpenProbe=false;
    }
  }
  health(now=Date.now()){
    return {
      source:this.source,
      state:this.state(now),
      consecutiveFailures:this.failures,
      retryAt:this.state(now)==='OPEN'?this.openUntil:null,
    };
  }
}
