import {canPublishDailyClose,closeTimeMs,officialDay} from './clock.mjs';

export const VALID_SYMBOL=/^[0-9A-Z]{4,8}$/;
export const SOURCE_QUALITY=new Set(['trade','backup_realtime','bid_ask','previous_close','official_close']);
export const PRICE_TYPES=new Set(['REALTIME_TRADE','BACKUP_REALTIME','BID_ASK','PREV_CLOSE','OFFICIAL_CLOSE']);
export const MARKET_SOURCES=new Set(['TWSE_MIS','FUGLE','SHIOAJI','YAHOO','TWSE_DAILY','TPEX_DAILY']);
const NUMERIC=/^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/;

export function positive(value){
  const raw=String(value??'').trim().replace(/,/g,'');
  if(!NUMERIC.test(raw))return null;
  const n=Number(raw);
  return Number.isFinite(n)&&n>0?n:null;
}
export function firstBookPrice(value){
  const raw=String(value??'').trim();
  if(!raw)return null;
  for(const part of raw.split('_')){
    const price=positive(part);
    if(price!==null)return price;
  }
  return null;
}
export function validSourceAt(at,now=Date.now()){
  return Number.isSafeInteger(at)&&at>0&&at<=now+120_000&&at>=now-31*86_400_000;
}

/** Normalize seconds/milliseconds/microseconds/nanoseconds or ISO strings to epoch ms. */
export function epochLikeToMs(value,now=Date.now()){
  if(typeof value==='string'&&!/^\d+(?:\.\d+)?$/.test(value.trim())){
    const parsed=Date.parse(value);
    return validSourceAt(parsed,now)?parsed:null;
  }
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0)return null;
  let ms;
  if(n>1e17)ms=Math.floor(n/1_000_000);
  else if(n>1e14)ms=Math.floor(n/1_000);
  else if(n>1e11)ms=Math.floor(n);
  else ms=Math.floor(n*1_000);
  return validSourceAt(ms,now)?ms:null;
}
export function misSourceTime(row,now=Date.now()){
  const day=String(row?.d??''),time=String(row?.t??'');
  if(!/^\d{8}$/.test(day)||!/^\d{2}:\d{2}:\d{2}$/.test(time))return null;
  const year=Number(day.slice(0,4)),month=Number(day.slice(4,6)),date=Number(day.slice(6,8));
  const hour=Number(time.slice(0,2)),minute=Number(time.slice(3,5)),second=Number(time.slice(6,8));
  if(hour>23||minute>59||second>59)return null;
  const at=Date.UTC(year,month-1,date,hour-8,minute,second);
  const check=new Date(at+8*3_600_000);
  if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==date)return null;
  if(!validSourceAt(at,now))return null;
  const extra=String(row?.tlong??'').trim();
  const long=/^\d{13}$/.test(extra)?Number(extra):null;
  return Number.isSafeInteger(long)&&Math.abs(long-at)<1000?long:at;
}
function previousCloseTime(row,now=Date.now()){
  const day=String(row?.d??'');
  if(!/^\d{8}$/.test(day))return null;
  const y=Number(day.slice(0,4)),m=Number(day.slice(4,6)),d=Number(day.slice(6,8));
  let at=Date.UTC(y,m-1,d,5,30,0)-86_400_000; // previous day 13:30 Asia/Taipei
  for(let i=0;i<4;i++){
    const local=new Date(at+8*3_600_000);
    const dow=local.getUTCDay();
    if(dow!==0&&dow!==6)break;
    at-=86_400_000;
  }
  return validSourceAt(at,now)?at:null;
}
function marketFromMis(row){
  const ex=String(row?.ex??'').trim().toLowerCase();
  const ch=String(row?.ch??'').trim().toLowerCase();
  if(ex==='tse'||ch.startsWith('tse_'))return 'TSE';
  if(ex==='otc'||ch.startsWith('otc_'))return 'OTC';
  return 'UNKNOWN';
}
export function misTrade(row,now=Date.now()){
  const symbol=String(row?.c??'').trim().toUpperCase();
  const price=positive(row?.z),sourceQuoteAt=misSourceTime(row,now);
  if(!VALID_SYMBOL.test(symbol)||price===null||sourceQuoteAt===null)return null;
  return {
    symbol,name:String(row?.n??symbol).trim()||symbol,
    currentPrice:price,previousClose:positive(row?.y),
    officialTradePrice:price,sourceQuoteAt,quality:'trade',source:'TWSE_MIS',
    priceType:'REALTIME_TRADE',isFallback:false,market:marketFromMis(row),
    statusMessage:'TWSE MIS z 實際成交價',checkedAt:now,
    volume:positive(row?.v)??0,
  };
}
/**
 * Production A-layer normalizer. The official z field is preserved separately.
 * Effective price fallback is explicit metadata and is never relabeled as z.
 */
