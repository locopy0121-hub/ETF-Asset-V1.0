/** Optional display preferences never share the watchlist's storage/ownership. */
export const WATCHLIST_PRESENTATION_KEY='@tf-asset/watchlist-presentation-v1';
export const WATCHLIST_MODES=[{key:'list',label:'清單',icon:'☷'},{key:'compact',label:'精簡卡片',icon:'▤'},{key:'wall',label:'行情牆',icon:'▦'},{key:'chart',label:'走勢圖卡',icon:'↗'}] as const;
export type WatchlistMode=typeof WATCHLIST_MODES[number]['key'];
export type WatchlistSort='symbol'|'price'|'changePercent'|'volume';
export type WatchlistPresentation={mode:WatchlistMode;sort:WatchlistSort;direction:'asc'|'desc';useWallStyle:boolean};
export const DEFAULT_WATCHLIST_PRESENTATION:WatchlistPresentation={mode:'list',sort:'symbol',direction:'asc',useWallStyle:false};
export function readWatchlistPresentation(raw:string|null):WatchlistPresentation{
 try{const p=JSON.parse(raw??'null');if(!p||typeof p!=='object')return {...DEFAULT_WATCHLIST_PRESENTATION};
 return {mode:WATCHLIST_MODES.some(x=>x.key===p.mode)?p.mode:'list',sort:['symbol','price','changePercent','volume'].includes(p.sort)?p.sort:'symbol',direction:p.direction==='desc'?'desc':'asc',useWallStyle:p.useWallStyle===true};
 }catch{return {...DEFAULT_WATCHLIST_PRESENTATION};}
}
type SortRow={symbol:string;price:number|null;changePercent:number|null;volume?:number|null};
export function sortWatchlistRows<T extends SortRow>(rows:readonly T[],sort:WatchlistSort,direction:'asc'|'desc'):T[]{
 const sign=direction==='desc'?-1:1;
 return [...rows].sort((a,b)=>{
  if(sort==='symbol')return sign*a.symbol.localeCompare(b.symbol,'en');
  const av=a[sort],bv=b[sort],am=av==null||!Number.isFinite(av),bm=bv==null||!Number.isFinite(bv);
  if(am||bm)return am===bm?a.symbol.localeCompare(b.symbol,'en'):am?1:-1;
  return sign*(av!-bv!)||a.symbol.localeCompare(b.symbol,'en');
 });
}
type SeriesQuote={intradayDate?:string|null;intraday?:readonly {at:number;price:number}[];sparkline?:readonly number[]};
export function watchlistIntraday(quote:SeriesQuote|undefined):{at:number;price:number}[]{
 const raw=quote?.intraday??[],last=raw.filter(x=>Number.isFinite(x.at)&&x.at>0).reduce((max,x)=>Math.max(max,x.at),0);
 const date=quote?.intradayDate??(last?new Date(last+8*3600000).toISOString().slice(0,10):null),byAt=new Map<number,{at:number;price:number}>();
 for(const p of raw){if(!Number.isFinite(p.at)||!Number.isFinite(p.price)||p.at<=0||p.price<=0)continue;
 const local=new Date(p.at+8*3600000),minute=local.getUTCHours()*60+local.getUTCMinutes();
 if(local.toISOString().slice(0,10)!==date||minute<540||minute>810)continue;
 byAt.set(p.at,{at:p.at,price:p.price});}
 return [...byAt.values()].sort((a,b)=>a.at-b.at);
}

/** Serialize saves so a slow earlier write cannot overwrite a newer selection. */
export function createWatchlistPresentationWriter(write:(raw:string)=>Promise<unknown>):(raw:string)=>Promise<void>{
 let tail:Promise<void>=Promise.resolve();
 return raw=>{const next=tail.then(()=>write(raw)).then(()=>undefined);tail=next.catch(()=>{});return next;};
}
