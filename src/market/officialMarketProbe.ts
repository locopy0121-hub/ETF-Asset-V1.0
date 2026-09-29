import {parseTwseQuoteSourceAt} from './quoteFreshness';
import {pickBetterTwseRow} from './twseQuoteParser';

export type OfficialMarketProbe=Readonly<{
  symbol:string;
  name:string;
  price:number;
  source:'TWSE_MIS';
  quality:'trade';
  field:'z';
  sourceQuoteAt:number|null;
  checkedAt:number;
}>;

const positive=(value:unknown)=>{
  const text=String(value??'').trim().replace(/,/g,'');
  const number=Number(text);
  return Number.isFinite(number)&&number>0?number:0;
};

/**
 * Read-only diagnostic probe.
 * It talks directly to TWSE MIS for one selected symbol and never writes to
 * MarketRuntime, SQLite, AsyncStorage quote caches, holdings, or Ledger.
 */
export async function fetchOfficialMarketProbe(symbol:string,now=Date.now()):Promise<OfficialMarketProbe>{
  const normalized=String(symbol??'').trim().toUpperCase();
  if(!/^[0-9A-Z]{4,8}$/.test(normalized))throw new Error('無效的行情代號');

  const channels=['tse_'+normalized+'.tw','otc_'+normalized+'.tw'].join('|');
  const url='https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch='
    +encodeURIComponent(channels)+'&json=1&delay=0&_='+Date.now();
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('TWSE MIS HTTP '+response.status);

  const payload=await response.json() as {msgArray?:Array<Record<string,unknown>>};
  const rows=Array.isArray(payload.msgArray)?payload.msgArray:[];
  let selected:Record<string,unknown>|undefined;
  for(const row of rows){
    if(String(row.c??'').trim().toUpperCase()!==normalized)continue;
    // Diagnostic baseline must match the verified center contract: actual trade z only.
    if(positive(row.z)<=0)continue;
    selected=pickBetterTwseRow(selected,row);
  }
  if(!selected)throw new Error('TWSE MIS 尚無 z 實際成交價');

  const price=positive(selected.z);
  if(price<=0)throw new Error('TWSE MIS z 實際成交價無效');
  return {
    symbol:normalized,
    name:String(selected.n??normalized),
    price,
    source:'TWSE_MIS',
    quality:'trade',
    field:'z',
    sourceQuoteAt:parseTwseQuoteSourceAt(selected,now),
    checkedAt:Date.now(),
  };
}
