import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {useFinance} from '../finance/FinanceRuntime';
import {recordDiagnosticEvent} from '../diagnostics/DiagnosticRuntime';
import {allCachedEtfConstituents,cachedEtfConstituents,fetchEtfConstituents,isEtfSymbol,restoreEtfConstituents,subscribeEtfConstituents,type EtfConstituentSnapshot} from './etfConstituents';
import {nextEtfConstituentCheck,shouldRefreshEtfConstituents} from './etfConstituentPolicy';

const STORAGE='@tf-asset/etf-constituents-v1';
const inFlight=new Map<string,Promise<EtfConstituentSnapshot>>();
const attempted=new Map<string,number>();
let hydration:Promise<void>|null=null;
let apiUrl='';
const hydrate=()=>hydration??(hydration=AsyncStorage.getItem(STORAGE).then(raw=>{
  if(raw){try{restoreEtfConstituents(JSON.parse(raw));}catch{}}
}).catch(()=>{}));
let storageQueue=Promise.resolve();
function persist(){
  const json=JSON.stringify(allCachedEtfConstituents());
  storageQueue=storageQueue.then(()=>AsyncStorage.setItem(STORAGE,json)).catch(()=>{});
}
export async function refreshEtfConstituentSnapshot(symbol:string,name:string,force=false){
  await hydrate();
  const cached=cachedEtfConstituents(symbol),now=Date.now();
  if(!force&&cached&&!shouldRefreshEtfConstituents(cached.fetchedAt,now))return cached;
  const existing=inFlight.get(symbol);if(existing)return existing;
  if(!force&&now-(attempted.get(symbol)??0)<5*60*1000){
    if(cached)return cached;
    throw new Error('資料來源暫時不可用，請稍後重試');
  }
  attempted.set(symbol,now);
  const request=fetchEtfConstituents(symbol,name,new AbortController().signal,apiUrl)
    .then(data=>{persist();return data;}).finally(()=>{inFlight.delete(symbol);});
  inFlight.set(symbol,request);return request;
}

/** Sync once per holding event/foreground/checkpoint; never on live quote ticks. */
export function EtfConstituentsSync(){
  const finance=useFinance();
  const settings=useSettingsRuntime();apiUrl=settings.prefs.etfHoldingsApiUrl??'';
  const descriptors=finance.holdings.filter(row=>row.shares>0&&isEtfSymbol(row.symbol)).map(row=>({symbol:row.symbol,name:row.name}));
  const key=JSON.stringify(descriptors.sort((a,b)=>a.symbol.localeCompare(b.symbol)));
  const latest=useRef(descriptors);latest.current=descriptors;
  useEffect(()=>{
    if(!finance.hydrated||!settings.hydrated)return;
    let alive=true;
    const refresh=async()=>{
      for(const row of latest.current){
        if(!alive||AppState.currentState!=='active')return;
        try{await refreshEtfConstituentSnapshot(row.symbol,row.name);}
        catch{recordDiagnosticEvent({level:'warning',code:'ETF_CONSTITUENTS',screen:'portfolio',message:row.symbol+' 成分股更新暫時失敗；保留快取'});}
      }
    };
    void refresh();return()=>{alive=false;};
  },[key,finance.hydrated,settings.hydrated,settings.prefs.etfHoldingsApiUrl]);
  useEffect(()=>{
    let alive=true;let timer:ReturnType<typeof setTimeout>|null=null;
    const refresh=async()=>{
      for(const row of latest.current){
        if(!alive||AppState.currentState!=='active')return;
        try{await refreshEtfConstituentSnapshot(row.symbol,row.name);}catch{}
      }
    };
    const schedule=()=>{
      if(timer)clearTimeout(timer);
      timer=setTimeout(()=>{if(alive){void refresh();schedule();}},nextEtfConstituentCheck(Date.now())-Date.now());
    };
    schedule();
    const listener=AppState.addEventListener('change',state=>{if(state==='active'){void refresh();schedule();}});
    const unsubscribe=subscribeEtfConstituents(persist);
    return()=>{alive=false;if(timer)clearTimeout(timer);listener.remove();unsubscribe();};
  },[]);
  return null;
}
