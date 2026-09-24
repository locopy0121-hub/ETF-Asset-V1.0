/**
 * TWSE MIS response data timestamp (Taipei exchange clock), NOT HTTP receipt time.
 * A successful HTTP poll or second passing is never evidence of a new exchange tick.
 */
export type TwseTimestampRow=Readonly<Record<string,unknown>>;
const text=(value:unknown)=>String(value??'').trim();
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
  // Optional exchange epoch milliseconds; never trust a conflicting network timestamp.
  const rawLong=String(row.tlong??'').trim();
  if(/^\d{13}$/.test(rawLong)){
    const tlong=Number(rawLong);
    if(Number.isFinite(tlong)&&Math.abs(tlong-sourceAt)<1_000)return tlong;
  }
  return sourceAt;
}
export function isNewSourceTick(sourceAt:number|null,previous:number|null|undefined){
  return sourceAt!==null&&Number.isFinite(sourceAt)&&sourceAt>0&&sourceAt>(previous??0);
}

/** Only the exchange last-trade z may advance a verified traded price; bid/ask are indicative. */
export function verifiedTwseTrade(row:TwseTimestampRow|undefined,now=Date.now()):{price:number;sourceAt:number}|null{
  if(!row)return null;
  const price=Number(String(row.z??'').trim());
  const sourceAt=parseTwseQuoteSourceAt(row,now);
  return Number.isFinite(price)&&price>0&&sourceAt!==null?{price,sourceAt}:null;
}

/** The response may contain both TWSE and TPEx channels for the same symbol. */
export function pickFreshestVerifiedTrade(current:TwseTimestampRow|undefined,next:TwseTimestampRow,now=Date.now()):TwseTimestampRow{
  if(!current)return next;
  const a=verifiedTwseTrade(current,now),b=verifiedTwseTrade(next,now);
  if(!a)return b?next:current;
  if(!b)return current;
  if(a.sourceAt!==b.sourceAt)return b.sourceAt>a.sourceAt?next:current;
  const volume=(row:TwseTimestampRow)=>Number(String(row.v??'').trim());
  const oldVolume=volume(current),newVolume=volume(next);
  return Number.isFinite(newVolume)&&Number.isFinite(oldVolume)&&newVolume>oldVolume?next:current;
}
