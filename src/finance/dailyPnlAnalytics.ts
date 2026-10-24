import type {DailyPnlRecord} from './dailyPnlHistory';
import {summarizeDailyPnl} from './dailyPnlHistory';

/**
 * Read-only time series for daily / monthly / yearly P&L.
 * No totals are recalculated from market-value differences: daily P&L remains
 * the Finance Core derived market result with trade principal excluded.
 */
export type PnlPeriod='day'|'month'|'year';
export type PnlMetric='dailyPnl'|'totalPnl'|'marketValue';
export type PnlSort='date'|'dailyPnl'|'totalPnl'|'marketValue';
export type PnlFilter='all'|'gain'|'loss'|'flat'|'official';
export type PnlPageSize=10|20|50;
export type PnlBucket=Readonly<{
  key:string;
  label:string;
  startDate:string;
  endDate:string;
  days:number;
  officialDays:number;
  estimatedDays:number;
  periodPnl:number;
  averageDailyPnl:number;
  lastTotalPnl:number;
  lastMarketValue:number;
  gainDays:number;
  lossDays:number;
  flatDays:number;
  best:DailyPnlRecord|null;
  worst:DailyPnlRecord|null;
  last:DailyPnlRecord;
}>;

export function periodKey(date:string,period:PnlPeriod){
  return period==='day'?date:period==='month'?date.slice(0,7):date.slice(0,4);
}
export function summarizePeriods(rows:readonly DailyPnlRecord[],period:PnlPeriod):PnlBucket[]{
  const chronological=[...rows].sort((a,b)=>a.date.localeCompare(b.date));
  const buckets=new Map<string,DailyPnlRecord[]>();
  for(const row of chronological){
    const key=periodKey(row.date,period);
    const entries=buckets.get(key)??[];
    entries.push(row);
    buckets.set(key,entries);
  }
  return [...buckets.entries()].map(([key,entries])=>{
    const first=entries[0]!,last=entries[entries.length-1]!;
    const stats=summarizeDailyPnl(entries);
    const officialDays=entries.filter(row=>row.basis==='official-history').length;
    const estimatedDays=entries.length-officialDays;
    return {
      key,label:key,startDate:first.date,endDate:last.date,days:entries.length,
      officialDays,estimatedDays,periodPnl:stats.periodPnl,
      averageDailyPnl:stats.averageDailyPnl,lastTotalPnl:last.totalPnl,
      lastMarketValue:last.totalMarketValue,gainDays:stats.gainDays,
      lossDays:stats.lossDays,flatDays:stats.flatDays,
      best:stats.best,worst:stats.worst,last,
    };
  });
}
export function bucketValue(bucket:PnlBucket,metric:PnlMetric){
  return metric==='marketValue'?bucket.lastMarketValue:
    metric==='totalPnl'?bucket.lastTotalPnl:bucket.periodPnl;
}
export function winRate(gainDays:number,lossDays:number):number|null{
  const resolved=gainDays+lossDays;
  return resolved>0?gainDays/resolved*100:null;
}
export function filterPnlRows(rows:readonly DailyPnlRecord[],filter:PnlFilter):DailyPnlRecord[]{
  return rows.filter(row=>filter==='all'?true:
    filter==='gain'?row.todayPnl>0:
    filter==='loss'?row.todayPnl<0:
    filter==='flat'?row.todayPnl===0:
    row.basis==='official-history');
}
export function sortPnlRows(rows:readonly DailyPnlRecord[],key:PnlSort,ascending:boolean):DailyPnlRecord[]{
  const value=(row:DailyPnlRecord)=>key==='date'?0:
    key==='dailyPnl'?row.todayPnl:key==='totalPnl'?row.totalPnl:row.totalMarketValue;
  const multiplier=ascending?1:-1;
  return [...rows].sort((a,b)=>{
    const delta=key==='date'?a.date.localeCompare(b.date):value(a)-value(b);
    return (delta||a.date.localeCompare(b.date))*multiplier;
  });
}
export function pagePnlRows(rows:readonly DailyPnlRecord[],page:number,pageSize:PnlPageSize){
  const pageCount=Math.max(1,Math.ceil(rows.length/pageSize));
  const safePage=Math.max(0,Math.min(pageCount-1,Math.floor(Number.isFinite(page)?page:0)));
  return {page:safePage,pageCount,rows:rows.slice(safePage*pageSize,(safePage+1)*pageSize)};
}
/** Select complete periods, not arbitrary slices of trading days. */
export function recentPnlPeriods(buckets:readonly PnlBucket[],count:number|'all'):PnlBucket[]{
  return count==='all'?[...buckets]:buckets.slice(-Math.max(1,count));
}
/** Keep chart responsive while retaining first/last and extrema. */
export function samplePnlBuckets(buckets:readonly PnlBucket[],metric:PnlMetric,maxPoints=120):PnlBucket[]{
  if(buckets.length<=maxPoints)return [...buckets];
  const windows=Math.max(1,Math.floor(maxPoints/4));
  const width=Math.ceil(buckets.length/windows);
  const result:PnlBucket[]=[];
  for(let first=0;first<buckets.length;first+=width){
    const chunk=buckets.slice(first,first+width);
    const lowest=chunk.reduce((a,b)=>bucketValue(a,metric)<=bucketValue(b,metric)?a:b);
    const highest=chunk.reduce((a,b)=>bucketValue(a,metric)>=bucketValue(b,metric)?a:b);
    const byKey=new Map([chunk[0]!,lowest,highest,chunk[chunk.length-1]!].map(p=>[p.key,p]));
    result.push(...[...byKey.values()].sort((a,b)=>a.key.localeCompare(b.key)));
  }
  return result;
}
