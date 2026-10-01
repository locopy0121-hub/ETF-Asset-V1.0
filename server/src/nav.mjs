import {CircuitBreaker,SourceError,CircuitOpenError} from './circuitBreaker.mjs';
import {VALID_SYMBOL,positive,epochLikeToMs} from './parser.mjs';

const MIS_ETF_NAV='https://mis.twse.com.tw/stock/data/all_etf.txt';

const parsePercent=value=>{
  const raw=String(value??'').trim().replace(/,/g,'').replace(/%/g,'');
  const n=Number(raw);
  return Number.isFinite(n)?n:null;
};
const sourceTime=(day,time,now)=>{
  const d=String(day??''),t=String(time??'');
  if(!/^\d{8}$/.test(d)||!/^\d{2}:\d{2}:\d{2}$/.test(t))return null;
  const iso=d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8)+'T'+t+'+08:00';
  const at=Date.parse(iso);
  return Number.isFinite(at)&&at>0&&at<=now+120_000&&at>=now-31*86_400_000?at:null;
};
const flattenMisRows=payload=>{
  const out=[];
  if(Array.isArray(payload?.msgArray))out.push(...payload.msgArray);
  for(const group of Array.isArray(payload?.a1)?payload.a1:[]){
    if(Array.isArray(group?.msgArray))out.push(...group.msgArray);
    else if(Array.isArray(group))out.push(...group);
  }
  return out;
};

export function parseMisEtfNav(payload,symbol,now=Date.now()){
  const row=flattenMisRows(payload).find(item=>String(item?.a??item?.symbol??'').trim().toUpperCase()===symbol);
  if(!row)return null;
  const estimatedNav=positive(row.f??row.estimatedNav??row.nav);
  if(estimatedNav===null)return null;
  return {
    symbol,
    name:String(row.b??row.name??symbol).trim()||symbol,
    estimatedNav,
    marketPrice:positive(row.e??row.marketPrice),
    publishedPremiumDiscountPercent:parsePercent(row.g??row.premiumDiscountPercent),
    source:'TWSE_MIS_ETF_NAV',
    sourceAt:sourceTime(row.i,row.j,now)??epochLikeToMs(row.lastUpdated,now),
    fetchedAt:now,
  };
}

function parseApprovedNavRow(row,symbol,now){
  if(!row||String(row.symbol??row.code??'').trim().toUpperCase()!==symbol)return null;
  const estimatedNav=positive(row.estimatedNav??row.iNav??row.nav);
  if(estimatedNav===null)return null;
  const sourceAt=epochLikeToMs(row.sourceAt??row.sourceTimestamp??row.updatedAt,now)
    ??(typeof row.sourceAt==='string'?Date.parse(row.sourceAt):null);
  return {
    symbol,
    name:String(row.name??symbol).trim()||symbol,
    estimatedNav,
    marketPrice:positive(row.marketPrice??row.price),
    publishedPremiumDiscountPercent:parsePercent(row.publishedPremiumDiscountPercent??row.premiumDiscountPercent),
    source:'ETF_NAV_APPROVED',
    sourceAt:Number.isFinite(sourceAt)?sourceAt:null,
    fetchedAt:now,
  };
}

