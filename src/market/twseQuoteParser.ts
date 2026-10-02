export type TwseQuoteRow=Record<string,unknown>;
export type TwsePriceKind='lastTrade'|'bid'|'ask'|'none';

const numeric=(value:unknown)=>{
  const text=String(value??'').trim().replace(/,/g,'');
  if(!text||text==='-'||text==='--')return 0;
  const n=Number(text);
  return Number.isFinite(n)&&n>0?n:0;
};

const firstBookPrice=(value:unknown)=>{
  const raw=String(value??'').trim();
  if(!raw)return 0;
  for(const part of raw.split('_')){
    const price=numeric(part);
    if(price>0)return price;
  }
  return 0;
};

/**
 * MIS z is the documented last-trade field. Some ETFs can expose z="-" while
 * the live order book is already populated. In that case use the best bid,
 * then best ask as a clearly tagged live proxy.
 *
 * Never use pz (undocumented) or y (previous close) as currentPrice.
 */
export function resolveTwseLivePrice(row:TwseQuoteRow|undefined):Readonly<{price:number;kind:TwsePriceKind}>{
  if(!row)return {price:0,kind:'none'};
  const lastTrade=numeric(row.z);
  if(lastTrade>0)return {price:lastTrade,kind:'lastTrade'};
  const bid=firstBookPrice(row.b);
  if(bid>0)return {price:bid,kind:'bid'};
  const ask=firstBookPrice(row.a);
  if(ask>0)return {price:ask,kind:'ask'};
  return {price:0,kind:'none'};
}

export function resolveTwseCurrentPrice(row:TwseQuoteRow|undefined):number{
  return resolveTwseLivePrice(row).price;
}

export function resolveTwsePreviousClose(row:TwseQuoteRow|undefined):number{
  return row?numeric(row.y):0;
}

export function resolveTwseQuoteDate(row:TwseQuoteRow|undefined):string|null{
  const raw=String(row?.d??'').trim();
  return /^\d{8}$/.test(raw)?raw:null;
}

export function resolveTwseQuoteTime(row:TwseQuoteRow|undefined):string|null{
  const raw=String(row?.t??'').trim();
  return /^\d{2}:\d{2}:\d{2}$/.test(raw)?raw:null;
}

export function hasUsableTwseQuote(row:TwseQuoteRow|undefined):boolean{
  return resolveTwseCurrentPrice(row)>0;
}

export function pickBetterTwseRow(current:TwseQuoteRow|undefined,next:TwseQuoteRow):TwseQuoteRow{
  if(!current)return next;
  const currentScore=quoteFreshnessScore(current);
  const nextScore=quoteFreshnessScore(next);
  return nextScore>=currentScore?next:current;
}

function quoteFreshnessScore(row:TwseQuoteRow):number{
  const resolved=resolveTwseLivePrice(row);
  const fieldScore=resolved.kind==='lastTrade'?400:resolved.kind==='bid'?300:resolved.kind==='ask'?200:0;
  const raw=String(row.t??'');
  const m=raw.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  const seconds=m?(Number(m[1])*3600+Number(m[2])*60+Number(m[3])):0;
  return fieldScore*100000+seconds;
}
