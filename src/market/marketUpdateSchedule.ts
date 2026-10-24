export type MarketUpdateSchedule=Readonly<{enabled:boolean;start:string;end:string;weekdays:readonly number[]}>;
export const DEFAULT_MARKET_SCHEDULE:MarketUpdateSchedule={enabled:true,start:'09:00',end:'13:30',weekdays:[1,2,3,4,5]};
export function validateMarketSchedule(raw:unknown):MarketUpdateSchedule|null{
  if(!raw||typeof raw!=='object')return null;
  const v=raw as Partial<MarketUpdateSchedule>;
  const minutes=(s:unknown)=>typeof s==='string'&&/^\d{2}:\d{2}$/.test(s)&&Number(s.slice(3))<60?Number(s.slice(0,2))*60+Number(s.slice(3)):-1;
  const start=minutes(v.start),end=minutes(v.end);
  if(typeof v.enabled!=='boolean'||start<540||end>810||start>=end||!Array.isArray(v.weekdays)||!v.weekdays.length||v.weekdays.some(d=>!Number.isInteger(d)||d<1||d>5))return null;
  return {enabled:v.enabled,start:v.start!,end:v.end!,weekdays:[...new Set(v.weekdays)].sort()};
}