export class EtfNavService {
  constructor({
    fetchImpl=globalThis.fetch,
    approvedFeedUrl=process.env.ETF_NAV_FEED_URL??'',
    timeoutMs=3500,
    cacheMs=15_000,
    threshold=3,
    cooldownMs=5*60_000,
  }={}){
    this.fetch=fetchImpl;
    this.approvedFeedUrl=String(approvedFeedUrl).trim();
    this.timeoutMs=timeoutMs;
    this.cacheMs=cacheMs;
    this.cache=new Map();
    this.breakers={
      ETF_NAV_APPROVED:new CircuitBreaker('ETF_NAV_APPROVED',{threshold,cooldownMs}),
      TWSE_MIS_ETF_NAV:new CircuitBreaker('TWSE_MIS_ETF_NAV',{threshold,cooldownMs}),
    };
  }
  async json(source,url,headers={},now=Date.now()){
    const breaker=this.breakers[source];
    return breaker.execute(async()=>{
      let response;
      try{
        response=await this.fetch(url,{signal:AbortSignal.timeout(this.timeoutMs),headers:{
          Accept:'application/json','Cache-Control':'no-cache',
          'User-Agent':'TF-Asset-MarketCenter/3.2.36',
          Referer:'https://mis.twse.com.tw/stock/etf_nav.jsp?ex=tse',...headers,
        }});
      }catch(error){
        throw new SourceError('NETWORK',source+' network error',{cause:error});
      }
      if(!response.ok)throw new SourceError(
        response.status===429?'RATE_LIMIT':'HTTP_'+response.status,
        source+' HTTP '+response.status,{status:response.status,breakerFailure:response.status===429||response.status>=500},
      );
      try{return await response.json();}
      catch(error){throw new SourceError('INVALID_JSON',source+' invalid JSON',{cause:error});}
    },{now});
  }
  async approved(symbol,now){
    if(!this.approvedFeedUrl)return null;
    const separator=this.approvedFeedUrl.includes('?')?'&':'?';
    const body=await this.json('ETF_NAV_APPROVED',
      this.approvedFeedUrl+separator+'symbol='+encodeURIComponent(symbol),{},now);
    const rows=Array.isArray(body)?body:Array.isArray(body?.data)?body.data:[body];
    return rows.map(row=>parseApprovedNavRow(row,symbol,now)).find(Boolean)??null;
  }
  async mis(symbol,now){
    const body=await this.json('TWSE_MIS_ETF_NAV',MIS_ETF_NAV+'?_='+now,{},now);
    return parseMisEtfNav(body,symbol,now);
  }
  async get(symbolInput,quote=null,now=Date.now()){
    const symbol=String(symbolInput).trim().toUpperCase();
    if(!VALID_SYMBOL.test(symbol))throw new Error('invalid ETF symbol');
    const cached=this.cache.get(symbol);
    if(cached&&cached.expires>now)return this.decorate(cached.nav,quote,now,true);
    const errors=[];
    let nav=null;
    for(const [source,fn] of [
      ['ETF_NAV_APPROVED',()=>this.approved(symbol,now)],
      ['TWSE_MIS_ETF_NAV',()=>this.mis(symbol,now)],
    ]){
      if(source==='ETF_NAV_APPROVED'&&!this.approvedFeedUrl)continue;
      try{
        nav=await fn();
        if(nav)break;
      }catch(error){
        errors.push(error instanceof CircuitOpenError?source+' circuit open':source+': '+String(error?.message??error));
      }
    }
    if(!nav){
      if(cached)return {...this.decorate(cached.nav,quote,now,true),stale:true,errors};
      return {symbol,available:false,errors};
    }
    this.cache.set(symbol,{nav,expires:now+this.cacheMs});
    return {...this.decorate(nav,quote,now,false),errors};
  }
  decorate(nav,quote,now,servedFromCache){
    const quotePrice=positive(quote?.currentPrice??quote?.price);
    const marketPrice=quotePrice??nav.marketPrice;
    const ratio=marketPrice===null?null:((marketPrice-nav.estimatedNav)/nav.estimatedNav)*100;
    const published=nav.publishedPremiumDiscountPercent;
    return {
      symbol:nav.symbol,name:nav.name,available:true,
      estimatedNav:nav.estimatedNav,marketPrice,
      premiumDiscountPercent:ratio,
      premiumDiscountState:ratio===null?'UNKNOWN':ratio>0?'PREMIUM':ratio<0?'DISCOUNT':'PAR',
      publishedPremiumDiscountPercent:published,
      premiumDriftBps:ratio===null||published===null?null:(ratio-published)*100,
      navSource:nav.source,navSourceAt:nav.sourceAt,fetchedAt:nav.fetchedAt,
      quoteSource:quote?.source??(nav.marketPrice!==null?'TWSE_MIS_ETF_NAV':null),
      quoteSourceAt:quote?.sourceQuoteAt??nav.sourceAt,
      quoteIsRealtime:Boolean(quote&&['trade','backup_realtime'].includes(quote.quality)),
      servedFromCache,stale:Boolean(servedFromCache&&now-nav.fetchedAt>this.cacheMs),
    };
  }
  async getMany(symbols,quoteMap=new Map(),now=Date.now()){
    const list=[...new Set(symbols.map(s=>String(s).trim().toUpperCase()))].filter(s=>VALID_SYMBOL.test(s));
    const results=[];
    for(const symbol of list)results.push(await this.get(symbol,quoteMap.get(symbol)??null,now));
    return results;
  }
  async refresh(symbols,quoteMap=new Map(),now=Date.now()){
    for(const symbol of symbols)this.cache.delete(String(symbol).trim().toUpperCase());
    return this.getMany(symbols,quoteMap,now);
  }
  health(now=Date.now()){
    return Object.fromEntries(Object.entries(this.breakers).map(([key,value])=>[key,{
      configured:key!=='ETF_NAV_APPROVED'||Boolean(this.approvedFeedUrl),...value.health(now),
    }]));
  }
}
