import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_WIDGET_CONFIG, type WidgetConfig } from './widgetDomain';

const STORAGE_KEY='@tf-asset/widget-settings';

function normalize(input:Partial<WidgetConfig>|null|undefined):WidgetConfig{
  const size=input?.size==='small'||input?.size==='large'?input.size:'medium';
  const template=input?.template==='quote-summary'||input?.template==='compact'?input.template:'asset-summary';
  return {
    enabled:input?.enabled??DEFAULT_WIDGET_CONFIG.enabled,
    size,
    template,
    fields:Array.isArray(input?.fields)?[...input.fields]:[...DEFAULT_WIDGET_CONFIG.fields],
  };
}

type WidgetSettingsRuntimeValue=Readonly<{
  hydrated:boolean;
  config:WidgetConfig;
  setConfig:(config:WidgetConfig)=>void;
  reset:()=>void;
}>;

const Context=createContext<WidgetSettingsRuntimeValue|null>(null);

export function WidgetSettingsRuntimeProvider({children}:PropsWithChildren){
  const [config,setConfigState]=useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw=>{
        if(!alive||!raw)return;
        setConfigState(normalize(JSON.parse(raw) as Partial<WidgetConfig>));
      })
      .catch(()=>{})
      .finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(config)).catch(()=>{});
  },[hydrated,config]);

  const value=useMemo<WidgetSettingsRuntimeValue>(()=>({
    hydrated,
    config,
    setConfig:next=>setConfigState(normalize(next)),
    reset:()=>setConfigState(DEFAULT_WIDGET_CONFIG),
  }),[hydrated,config]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useWidgetSettingsRuntime(){
  const value=useContext(Context);
  if(!value)throw new Error('useWidgetSettingsRuntime must be used inside WidgetSettingsRuntimeProvider');
  return value;
}

export { STORAGE_KEY as WIDGET_SETTINGS_STORAGE_KEY };
