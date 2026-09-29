import {parseTwseQuoteSourceAt} from './quoteFreshness';
import {pickBetterTwseRow} from './twseQuoteParser';

export type OfficialMarketRawFields=Readonly<{
  z:string|null;
  pz:string|null;
  y:string|null;
  o:string|null;
  h:string|null;
  l:string|null;
  v:string|null;
  b:string|null;
  a:string|null;
  d:string|null;
  t:string|null;
  ex:string|null;
  ch:string|null;
}>;

export type OfficialMarketProbe=Readonly<{
  symbol:string;
  name:string;
  price:number|null;
  source:'TWSE_MIS';
  quality:'trade'|'diagnostic';
  field:'z';
  availability:'trade'|'z_missing';
  raw:OfficialMarketRawFields;
  sourceQuoteAt:number|null;
  checkedAt:number;
}>;

const positive=(value:unknown)=>{
  const text=String(value??'').trim().replace(/,/g,'');
  const number=Number(text);
  return Number.isFinite(number)&&number>0?number:0;
};

const rawText=(value:unknown)=>{
  const text=String(value??'').trim();
  return text&&text!=='-'&&text!=='--'?text:null;
};

const rawFields=(row:Record<string,unknown>):OfficialMarketRawFields=>({
  z:rawText(row.z),
  pz:rawText(row.pz),
  y:rawText(row.y),
  o:rawText(row.o),
  h:rawText(row.h),
  l:rawText(row.l),
  v:rawText(row.v),
  b:rawText(row.b),
  a:rawText(row.a),
  d:rawText(row.d),
  t:rawText(row.t),
  ex:rawText(row.ex),
  ch:rawText(row.ch),
});

/**
 * Read-only diagnostic probe.
 * It talks directly to TWSE MIS for one selected symbol and never writes to
 * MarketRuntime, SQLite, persistent quote caches, holdings, or Ledger.
 *
 * Important: z is the only official comparison price. When z is absent we
 * still return the matching raw TWSE row for diagnosis, but y/o/h/l/v/pz/b/a
 * are never promoted to the official comparison baseline.
 */
export async function fetchOfficialMarketProbe(symbol:string,now=Date.now()):Promise<OfficialMarketProbe>{
  const normalized=String(symbol??'').trim().toUpperCase();
  if(!/^[0-9A-Z]{4,8}$/.test(normalized))throw new Error('無效的行情代號');

  const channels=['tse_'+normalized+'.tw','otc_'+normalized+'.tw'].join('|');
  const url='https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch='
    +encodeURIComponent(channels)+'&json=1&delay=0&_='+Date.now();

  let response:Response;
  try{
    response=await fetch(url,{headers:{Accept:'application/json'}});
  }catch{
    throw new Error('TWSE MIS 請求失敗（網路／TLS／端點）');
  }
  if(!response.ok)throw new Error('TWSE MIS HTTP '+response.status);

  let payload:{msgArray?:Array<Record<string,unknown>>};
  try{
    payload=await response.json() as {msgArray?:Array<Record<string,unknown>>};
  }catch{
    throw new Error('TWSE MIS 回應解析失敗');
  }

  const rows=Array.isArray(payload.msgArray)?payload.msgArray:[];
  if(rows.length===0)throw new Error('TWSE MIS 回應無行情列');

  let selected:Record<string,unknown>|undefined;
  for(const row of rows){
    if(String(row.c??'').trim().toUpperCase()!==normalized)continue;
    selected=pickBetterTwseRow(selected,row);
  }
  if(!selected)throw new Error('TWSE MIS 未回傳此代號資料（tse/otc mapping 無匹配）');

  const price=positive(selected.z)||null;
  return {
    symbol:normalized,
    name:String(selected.n??normalized),
    price,
    source:'TWSE_MIS',
    quality:price===null?'diagnostic':'trade',
    field:'z',
    availability:price===null?'z_missing':'trade',
    raw:rawFields(selected),
    sourceQuoteAt:parseTwseQuoteSourceAt(selected,now),
    checkedAt:Date.now(),
  };
}
