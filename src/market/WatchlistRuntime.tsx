import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,useContext,useEffect,useMemo,useState,type PropsWithChildren} from 'react';
import {useMarketRuntime} from './MarketRuntime';
import {WATCHLIST_KEY,normalizeWatchlist,addWatchlistItem,type WatchlistItem} from './watchlistModel';
type Value={hydrated:boolean;items:readonly WatchlistItem[];add:(item:WatchlistItem)=>void;remove:(symbol:string)=>void;error:string|null};
const Context=createContext<Value|null>(null);
export function WatchlistRuntimeProvider({children}:PropsWithChildren){
 const market=useMarketRuntime();const [items,setItems]=useState<WatchlistItem[]>([]),[hydrated,setHydrated]=useState(false),[error,setError]=useState<string|null>(null);
 useEffect(()=>{let alive=true;
  void AsyncStorage.getItem(WATCHLIST_KEY).then(async raw=>{
   let restored:unknown=[];
   if(raw){try{restored=JSON.parse(raw);}catch{
    await AsyncStorage.setItem(WATCHLIST_KEY+'-recovery',raw);
    if(alive)setError('自選清單格式有誤，已保留副本；可重新加入標的');
   }}
   if(alive){setItems(normalizeWatchlist(restored));setHydrated(true);}
  }).catch(()=>{if(alive)setError('自選清單讀取失敗，請重新開啟 App');});
  return()=>{alive=false;};
 },[]);
 useEffect(()=>{if(hydrated)void AsyncStorage.setItem(WATCHLIST_KEY,JSON.stringify(items)).catch(()=>setError('自選清單儲存失敗'));},[hydrated,items]);
 useEffect(()=>{if(hydrated)market.setWatchlistSymbols(items.map(x=>x.symbol));},[hydrated,items,market.setWatchlistSymbols]);
 const value=useMemo<Value>(()=>({hydrated,items,error,add:item=>{if(hydrated)setItems(rows=>addWatchlistItem(rows,item));},remove:symbol=>{if(hydrated)setItems(rows=>rows.filter(x=>x.symbol!==symbol));}}),[items,hydrated,error]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWatchlist(){const value=useContext(Context);if(!value)throw Error('Watchlist provider missing');return value;}
