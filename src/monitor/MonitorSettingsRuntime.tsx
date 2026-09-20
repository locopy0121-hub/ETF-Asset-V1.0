import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_MONITOR_CONFIG, type MonitorConfig } from './monitorDomain';

const STORAGE_KEY='@tf-asset/monitor-settings';

function normalize(input:Partial<MonitorConfig>|null|undefined):MonitorConfig{
  const normal=input?.normalLayout;
  const mini=input?.miniLayout;
  const fields=Array.isArray(input?.fields)?input.fields:DEFAULT_MONITOR_CONFIG.fields;
  const miniFields=Array.isArray(input?.miniFields)?input.miniFields:DEFAULT_MONITOR_CONFIG.miniFields;
  const template=input?.template==='quotes'||input?.template==='compact'?input.template:'portfolio';
  return {
    enabled:input?.enabled??DEFAULT_MONITOR_CONFIG.enabled,
    mode:input?.mode==='mini'?'mini':'normal',
    template,
    fields:[...fields],
    miniFields:[...miniFields],
    selectedSymbols:Array.isArray(input?.selectedSymbols)?[...input.selectedSymbols]:[],
    showBreathingLight:input?.showBreathingLight??DEFAULT_MONITOR_CONFIG.showBreathingLight,
    alertChangePct:Number.isFinite(Number(input?.alertChangePct))?Number(input?.alertChangePct):null,
    normalLayout:{
      x:Number.isFinite(Number(normal?.x))?Number(normal?.x):DEFAULT_MONITOR_CONFIG.normalLayout.x,
      y:Number.isFinite(Number(normal?.y))?Number(normal?.y):DEFAULT_MONITOR_CONFIG.normalLayout.y,
      width:Number.isFinite(Number(normal?.width))?Math.max(120,Number(normal?.width)):DEFAULT_MONITOR_CONFIG.normalLayout.width,
      height:Number.isFinite(Number(normal?.height))?Math.max(56,Number(normal?.height)):DEFAULT_MONITOR_CONFIG.normalLayout.height,
    },
    miniLayout:{
      x:Number.isFinite(Number(mini?.x))?Number(mini?.x):DEFAULT_MONITOR_CONFIG.miniLayout.x,
      y:Number.isFinite(Number(mini?.y))?Number(mini?.y):DEFAULT_MONITOR_CONFIG.miniLayout.y,
      width:Number.isFinite(Number(mini?.width))?Math.max(120,Number(mini?.width)):DEFAULT_MONITOR_CONFIG.miniLayout.width,
      height:Number.isFinite(Number(mini?.height))?Math.max(56,Number(mini?.height)):DEFAULT_MONITOR_CONFIG.miniLayout.height,
    },
  };
}

type MonitorSettingsRuntimeValue=Readonly<{
  hydrated:boolean;
  config:MonitorConfig;
  setConfig:(config:MonitorConfig)=>void;
  reset:()=>void;
}>;

const Context=createContext<MonitorSettingsRuntimeValue|null>(null);

export function MonitorSettingsRuntimeProvider({children}:PropsWithChildren){
  const [config,setConfigState]=useState<MonitorConfig>(DEFAULT_MONITOR_CONFIG);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw=>{
        if(!alive||!raw)return;
        setConfigState(normalize(JSON.parse(raw) as Partial<MonitorConfig>));
      })
      .catch(()=>{})
      .finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(config)).catch(()=>{});
  },[hydrated,config]);

  const value=useMemo<MonitorSettingsRuntimeValue>(()=>({
    hydrated,
    config,
    setConfig:next=>setConfigState(normalize(next)),
    reset:()=>setConfigState(DEFAULT_MONITOR_CONFIG),
  }),[hydrated,config]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useMonitorSettingsRuntime(){
  const value=useContext(Context);
  if(!value)throw new Error('useMonitorSettingsRuntime must be used inside MonitorSettingsRuntimeProvider');
  return value;
}

export { STORAGE_KEY as MONITOR_SETTINGS_STORAGE_KEY };
