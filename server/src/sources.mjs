import {misNormalizedQuote,yahooQuoteFromChart,officialClose,chooseNewer,VALID_SYMBOL} from './parser.mjs';

const MIS='https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=';
const YAHOO='https://query1.finance.yahoo.com/v8/finance/chart/';
const DAILY={
  TWSE_DAILY:'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
  TPEX_DAILY:'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes',
};
export class OfficialSources{
  constructor({fetchImpl=globalThis.fetch,dailyCacheMs=300_000}={}){
    this.fetch=fetchImpl;
    this.dailyCacheMs=dailyCacheMs;
    this.dailyCache=new Map();
  }
  async json(url,headers={}){
    const res=await this.fetch(url,{signal:AbortSignal.timeout(9_000),
      headers:{Accept:'application/json','Cache-Control':'no-cache',
        'User-Agent':'TF-Asset-MarketCenter/3.2.6',
        Referer:'https://mis.twse.com.tw/stock/index.jsp',...headers}});
    if(!res.ok)throw new Error('HTTP '+res.status);
    return await res.json();
  }
  async yahoo(symbol,now=Date.now()){
    const errors=[];
    for(const [suffix,market] of [['.TW','TSE'],['.TWO','OTC']]){
      try{
        const body=await this.json(YAHOO+encodeURIComponent(symbol+suffix)+'?interval=1m&range=1d',
          {Referer:'https://finance.yahoo.com/'});
        const quote=yahooQuoteFromChart(body,symbol,market,now);
        if(quote)return {quote,errors};
      }catch(error){errors.push('YAHOO '+symbol+suffix+': '+String(error.message??error).slice(0,120));}
    }
    return {quote:null,errors};
  }
  async trades(symbols,now=Date.now()){
    const wanted=new Set(symbols.filter(s=>VALID_SYMBOL.test(s)));
    const chosen=new Map(),errors=[];
    for(let start=0;start<symbols.length;start+=25){
      const chunk=symbols.slice(start,start+25);
      const query=chunk.flatMap(s=>['tse_'+s+'.tw','otc_'+s+'.tw']).join('|');
      try{
        const body=await this.json(MIS+encodeURIComponent(query)+'&json=1&delay=0&_='+now);
        const rows=Array.isArray(body.msgArray)?body.msgArray:[];
        for(const row of rows){
          const quote=misNormalizedQuote(row,now);
          if(!quote||!wanted.has(quote.symbol))continue;
          chosen.set(quote.symbol,chooseNewer(chosen.get(quote.symbol),quote));
        }
      }catch(error){errors.push('TWSE_MIS: '+String(error.message??error).slice(0,120));}
    }
    // Provider/network failure or an unmapped symbol falls through to Yahoo.
    // A valid TWSE pz/book/y candidate is retained with explicit fallback metadata.
    const unresolved=[...wanted].filter(symbol=>!chosen.has(symbol));
    for(const symbol of unresolved){
      const out=await this.yahoo(symbol,now);
      errors.push(...out.errors);
      if(out.quote)chosen.set(symbol,out.quote);
    }
    return {quotes:[...chosen.values()],errors};
  }
  async daily(source,now=Date.now()){
    const hit=this.dailyCache.get(source);
    if(hit&&hit.expires>now)return hit;
    try{
      const rows=await this.json(DAILY[source]);
      if(!Array.isArray(rows))throw new Error('official daily payload must be an array');
      const mapped=rows.map(row=>officialClose(row,source,now)).filter(Boolean);
      const entry={quotes:mapped,errors:[],expires:now+this.dailyCacheMs};
      this.dailyCache.set(source,entry);
      return entry;
    }catch(error){
      const entry={quotes:hit?.quotes??[],
        errors:[source+': '+String(error.message??error).slice(0,120)],
        expires:now+60_000};
      this.dailyCache.set(source,entry);
      return entry;
    }
  }
  async closes(symbols,now=Date.now()){
    const wanted=new Set(symbols),chosen=new Map(),errors=[];
    for(const source of Object.keys(DAILY)){
      const out=await this.daily(source,now);
      errors.push(...out.errors);
      for(const q of out.quotes){
        if(wanted.has(q.symbol))chosen.set(q.symbol,chooseNewer(chosen.get(q.symbol),q));
      }
    }
    return {quotes:[...chosen.values()],errors};
  }
  async refresh(symbols,{dailyOnly=false,now=Date.now()}={}){
    const list=[...new Set(symbols.map(s=>String(s).trim().toUpperCase()))]
      .filter(s=>VALID_SYMBOL.test(s));
    if(!list.length)return {quotes:[],errors:[],requested:[]};
    const trades=dailyOnly?{quotes:[],errors:[]}:await this.trades(list,now);
    const live=new Map(trades.quotes.map(q=>[q.symbol,q]));
    const needs=dailyOnly?list:list.filter(s=>!live.has(s)||live.get(s)?.quality==='previous_close');
    const closes=needs.length?await this.closes(needs,now):{quotes:[],errors:[]};
    const combined=new Map([...live.entries()]);
    for(const q of closes.quotes)combined.set(q.symbol,chooseNewer(combined.get(q.symbol),q));
    return {quotes:[...combined.values()],errors:[...trades.errors,...closes.errors],requested:list};
  }
}
