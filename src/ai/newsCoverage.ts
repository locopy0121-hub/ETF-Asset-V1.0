/** Fair, stable full-article enrichment budget: one recent story per holding per round. */
export function selectNewsForEnrichment<T extends {symbol:string}>(items:readonly T[],limit=8):T[]{
  const bySymbol=new Map<string,T[]>();
  for(const item of items){const group=bySymbol.get(item.symbol)??[];group.push(item);bySymbol.set(item.symbol,group);}
  const selected:T[]=[];
  while(selected.length<limit){
    let added=false;
    for(const group of bySymbol.values()){
      const item=group.shift();
      if(item){selected.push(item);added=true;}
      if(selected.length>=limit)break;
    }
    if(!added)break;
  }
  return selected;
}
