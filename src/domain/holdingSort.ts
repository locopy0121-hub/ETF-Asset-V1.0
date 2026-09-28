import type { HoldingQuote, HoldingSortKey } from './uiModels';

/** A single press applies the next preset immediately; symbol/name ascend. */
export const HOLDING_SORT_PRESETS=[
  {key:'manual',label:'手動',descending:true},
  {key:'changePct',label:'漲跌幅↓',descending:true},
  {key:'change',label:'漲跌額↓',descending:true},
  {key:'pnl',label:'持股損益↓',descending:true},
  {key:'roi',label:'報酬率↓',descending:true},
  {key:'marketValue',label:'市值↓',descending:true},
  {key:'weight',label:'占比↓',descending:true},
  {key:'symbol',label:'代號↑',descending:false},
  {key:'name',label:'名稱↑',descending:false},
  {key:'price',label:'即時行情↓',descending:true},
  {key:'dividend',label:'股息↓',descending:true},
] as const satisfies readonly {key:HoldingSortKey;label:string;descending:boolean}[];
export function sortPreset(key:unknown){
  return HOLDING_SORT_PRESETS.find(item=>item.key===key)??HOLDING_SORT_PRESETS[0]!;
}
export function nextSortPreset(key:unknown){
  const index=HOLDING_SORT_PRESETS.findIndex(item=>item.key===key);
  return HOLDING_SORT_PRESETS[(index+1)%HOLDING_SORT_PRESETS.length]!;
}

const valueByKey=(row:HoldingQuote,key:HoldingSortKey):number|string=>{
  switch(key){
    case 'symbol': return row.symbol;
    case 'name': return row.name;
    case 'change': return row.price-row.previousClose;
    case 'changePct': return row.previousClose>0?(row.price-row.previousClose)/row.previousClose:0;
    case 'pnl': return row.pnl;
    case 'roi': return row.roi;
    case 'marketValue': return row.marketValue;
    case 'weight': return row.weight;
    case 'price': return row.price;
    case 'dividend': return row.cumulativeDividend;
    case 'manual':
    default: return 0;
  }
};

export function sortHoldingQuotes(rows:readonly HoldingQuote[],key:HoldingSortKey='manual',descending=true){
  const indexed=rows.map((row,index)=>({row,index}));
  return indexed.sort((a,b)=>{
    if(Boolean(a.row.pinned)!==Boolean(b.row.pinned)) return a.row.pinned?-1:1;
    if(key==='manual') return a.index-b.index;
    const av=valueByKey(a.row,key),bv=valueByKey(b.row,key);
    const diff=typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv));
    return descending?-diff:diff;
  }).map(x=>x.row);
}
