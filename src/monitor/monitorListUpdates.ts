import type {MonitorConfig} from './monitorDomain';

/** List membership changes reuse the current presentation, including manual field edits. */
export function appendMonitorWatchlist(config:MonitorConfig,symbols:readonly string[]):MonitorConfig{
 if(config.quoteListSource==='holdings'||!config.quoteListSource||!config.selectedSymbols.length||!symbols.length)return config;
 const selectedSymbols=[...new Set([...config.selectedSymbols,...symbols])];
 if(selectedSymbols.length===config.selectedSymbols.length)return config;
 return {...config,selectedSymbols,sort:{...config.sort,manualSymbols:[...new Set([...config.sort.manualSymbols,...symbols])]}};
}

export function changeMonitorQuoteSource(config:MonitorConfig,quoteListSource:NonNullable<MonitorConfig['quoteListSource']>,available:readonly string[]):MonitorConfig{
 const allowed=new Set(available);
 const selectedSymbols=config.selectedSymbols.length?[...new Set([...config.selectedSymbols.filter(symbol=>allowed.has(symbol)),...available])]:[];
 return {...config,quoteListSource,selectedSymbols,sort:{...config.sort,manualSymbols:[...new Set([...config.sort.manualSymbols.filter(symbol=>allowed.has(symbol)),...available])]}};
}
