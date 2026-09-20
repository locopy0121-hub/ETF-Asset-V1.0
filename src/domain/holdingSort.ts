import type { HoldingQuote, HoldingSortKey } from './uiModels';

const valueByKey=(row:HoldingQuote,key:HoldingSortKey):number|string=>{
  switch(key){
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
