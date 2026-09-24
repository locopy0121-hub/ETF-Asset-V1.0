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
  return sourceAt;
}
export function isNewSourceTick(sourceAt:number|null,previous:number|null|undefined){
  return sourceAt!==null&&Number.isFinite(sourceAt)&&sourceAt>0&&sourceAt>(previous??0);
}
