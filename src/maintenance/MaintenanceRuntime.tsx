import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,type PropsWithChildren,useContext,useEffect,useMemo,useState} from 'react';
import type {MainPageKey} from '../domain/pageRegistry';
import {normalizeEditorConfig,type FrameEditorConfig,usePageEditor} from '../editor/pageEditor';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {instantiateComponent,normalizeInstances,type MaintenanceInstance} from './componentLibrary';

export const MAINTENANCE_STORAGE_KEY='@tf-asset/v3.0.1-frame-instances';
export type MaintenanceSession=Readonly<{
  page:MainPageKey;frameKey:string;title:string;scope:'frame'|'instance';
  instanceId?:string|undefined; focusInstanceId?:string|undefined;
  draft:FrameEditorConfig; draftInstances:readonly MaintenanceInstance[];
}>;
type MaintenanceContextValue=Readonly<{
  hydrated:boolean;enabled:boolean;session:MaintenanceSession|null;
  getInstances:(page:MainPageKey,frameKey:string)=>readonly MaintenanceInstance[];
  begin:(page:MainPageKey,frameKey:string,title:string,config:FrameEditorConfig,instanceId?:string)=>void;
  patchFrame:(patch:Partial<FrameEditorConfig>)=>void;
  patchInstance:(id:string,patch:Partial<MaintenanceInstance>)=>void;
  install:(templateId:string)=>void;
  remove:(id:string)=>void;
  cancel:()=>void;apply:()=>Promise<boolean>;
}>;
const MaintenanceContext=createContext<MaintenanceContextValue|null>(null);
const storageId=(page:MainPageKey,frameKey:string)=>page+':'+frameKey;
const normalizeSaved=(raw:unknown):Record<string,MaintenanceInstance[]>=>{
  if(!raw||typeof raw!=='object')return {};
  return Object.fromEntries(Object.entries(raw as Record<string,unknown>)
    .filter(([key])=>/^(home|ledger|portfolio|dividend|ai|settings):[a-z0-9-]+$/.test(key))
    .map(([key,val])=>[key,normalizeInstances(val)]));
};
export function MaintenanceProvider({children}:PropsWithChildren){
  const settings=useSettingsRuntime();
  const [saved,setSaved]=useState<Record<string,MaintenanceInstance[]>>({});
  const [hydrated,setHydrated]=useState(false);
  const [session,setSession]=useState<MaintenanceSession|null>(null);
  const editor=usePageEditor(session?.page??'home');

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(MAINTENANCE_STORAGE_KEY).then(raw=>{
      if(alive&&raw)setSaved(normalizeSaved(JSON.parse(raw)));
    }).catch(()=>{}).finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[]);
  useEffect(()=>{
    if(settings.prefs.engineerEnabled!==true)setSession(null);
  },[settings.prefs.engineerEnabled]);
  const enabled=settings.prefs.engineerEnabled===true;

  const value=useMemo<MaintenanceContextValue>(()=>({
    hydrated,enabled,session,
    getInstances:(page,frameKey)=>saved[storageId(page,frameKey)]??[],
    begin:(page,frameKey,title,config,instanceId)=>{
      if(!enabled||!hydrated)return;
      setSession(previous=>previous?.page===page&&previous.frameKey===frameKey?
        {...previous,scope:instanceId?'instance':'frame',instanceId,focusInstanceId:instanceId}:
        previous??{
        page,frameKey,title,scope:instanceId?'instance':'frame',...(instanceId?{instanceId}:{}),
        draft:{...config},
        draftInstances:(saved[storageId(page,frameKey)]??[]).map(item=>({...item})),
      });
    },
    patchFrame:patch=>setSession(current=>current?{...current,draft:{...current.draft,...patch}}:current),
    patchInstance:(id,patch)=>setSession(current=>current?{...current,
      draftInstances:current.draftInstances.map(item=>item.id===id?{...item,...patch}:item),
    }:current),
    install:templateId=>setSession(current=>{
      if(!current||current.scope!=='frame'||current.draftInstances.length>=30)return current;
      const id='i-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
      const instance=instantiateComponent(templateId,id);
      return {...current,draftInstances:[...current.draftInstances,instance],focusInstanceId:id};
    }),
    remove:id=>setSession(current=>current?{...current,
      draftInstances:current.draftInstances.filter(item=>item.id!==id),
      focusInstanceId:current.focusInstanceId===id?undefined:current.focusInstanceId,
    }:current),
    cancel:()=>setSession(null),
    apply:async()=>{
      if(!session)return false;
      const normalizedInstances=normalizeInstances(session.draftInstances);
      const nextSaved={...saved,[storageId(session.page,session.frameKey)]:normalizedInstances};
      try{
        // Persist new component instances before committing the existing frame editor state.
        await AsyncStorage.setItem(MAINTENANCE_STORAGE_KEY,JSON.stringify(nextSaved));
        const normalized=normalizeEditorConfig(session.page,{...editor.config,[session.frameKey]:session.draft});
        editor.replacePageConfig(normalized);
        setSaved(nextSaved);
        setSession(null);
        return true;
      }catch{return false;}
    },
  }),[hydrated,enabled,session,saved,editor.config,editor.replacePageConfig]);

  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
}
export function useMaintenance(){
  const value=useContext(MaintenanceContext);
  if(!value)throw new Error('MaintenanceProvider is required');
  return value;
}