export function misNormalizedQuote(row,now=Date.now()){
  const symbol=String(row?.c??'').trim().toUpperCase();
  if(!VALID_SYMBOL.test(symbol))return null;
  const z=positive(row?.z),pz=positive(row?.pz),bid=firstBookPrice(row?.b),
    ask=firstBookPrice(row?.a),prev=positive(row?.y);
  const exchangeAt=misSourceTime(row,now);
  let price=null,quality=null,priceType=null,isFallback=true,sourceQuoteAt=exchangeAt,statusMessage='';
  if(z!==null&&exchangeAt!==null){
    price=z;quality='trade';priceType='REALTIME_TRADE';isFallback=false;
    statusMessage='TWSE MIS z 實際成交價';
  }else if(pz!==null&&exchangeAt!==null){
    price=pz;quality='backup_realtime';priceType='BACKUP_REALTIME';
    statusMessage='TWSE z 缺值；採用 pz 最近成交參考';
  }else if(bid!==null&&exchangeAt!==null){
    price=bid;quality='bid_ask';priceType='BID_ASK';
    statusMessage='TWSE z 缺值；採用最佳買價';
  }else if(ask!==null&&exchangeAt!==null){
    price=ask;quality='bid_ask';priceType='BID_ASK';
    statusMessage='TWSE z 缺值；採用最佳賣價';
  }else if(prev!==null){
    sourceQuoteAt=previousCloseTime(row,now);
    if(sourceQuoteAt!==null){
      price=prev;quality='previous_close';priceType='PREV_CLOSE';
      statusMessage='TWSE z／即時欄位缺值；採用昨日收盤價';
    }
  }
  if(price===null||quality===null||priceType===null||sourceQuoteAt===null)return null;
  return {
    symbol,name:String(row?.n??symbol).trim()||symbol,
    currentPrice:price,previousClose:prev,officialTradePrice:z,
    sourceQuoteAt,quality,source:'TWSE_MIS',priceType,isFallback,
    market:marketFromMis(row),statusMessage,checkedAt:now,
    volume:positive(row?.v)??0,
  };
}
export function fugleQuoteFromPayload(payload,symbolInput,now=Date.now()){
  const symbol=String(payload?.symbol??symbolInput??'').trim().toUpperCase();
  if(!VALID_SYMBOL.test(symbol))return null;
  // closePrice / lastTrade.price are actual trades. Never use lastTrial/lastPrice while isTrial.
  const price=positive(payload?.lastTrade?.price??payload?.closePrice);
  const sourceQuoteAt=epochLikeToMs(payload?.lastTrade?.time??payload?.closeTime??payload?.lastUpdated,now);
  if(price===null||sourceQuoteAt===null)return null;
  const market=String(payload?.market??payload?.exchange??'').toUpperCase();
  return {
    symbol,name:String(payload?.name??symbol).trim()||symbol,
    currentPrice:price,previousClose:positive(payload?.previousClose??payload?.referencePrice),
    officialTradePrice:null,sourceQuoteAt,quality:'trade',source:'FUGLE',
    priceType:'REALTIME_TRADE',isFallback:false,
    market:market.includes('OTC')||market.includes('TPEX')?'OTC':market.includes('TSE')||market.includes('TWSE')?'TSE':'UNKNOWN',
    statusMessage:'Fugle 盤中實際成交價',checkedAt:now,
    volume:positive(payload?.total?.tradeVolume)??0,
  };
}

