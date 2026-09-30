import type {RuntimeIntradayPoint,RuntimeQuote} from '../finance/financeSeed';
import type {UnifiedMarketIntradaySeries,UnifiedMarketRow,UnifiedMarketSnapshot} from '../native/TfAssetNativeBridge';

export type QuoteProvenance='trade'|'backup_realtime'|'bid_ask'|'previous_close'|'official_close';
const QUALITIES=new Set(['trade','backup_realtime','bid_ask','previous_close','official_close']);
const SOURCES=new Set(['TWSE_MIS','YAHOO','TWSE_DAILY','TPEX_DAILY']);
const PRICE_TYPES=new Set(['REALTIME_TRADE','BACKUP_REALTIME','BID_ASK','PREV_CLOSE','OFFICIAL_CLOSE']);
const INTRADAY_QUALITIES=new Set(['trade','backup_realtime']);
const INTRADAY_SOURCES=new Set(['TWSE_MIS','YAHOO']);

function taipeiDateMinute(at:number){
  try{
    const parts=new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hourCycle:'h23',
    }).formatToParts(new Date(at));
    const get=(type:string)=>parts.find(part=>part.type===type)?.value??'';
    return {date:`${get('year')}-${get('month')}-${get('day')}`,minute:(Number(get('hour'))||0)*60+(Number(get('minute'))||0)};
  }catch{
    const shifted=new Date(at+8*60*60*1000);
    return {date:shifted.toISOString().slice(0,10),minute:shifted.getUTCHours()*60+shifted.getUTCMinutes()};
  }
}

export function normalizeUnifiedIntradaySeries(
  value:UnifiedMarketIntradaySeries|undefined,now=Date.now(),
):{date:string;previousClose:number|null;points:RuntimeIntradayPoint[]}|null{
  if(!value||typeof value.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value.date)||!Array.isArray(value.points))return null;
  const byAt=new Map<number,RuntimeIntradayPoint>();
  for(const raw of value.points){
    if(!raw||typeof raw.at!=='number'||!Number.isFinite(raw.at)||raw.at<=0||raw.at>now+120_000||raw.at<now-10*86_400_000)continue;
    if(typeof raw.price!=='number'||!Number.isFinite(raw.price)||raw.price<=0)continue;
    if(!INTRADAY_QUALITIES.has(raw.quality)||!INTRADAY_SOURCES.has(raw.source))continue;
    const local=taipeiDateMinute(raw.at);
    if(local.date!==value.date||local.minute<540||local.minute>810)continue;
    byAt.set(raw.at,{at:raw.at,price:raw.price,quality:raw.quality,source:raw.source});
  }
  const points=[...byAt.values()].sort((a,b)=>a.at-b.at);
  const previousClose=typeof value.previousClose==='number'&&Number.isFinite(value.previousClose)&&value.previousClose>0
    ?value.previousClose:null;
  // An explicit empty series is meaningful: the Market Center has rolled to
  // a new trading day at open and is waiting for the first valid trade point.
  return {date:value.date,previousClose,points};
}

export function marketIntradaySessionDateChanged(
  previous:readonly RuntimeQuote[],next:readonly RuntimeQuote[],
){
  const prior=new Map(previous.map(row=>[row.symbol,row.intradayDate??null] as const));
  return next.some(row=>prior.has(row.symbol)
    &&prior.get(row.symbol)!==(row.intradayDate??null));
}

export function isTrustedMarketRow(value:unknown,now=Date.now()):value is UnifiedMarketRow{
  if(!value||typeof value!=='object')return false;
  const row=value as Partial<UnifiedMarketRow>;
  return typeof row.symbol==='string'&&/^[0-9A-Z]{4,8}$/.test(row.symbol)
    &&typeof row.currentPrice==='number'&&Number.isFinite(row.currentPrice)&&row.currentPrice>0
    &&typeof row.sourceQuoteAt==='number'&&Number.isFinite(row.sourceQuoteAt)
    &&row.sourceQuoteAt>0&&row.sourceQuoteAt<=now+120_000
    &&typeof row.quality==='string'&&QUALITIES.has(row.quality)
    &&typeof row.source==='string'&&SOURCES.has(row.source)
    &&typeof row.priceType==='string'&&PRICE_TYPES.has(row.priceType)
    &&typeof row.isFallback==='boolean'
    &&typeof row.market==='string'&&['TSE','OTC','UNKNOWN'].includes(row.market)
    &&typeof row.statusMessage==='string'
    &&typeof row.checkedAt==='number';
}

/** No demo seeds or Ledger prices may enter this verified normalized quote feed. */
export function marketRowsToRuntimeQuotes(
  snapshot:UnifiedMarketSnapshot,previous:readonly RuntimeQuote[]=[],now=Date.now(),
):RuntimeQuote[]{
  const rows=Array.isArray(snapshot.quotes)?snapshot.quotes:[];
  const prior=new Map(previous.map(row=>[row.symbol,row]));
  return rows.filter(row=>isTrustedMarketRow(row,now)).map(row=>{
    const old=prior.get(row.symbol);
    const prev=typeof row.previousClose==='number'&&Number.isFinite(row.previousClose)&&row.previousClose>0
      ?row.previousClose
      :old?.previousClose&&old.previousClose>0?old.previousClose:row.currentPrice;
    const unchanged=old?.sourceQuoteAt===row.sourceQuoteAt&&old.currentPrice===row.currentPrice
      &&old.priceType===row.priceType;
    const sparkline=unchanged?old.sparkline:
      [...(old?.sparkline??[]),row.currentPrice].filter(price=>price>0).slice(-30);
    const incomingIntraday=normalizeUnifiedIntradaySeries(snapshot.intraday?.[row.symbol],now);
    const intraday=incomingIntraday?.points??old?.intraday??[];
    const intradayDate=incomingIntraday?.date??old?.intradayDate??null;
    const intradayPreviousClose=incomingIntraday
      ?(incomingIntraday.previousClose??(intradayDate===old?.intradayDate?old?.intradayPreviousClose:null)??prev)
      :(old?.intradayPreviousClose??null);
    return {
      symbol:row.symbol,name:row.name||old?.name||row.symbol,
      currentPrice:row.currentPrice,previousClose:prev,
      officialTradePrice:row.officialTradePrice,
      sourceQuoteAt:row.sourceQuoteAt,
      quality:row.quality,source:row.source,priceType:row.priceType,
      isFallback:row.isFallback,market:row.market,statusMessage:row.statusMessage,
      checkedAt:row.checkedAt,
      previousCloseKnown:row.previousClose!==null||(old?.previousCloseKnown===true),
      marketDataVersion:snapshot.version,
      liquidationTradeMode:old?.liquidationTradeMode??'ROUND_LOT',
      dividendFrequency:old?.dividendFrequency??4,
      ...(old?.latestDividendPerShare==null?{}:{latestDividendPerShare:old.latestDividendPerShare}),
      ...(old?.pinned==null?{}:{pinned:old.pinned}),
      sparkline:sparkline.length?sparkline:[row.currentPrice],
      intraday,
      intradayDate,
      intradayPreviousClose,
    };
  });
}
