import type {ComponentProps} from 'react';
import {MonitorControlPanel} from './MonitorControlPanel';
import {useWatchlist} from '../../market/WatchlistRuntime';
import {useMarketRuntime} from '../../market/MarketRuntime';
import {watchlistSnapshot,selectQuoteRows} from '../../market/watchlistModel';
export function ConnectedMonitorControlPanel(props:ComponentProps<typeof MonitorControlPanel>){
 const list=useWatchlist(),market=useMarketRuntime();
 const snapshot=props.previewSnapshot?{...props.previewSnapshot,watchlist:watchlistSnapshot(list.items,market.quotes)}:null;
 const available=snapshot?selectQuoteRows(snapshot.holdings,snapshot.watchlist,props.value.quoteListSource??'holdings'):[];
 return <MonitorControlPanel {...props} previewSnapshot={snapshot} availableSymbols={available}/>;
}