export function shioajiQuoteFromPayload(payload,symbolInput,now=Date.now()){
  const row=Array.isArray(payload)?payload[0]:payload?.quote??payload;
  const symbol=String(row?.code??row?.symbol??symbolInput??'').trim().toUpperCase();
  if(!VALID_SYMBOL.test(symbol))return null;
  const price=positive(row?.close??row?.price??row?.lastPrice);
  const sourceQuoteAt=epochLikeToMs(row?.ts??row?.timestamp??row?.datetime??row?.sourceQuoteAt,now);
  if(price===null||sourceQuoteAt===null)return null;
  const exchange=String(row?.exchange??row?.market??'').toUpperCase();
  return {
    symbol,name:String(row?.name??symbol).trim()||symbol,
    currentPrice:price,previousClose:positive(row?.previousClose??row?.yesterday_price??row?.reference),
    officialTradePrice:null,sourceQuoteAt,quality:'backup_realtime',source:'SHIOAJI',
    priceType:'BACKUP_REALTIME',isFallback:true,
    market:exchange.includes('OTC')||exchange.includes('TPEX')?'OTC':exchange.includes('TSE')||exchange.includes('TWSE')?'TSE':'UNKNOWN',
    statusMessage:'永豐 Shioaji 行情備援',checkedAt:now,
    volume:positive(row?.total_volume??row?.volume)??0,
  };
}

export function yahooQuoteFromChart(payload,symbol,market,now=Date.now()){
  const result=payload?.chart?.result?.[0];
  const meta=result?.meta;
  const price=positive(meta?.regularMarketPrice);
  const seconds=Number(meta?.regularMarketTime);
  const sourceQuoteAt=Number.isSafeInteger(seconds)&&seconds>0?seconds*1000:null;
  if(!VALID_SYMBOL.test(symbol)||price===null||sourceQuoteAt===null||!validSourceAt(sourceQuoteAt,now))return null;
  return {
    symbol,name:String(meta?.shortName??meta?.longName??symbol).trim()||symbol,
    currentPrice:price,previousClose:positive(meta?.previousClose??meta?.chartPreviousClose),
    officialTradePrice:null,sourceQuoteAt,quality:'backup_realtime',source:'YAHOO',
    priceType:'BACKUP_REALTIME',isFallback:true,market,
    statusMessage:'TWSE/Fugle/Shioaji 無可用行情；採用 Yahoo Finance 備援行情',checkedAt:now,
    volume:positive(meta?.regularMarketVolume)??0,
  };
}
export function officialClose(row,source,now=Date.now()){
  if(source!=='TWSE_DAILY'&&source!=='TPEX_DAILY')return null;
  const listed=source==='TWSE_DAILY';
  const symbol=String(listed?row?.Code:row?.SecuritiesCompanyCode??'').trim().toUpperCase();
  const name=String(listed?row?.Name:row?.CompanyName??symbol).trim()||symbol;
  const price=positive(listed?row?.ClosingPrice:row?.Close);
  const day=officialDay(row?.Date);
  if(!VALID_SYMBOL.test(symbol)||price===null||!day||!canPublishDailyClose(day,now))return null;
  const sourceQuoteAt=closeTimeMs(day);
  if(!validSourceAt(sourceQuoteAt,now))return null;
  return {symbol,name,currentPrice:price,previousClose:null,officialTradePrice:null,sourceQuoteAt,
    quality:'official_close',source,priceType:'OFFICIAL_CLOSE',isFallback:true,
    market:listed?'TSE':'OTC',statusMessage:'官方日收盤備援',checkedAt:now,
    volume:positive(listed?row?.TradeVolume:row?.TradingShares)??0};
}
const QUALITY_RANK={trade:50,backup_realtime:40,bid_ask:30,official_close:20,previous_close:10};
export function chooseNewer(current,candidate){
  if(!current)return candidate;
  if(candidate.sourceQuoteAt>current.sourceQuoteAt)return candidate;
  if(candidate.sourceQuoteAt<current.sourceQuoteAt)return current;
  return (QUALITY_RANK[candidate.quality]??0)>(QUALITY_RANK[current.quality]??0)?candidate:current;
}
export function validateCandidate(q,now=Date.now()){
  return q&&VALID_SYMBOL.test(q.symbol)&&positive(q.currentPrice)!==null
    &&validSourceAt(q.sourceQuoteAt,now)&&SOURCE_QUALITY.has(q.quality)
    &&MARKET_SOURCES.has(q.source)&&PRICE_TYPES.has(q.priceType)
    &&typeof q.isFallback==='boolean'&&['TSE','OTC','UNKNOWN'].includes(q.market)
    &&typeof q.statusMessage==='string'&&typeof q.name==='string'
    &&Number.isSafeInteger(q.checkedAt)
    &&(q.officialTradePrice==null||positive(q.officialTradePrice)!==null);
}
