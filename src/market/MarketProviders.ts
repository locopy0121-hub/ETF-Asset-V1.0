import {
  MarketProviderException,
  taipeiDate,
  type MarketQuote,
  type MarketQuoteProvider,
  type MarketProviderCapability,
  type MarketSource,
} from './MarketCore';
import {
  pickBetterTwseRow,
  resolveTwseLivePrice,
  resolveTwsePreviousClose,
  resolveTwseQuoteDate,
  resolveTwseQuoteTime,
  type TwseQuoteRow,
} from './twseQuoteParser';

const CAP_POLL_BATCH:ReadonlySet<MarketProviderCapability>=new Set(['POLL','BATCH']);
const CAP_POLL:ReadonlySet<MarketProviderCapability>=new Set(['POLL']);

function positiveNumber(value:unknown):number|undefined{
  const text=String(value??'').trim().replace(/,/g,'');
  if(!text||text==='-'||text==='--')return undefined;
  const n=Number(text);return Number.isFinite(n)&&n>0?n:undefined;
}
function firstBookPrice(value:unknown):number|undefined{
  for(const part of String(value??'').split('_')){const n=positiveNumber(part);if(n)return n;}
  return undefined;
}
function retryAfterMillis(response:Response):number|null{
  const raw=response.headers.get('Retry-After');if(!raw)return null;
  const seconds=Number(raw);return Number.isFinite(seconds)&&seconds>0?seconds*1000:null;
}
function normalizedSourceTime(raw:unknown,fallback:number):number{
  const n=Number(raw);
  if(!Number.isFinite(n)||n<=0)return fallback;
  if(n>=100_000_000_000_000)return Math.floor(n/1000);
  if(n>=100_000_000_000)return Math.floor(n);
  if(n>=100_000_000)return Math.floor(n*1000);
  return fallback;
}
function twseDateTimeMillis(row:TwseQuoteRow,receivedAt:number):number{
  const tlong=normalizedSourceTime(row.tlong,0);
  if(tlong>0)return tlong;
  const d=resolveTwseQuoteDate(row),t=resolveTwseQuoteTime(row);
  if(!d||!t)return receivedAt;
  const iso=`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${t}+08:00`;
  const value=Date.parse(iso);return Number.isFinite(value)?value:receivedAt;
}

export class TwseMisQuoteProvider implements MarketQuoteProvider{
  readonly source:MarketSource='TWSE_MIS';
  readonly capabilities=CAP_POLL_BATCH;
  async fetch(symbols:ReadonlySet<string>):Promise<ReadonlyMap<string,MarketQuote>>{
    const result=new Map<string,MarketQuote>();
    const list=[...symbols].map(x=>x.trim().toUpperCase()).filter(Boolean).sort();
    for(let offset=0;offset<list.length;offset+=30){
      const chunk=list.slice(offset,offset+30);
      const channels=chunk.flatMap(symbol=>[`tse_${symbol}.tw`,`otc_${symbol}.tw`]).join('|');
      const url='https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch='+encodeURIComponent(channels)+'&json=1&delay=0&_='+Date.now();
      const response=await fetch(url,{headers:{
        Accept:'application/json,text/plain,*/*','Cache-Control':'no-cache',Pragma:'no-cache',
        Referer:'https://mis.twse.com.tw/stock/fibest.jsp',
      }});
      if(!response.ok)throw new MarketProviderException('TWSE MIS HTTP '+response.status,{
        httpStatusCode:response.status,retryAfterMillis:retryAfterMillis(response),
      });
      const payload=await response.json() as {msgArray?:TwseQuoteRow[];rtcode?:string;rtmessage?:string};
      if(payload.rtcode&&payload.rtcode!=='0000')throw new MarketProviderException('TWSE MIS '+payload.rtcode+': '+String(payload.rtmessage??'unknown error'));
      const bySymbol=new Map<string,TwseQuoteRow>();
      for(const row of Array.isArray(payload.msgArray)?payload.msgArray:[]){
        const symbol=String(row.c??'').trim().toUpperCase();if(!symbol||!chunk.includes(symbol))continue;
        bySymbol.set(symbol,pickBetterTwseRow(bySymbol.get(symbol),row));
      }
      const receivedAt=Date.now();
      for(const [symbol,row] of bySymbol){
        const resolved=resolveTwseLivePrice(row);if(!(resolved.price>0))continue;
        const sourceTime=twseDateTimeMillis(row,receivedAt);
        const previousClose=resolveTwsePreviousClose(row)||undefined;
        const bid=firstBookPrice(row.b),ask=firstBookPrice(row.a);
        result.set(symbol,{
          symbol,name:String(row.n??symbol).trim()||symbol,
          exchange:String(row.ex??'').trim()||undefined,
          market:String(row.m??'').trim()||undefined,
          price:resolved.price,previousClose,
          open:positiveNumber(row.o),high:positiveNumber(row.h),low:positiveNumber(row.l),
          volume:positiveNumber(row.v),bid,ask,
          source:'TWSE_MIS',quality:'LIVE',
          sourceTimestampEpochMillis:sourceTime,receivedAtEpochMillis:receivedAt,
          sessionDate:taipeiDate(sourceTime),fallbackLevel:1,priceKind:resolved.kind,
        });
      }
    }
    return result;
  }
}

