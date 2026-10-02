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

export type TwsePriceDecision=Readonly<{
  price:number;
  quality:'trade'|'backup_realtime'|'bid_ask'|'previous_close';
  priceType:'REALTIME_TRADE'|'BACKUP_REALTIME'|'BID_ASK'|'PREV_CLOSE';
  isFallback:boolean;
  officialTradePrice:number|null;
  statusMessage:string;
}>;

/** Effective App price decision. Official z remains separately identifiable. */
export function resolveTwsePriceDecision(row:TwseQuoteRow|undefined):TwsePriceDecision|null{
  if(!row)return null;
  const z=numeric(row.z);
  if(z>0)return {price:z,quality:'trade',priceType:'REALTIME_TRADE',isFallback:false,
    officialTradePrice:z,statusMessage:'TWSE MIS z 實際成交價'};
  // pz / bid / ask / y are diagnostics only. The main currentPrice contract is last-trade semantics.
  return null;
}

export function resolveTwseCurrentPrice(row:TwseQuoteRow|undefined):number{
  return resolveTwsePriceDecision(row)?.price??0;
}

export function resolveTwsePreviousClose(row:TwseQuoteRow|undefined):number{
  return row?numeric(row.y):0;
}

export function hasUsableTwseQuote(row:TwseQuoteRow|undefined):boolean{
  return resolveTwsePriceDecision(row)!==null;
}

export function pickBetterTwseRow(current:TwseQuoteRow|undefined,next:TwseQuoteRow):TwseQuoteRow{
  if(!current)return next;
  const currentScore=quoteFreshnessScore(current);
  const nextScore=quoteFreshnessScore(next);
  return nextScore>=currentScore?next:current;
}

function quoteFreshnessScore(row:TwseQuoteRow):number{
  if(numeric(row.z)>0)return 100;
  return 0;
}
