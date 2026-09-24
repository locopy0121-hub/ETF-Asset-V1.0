import {canPublishDailyClose,closeTimeMs,officialDay} from './clock.mjs';

export const VALID_SYMBOL=/^[0-9A-Z]{4,8}$/;
export const SOURCE_QUALITY=new Set(['trade','official_close']);
const NUMERIC=/^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/;
export function positive(value){
  const raw=String(value??'').trim().replace(/,/g,'');
  if(!NUMERIC.test(raw))return null;
  const n=Number(raw);
  return Number.isFinite(n)&&n>0?n:null;
}
export function validSourceAt(at,now=Date.now()){
  return Number.isSafeInteger(at)&&at>0&&at<=now+120_000&&at>=now-31*86_400_000;
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
export function misTrade(row,now=Date.now()){
  const symbol=String(row?.c??'').trim().toUpperCase();
  const price=positive(row?.z),sourceQuoteAt=misSourceTime(row,now);
  if(!VALID_SYMBOL.test(symbol)||price===null||sourceQuoteAt===null)return null;
  return {
    symbol,name:String(row?.n??symbol).trim()||symbol,
    currentPrice:price,previousClose:positive(row?.y),
    sourceQuoteAt,quality:'trade',source:'TWSE_MIS',checkedAt:now,
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
  return {symbol,name,currentPrice:price,previousClose:null,sourceQuoteAt,
    quality:'official_close',source,checkedAt:now};
}
export function chooseNewer(current,candidate){
  if(!current)return candidate;
  if(candidate.sourceQuoteAt>current.sourceQuoteAt)return candidate;
  if(candidate.sourceQuoteAt<current.sourceQuoteAt)return current;
  if(candidate.quality==='trade'&&current.quality!=='trade')return candidate;
  return current; // No price oscillation on duplicate timestamps.
}
export function validateCandidate(q,now=Date.now()){
  return q&&VALID_SYMBOL.test(q.symbol)&&positive(q.currentPrice)!==null
    &&validSourceAt(q.sourceQuoteAt,now)&&SOURCE_QUALITY.has(q.quality)
    &&['TWSE_MIS','TWSE_DAILY','TPEX_DAILY'].includes(q.source)
    &&typeof q.name==='string'&&Number.isSafeInteger(q.checkedAt);
}
