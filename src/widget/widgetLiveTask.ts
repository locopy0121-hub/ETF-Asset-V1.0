import {WATCHLIST_KEY,parseWatchlist,watchlistSnapshot} from '../market/watchlistModel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState,DeviceEventEmitter} from 'react-native';
import {loadUnifiedMarketData,refreshUnifiedMarketData,subscribeUnifiedMarketData,syncNativeWidget,updateNativeMarketSymbols,type UnifiedMarketSnapshot} from '../native/TfAssetNativeBridge';
import {DEFAULT_WIDGET_CONFIG,type WidgetConfig} from './widgetDomain';
import {buildBackgroundWidgetSnapshot} from './backgroundWidgetProjection';
import {marketRowsToRuntimeQuotes} from '../market/unifiedMarketAdapter';
import {omitRegressedTransportQuotes} from '../market/saiEtfSnapshotContract';
import type {RuntimeQuote} from '../finance/financeSeed';

/** Event-only canonical writer; the visible App owns writes while foreground. */
export async function widgetLiveTask(){
  const foreground=()=>AppState.currentState==='active';
  let active=true,pumping=false,pending:UnifiedMarketSnapshot|undefined;
  let quotes:RuntimeQuote[]=[];
  let symbolsKey='';
  let lastVersion=0;
  let resolveStopped:()=>void=()=>{};
  const stopped=new Promise<void>(resolve=>{resolveStopped=resolve;});
  const pump=async()=>{
    if(pumping)return;
    pumping=true;
    try{
      while(active&&pending){
        const native=pending;pending=undefined;
        if(foreground()||native.version<lastVersion)continue;
        try{
          const raw=await AsyncStorage.getItem('@tf-asset/v1.0.2-ledger');
          if(!active||foreground()||!raw)continue;
          const state=JSON.parse(raw) as unknown;
          const canonical=buildBackgroundWidgetSnapshot(state,native,quotes);
          const rawWatchlist=await AsyncStorage.getItem(WATCHLIST_KEY).catch(()=>null);
          const watchlist=parseWatchlist(rawWatchlist);
          const snapshot=canonical?{...canonical,watchlist:watchlistSnapshot(watchlist,marketRowsToRuntimeQuotes(omitRegressedTransportQuotes(native,quotes),quotes))}:null;
          if(!snapshot)continue;
          quotes=marketRowsToRuntimeQuotes(omitRegressedTransportQuotes(native,quotes),quotes);
          lastVersion=native.version;
          const symbols=[...new Set([...snapshot.holdings.filter(row=>(row.shares??0)>0).map(row=>row.symbol),...watchlist.map(row=>row.symbol)])].sort();
          const key=symbols.join('|');
          if(key!==symbolsKey){symbolsKey=key;await updateNativeMarketSymbols(symbols);}
          if(!active||foreground())continue;
          const configRaw=await AsyncStorage.getItem('@tf-asset/widget-settings');
          const config=configRaw?JSON.parse(configRaw) as WidgetConfig:DEFAULT_WIDGET_CONFIG;
          if(!active||foreground())continue;
          await syncNativeWidget(config,snapshot);
        }catch{ /* Retain last verified Widget; never write guessed finance data. */ }
      }
    }finally{pumping=false;if(active&&pending)void pump();}
  };
  const accept=(snapshot:UnifiedMarketSnapshot)=>{
    if(!active||snapshot.version<lastVersion||(pending&&snapshot.version<pending.version))return;
    pending=snapshot;void pump();
  };
  const off=subscribeUnifiedMarketData(accept);
  const stop=DeviceEventEmitter.addListener('TfAssetWidgetLiveStopped',()=>{active=false;resolveStopped();});
  const lifecycle=AppState.addEventListener('change',state=>{
    if(state!=='active')void loadUnifiedMarketData().then(accept).catch(()=>{});
  });
  try{
    try{if(!foreground()){
      const raw=await AsyncStorage.getItem('@tf-asset/v1.0.2-ledger');
      const native=await loadUnifiedMarketData();
      const snapshot=raw?buildBackgroundWidgetSnapshot(JSON.parse(raw),native):null;
      if(snapshot){
        const rawWatchlist=await AsyncStorage.getItem(WATCHLIST_KEY).catch(()=>null);
        const watchlist=parseWatchlist(rawWatchlist);
        const symbols=[...new Set([...snapshot.holdings.filter(row=>(row.shares??0)>0).map(row=>row.symbol),...watchlist.map(row=>row.symbol)])];
        await updateNativeMarketSymbols(symbols);
        accept(await refreshUnifiedMarketData(symbols));
      }
    }}catch{ /* Keep event listener alive after a transient bootstrap failure. */ }
    await stopped;
  }finally{active=false;off();stop.remove();lifecycle.remove();}
}
