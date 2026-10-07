export type TwseQuoteRow=Record<string,unknown>;
export type TwsePriceKind='lastTrade'|'none';

const numeric=(value:unknown)=>{
  const text=String(value??'').trim().replace(/,/g,'');
  if(!text||text==='-'||text==='--')return 0;
  const n=Number(text);
  return Number.isFinite(n)&&n>0?n:0;
};

export type TwsePriceDecision=Readonly<{
  price:number;
  quality:'trade'|'backup_realtime'|'bid_ask'|'previous_close';
  priceType:'REALTIME_TRADE'|'BACKUP_REALTIME'|'BID_ASK'|'PREV_CLOSE';
  isFallback:boolean;
  officialTradePrice:number|null;
  statusMessage:string;
}>;

/**
 * V3.2.49 invariant retained in V4:
 * TWSE MIS currentPrice is z (actual last trade) only.
 * pz, bid, ask and previous-close remain diagnostics; Yahoo/Fugle provide fallback quotes.
 */
export function resolveTwsePriceDecision(row:TwseQuoteRow|undefined):TwsePriceDecision|null{
  if(!row)return null;
  const z=numeric(row.z);
  if(z>0)return {
    price:z,quality:'trade',priceType:'REALTIME_TRADE',isFallback:false,
    officialTradePrice:z,statusMessage:'TWSE MIS z 實際成交價',
  };
  return null;
}

export function resolveTwseLivePrice(row:TwseQuoteRow|undefined):Readonly<{price:number;kind:TwsePriceKind}>{
  const decision=resolveTwsePriceDecision(row);
  return decision?{price:decision.price,kind:'lastTrade'}:{price:0,kind:'none'};
}

export function resolveTwseCurrentPrice(row:TwseQuoteRow|undefined):number{
  return resolveTwsePriceDecision(row)?.price??0;
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
  return resolveTwsePriceDecision(row)!==null;
}

export function pickBetterTwseRow(current:TwseQuoteRow|undefined,next:TwseQuoteRow):TwseQuoteRow{
  if(!current)return next;
  const currentScore=quoteFreshnessScore(current);
  const nextScore=quoteFreshnessScore(next);
  return nextScore>=currentScore?next:current;
}

function quoteFreshnessScore(row:TwseQuoteRow):number{
  const fieldScore=numeric(row.z)>0?100:0;
  const raw=String(row.t??'');
  const m=raw.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  const seconds=m?(Number(m[1])*3600+Number(m[2])*60+Number(m[3])):0;
  return fieldScore*100000+seconds;
}
