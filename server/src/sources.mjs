import {misTrade,officialClose,chooseNewer,VALID_SYMBOL} from './parser.mjs';

const MIS='https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=';
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
  async json(url){
    const res=await this.fetch(url,{signal:AbortSignal.timeout(9_000),
      headers:{Accept:'application/json','Cache-Control':'no-cache',
        Referer:'https://mis.twse.com.tw/stock/index.jsp'}});
    if(!res.ok)throw new Error('Official HTTP '+res.status);
    const body=await res.json();
    return body;
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
          const quote=misTrade(row,now);
          if(!quote||!wanted.has(quote.symbol))continue;
          chosen.set(quote.symbol,chooseNewer(chosen.get(quote.symbol),quote));
        }
      }catch(error){errors.push('TWSE_MIS: '+String(error.message??error).slice(0,120));}
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
      // Old verified closes are still dated and never relabeled as fresh ticks.
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
    // Daily official data is requested at most once per cache window, not every
    // five-second poll. A quote absent in MIS cannot clear a prior accepted row.
    const needs=dailyOnly?list:list.filter(s=>!live.has(s));
    const closes=needs.length?await this.closes(needs,now):{quotes:[],errors:[]};
    const combined=new Map([...live.entries()]);
    for(const q of closes.quotes)combined.set(q.symbol,chooseNewer(combined.get(q.symbol),q));
    return {quotes:[...combined.values()],errors:[...trades.errors,...closes.errors],requested:list};
  }
}
