import type {ComponentProps} from 'react';
import {MonitorControlPanel} from './MonitorControlPanel';
import {useWatchlist} from '../../market/WatchlistRuntime';
import {useMarketRuntime} from '../../market/MarketRuntime';
import {watchlistSnapshot,selectQuoteRows} from '../../market/watchlistModel';
import {changeMonitorQuoteSource} from '../../monitor/monitorListUpdates';
export function ConnectedMonitorControlPanel(props:ComponentProps<typeof MonitorControlPanel>){
 const list=useWatchlist(),market=useMarketRuntime();
 const snapshot=props.previewSnapshot?{...props.previewSnapshot,watchlist:watchlistSnapshot(list.items,market.quotes)}:null;
 const available=snapshot?selectQuoteRows(snapshot.holdings,snapshot.watchlist,props.value.quoteListSource??'holdings'):[];
 return <MonitorControlPanel {...props} previewSnapshot={snapshot} availableSymbols={available} onChange={next=>{
  if(snapshot&&next.quoteListSource!==props.value.quoteListSource){
   const source=next.quoteListSource??'holdings';
   props.onChange(changeMonitorQuoteSource(props.value,source,selectQuoteRows(snapshot.holdings,snapshot.watchlist,source).map(row=>row.symbol)));
  }else props.onChange(next);
 }}/>;
}
