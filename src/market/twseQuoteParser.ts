export type TwseQuoteRow=Record<string,unknown>;

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
 * TWSE MIS may temporarily omit z (last trade) even while a live order book exists.
 * Never fall straight from z to yesterday's y: that makes the whole app look frozen.
 * Prefer a real last-trade field, then live top-of-book, and only then previous close.
 */
export function resolveTwseCurrentPrice(row:TwseQuoteRow|undefined):number{
  if(!row)return 0;
  return numeric(row.z)
    ||numeric(row.pz)
    ||firstBookPrice(row.b)
    ||firstBookPrice(row.a)
    ||numeric(row.y);
}

export function resolveTwsePreviousClose(row:TwseQuoteRow|undefined):number{
  return row?numeric(row.y):0;
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
  let score=0;
  if(numeric(row.z)>0)score+=100;
  if(numeric(row.pz)>0)score+=80;
  if(firstBookPrice(row.b)>0)score+=40;
  if(firstBookPrice(row.a)>0)score+=30;
  if(numeric(row.y)>0)score+=10;
  return score;
}
