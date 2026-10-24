import {valuationSessionActive} from './marketCenterViews';
import type {RuntimeQuote} from '../finance/financeSeed';
import type {HoldingSnapshot} from '../domain/snapshot';
export const WATCHLIST_KEY='@tf-asset/watchlist-v1';
export type WatchlistItem=Readonly<{symbol:string;name:string}>;
export type QuoteListSource='holdings'|'watchlist'|'all';
export function normalizeWatchlist(value:unknown):WatchlistItem[]{
 if(!Array.isArray(value))return [];
 const unique=new Map<string,WatchlistItem>();
 for(const row of value){if(!row||typeof row!=='object'||typeof row.symbol!=='string')continue;const symbol=row.symbol.trim().toUpperCase();if(!/^[0-9A-Z]{4,10}$/.test(symbol)||unique.has(symbol))continue;unique.set(symbol,{symbol,name:typeof row.name==='string'&&row.name.trim()?row.name.trim().slice(0,100):symbol});}
 return [...unique.values()];
}
export function parseWatchlist(raw:string|null):WatchlistItem[]{try{return normalizeWatchlist(raw?JSON.parse(raw):[]);}catch{return [];}}
export function addWatchlistItem(rows:readonly WatchlistItem[],item:WatchlistItem){return normalizeWatchlist([...rows,item]);}
export function selectQuoteRows<T extends {symbol:string}>(holdings:readonly T[],watchlist:readonly T[],source:QuoteListSource):T[]{
 if(source==='holdings')return [...holdings];if(source==='watchlist')return [...watchlist];return [...new Map([...watchlist,...holdings].map(row=>[row.symbol,row])).values()];
}
export function watchlistSnapshot(items:readonly WatchlistItem[],quotes:readonly RuntimeQuote[],now=Date.now()):HoldingSnapshot[]{
 const bySymbol=new Map(quotes.map(q=>[q.symbol,q]));
 return items.map(item=>{
  const q=bySymbol.get(item.symbol),price=q&&Number.isFinite(q.currentPrice)&&q.currentPrice>0?q.currentPrice:null;
  const previous=q&&q.previousCloseKnown!==false&&q.previousClose>0?q.previousClose:null;
  const change=price!==null&&previous!==null?price-previous:null;
  return {id:'watch:'+item.symbol,symbol:item.symbol,name:item.name,watchOnly:true,price,previousClose:previous,previousCloseKnown:previous!==null,change,changePercent:change!==null?change/previous!*100:null,
   volume:q?.volume??null,updatedAt:typeof q?.sourceQuoteAt==='number'&&Number.isFinite(q.sourceQuoteAt)&&q.sourceQuoteAt>0?new Date(q.sourceQuoteAt).toISOString():null,
   marketStatus:change===null?'unavailable':change>0?'up':change<0?'down':'flat',quoteStatus:q?.quoteStatus??'OFFLINE',marketQuality:q?.quality??'unavailable',
   streamingHealthy:q?.streamingHealthy??false,streamingCheckedAt:q?.streamingCheckedAt??0,
   valuationStatus:price===null?'unavailable':q?.quoteStatus==='LIVE'&&valuationSessionActive(now)&&q.sourceQuoteAt&&new Date(q.sourceQuoteAt+8*3_600_000).toISOString().slice(0,10)===new Date(now+8*3_600_000).toISOString().slice(0,10)?'current_session':'reference',shares:0,avgCost:0,marketValue:0,pnl:0,roi:0,comprehensivePnl:0};
 });
}
