/**
 * TWSE MIS response data timestamp (Taipei exchange clock), NOT HTTP receipt time.
 * A successful HTTP poll or second passing is never evidence of a new exchange tick.
 */
export type TwseTimestampRow=Readonly<Record<string,unknown>>;
export const REALTIME_QUOTE_FRESHNESS_MS=2*60*1000;
export type RealtimeQuoteFreshness='FRESH'|'STALE'|'UNKNOWN';

const text=(value:unknown)=>String(value??'').trim();

export function quoteSourceLagMs(
  sourceQuoteAt:number|null|undefined,
  checkedAt:number|null|undefined=Date.now(),
):number|null{
  const source=Number(sourceQuoteAt);
  const checked=Number(checkedAt);
  if(!Number.isFinite(source)||source<=0||!Number.isFinite(checked)||checked<=0)return null;
  // A tiny future skew can happen between source/server clocks. Treat it as zero lag,
  // but reject implausible future timestamps instead of calling them fresh.
  const lag=checked-source;
  if(lag< -120_000)return null;
  return Math.max(0,lag);
}

export function realtimeQuoteFreshness(
  sourceQuoteAt:number|null|undefined,
  checkedAt:number|null|undefined=Date.now(),
  maxAgeMs=REALTIME_QUOTE_FRESHNESS_MS,
):RealtimeQuoteFreshness{
  const lag=quoteSourceLagMs(sourceQuoteAt,checkedAt);
  if(lag===null)return 'UNKNOWN';
  const limit=Number.isFinite(maxAgeMs)&&maxAgeMs>=0?maxAgeMs:REALTIME_QUOTE_FRESHNESS_MS;
  return lag<=limit?'FRESH':'STALE';
}

export function parseTwseQuoteSourceAt(row:TwseTimestampRow|undefined,now=Date.now()):number|null{
  if(!row)return null;
  const date=text(row.d),time=text(row.t);
  if(!/^\d{8}$/.test(date)||!/^\d{2}:\d{2}:\d{2}$/.test(time))return null;
  const y=Number(date.slice(0,4)),m=Number(date.slice(4,6)),d=Number(date.slice(6,8));
  const hh=Number(time.slice(0,2)),mm=Number(time.slice(3,5)),ss=Number(time.slice(6,8));
  if(y<2000||m<1||m>12||d<1||d>31||hh>23||mm>59||ss>59)return null;
  // Exchange source clock is Asia/Taipei (UTC+08:00 year-round).
  const sourceAt=Date.UTC(y,m-1,d,hh-8,mm,ss);
  const check=new Date(sourceAt+8*3_600_000);
  if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d)return null;
  if(!Number.isFinite(now)||sourceAt>now+120_000||sourceAt<now-31*86_400_000)return null;
  return sourceAt;
}
export function isNewSourceTick(sourceAt:number|null,previous:number|null|undefined){
  return sourceAt!==null&&Number.isFinite(sourceAt)&&sourceAt>0&&sourceAt>(previous??0);
}