export class YahooQuoteProvider implements MarketQuoteProvider{
  readonly source:MarketSource='YAHOO';
  readonly capabilities=CAP_POLL;
  constructor(private readonly nameResolver?:(symbol:string)=>string|undefined){}
  async fetch(symbols:ReadonlySet<string>):Promise<ReadonlyMap<string,MarketQuote>>{
    const result=new Map<string,MarketQuote>();
    for(const symbolRaw of [...symbols].sort()){
      const symbol=symbolRaw.trim().toUpperCase();if(!symbol)continue;
      const quote=await this.fetchOne(symbol);if(quote)result.set(symbol,quote);
    }
    return result;
  }
  private async fetchOne(symbol:string):Promise<MarketQuote|null>{
    for(const suffix of ['TW','TWO']){
      const ticker=`${symbol}.${suffix}`;
      let response:Response;
      try{
        response=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`,{headers:{Accept:'application/json'}});
      }catch{continue;}
      if(!response.ok){
        if(response.status===429||response.status===403)throw new MarketProviderException('Yahoo HTTP '+response.status,{
          httpStatusCode:response.status,retryAfterMillis:retryAfterMillis(response),
        });
        continue;
      }
      const payload=await response.json() as {
        chart?:{result?:Array<{meta?:Record<string,unknown>}>}
      };
      const meta=payload.chart?.result?.[0]?.meta;if(!meta)continue;
      const price=positiveNumber(meta.regularMarketPrice);if(!price)continue;
      const sourceTime=normalizedSourceTime(meta.regularMarketTime,Date.now());
      const receivedAt=Date.now();
      const previousClose=positiveNumber(meta.previousClose)??positiveNumber(meta.chartPreviousClose);
      return {
        symbol,name:this.nameResolver?.(symbol)??symbol,
        exchange:String(meta.exchangeName??meta.exchange??'').trim()||undefined,
        market:String(meta.market??'').trim()||undefined,
        price,previousClose,
        open:positiveNumber(meta.regularMarketOpen),high:positiveNumber(meta.regularMarketDayHigh),low:positiveNumber(meta.regularMarketDayLow),
        volume:positiveNumber(meta.regularMarketVolume),
        source:'YAHOO',quality:'DELAYED',
        sourceTimestampEpochMillis:sourceTime,receivedAtEpochMillis:receivedAt,
        sessionDate:taipeiDate(sourceTime),fallbackLevel:2,priceKind:'regularMarketPrice',
      };
    }
    return null;
  }
}
