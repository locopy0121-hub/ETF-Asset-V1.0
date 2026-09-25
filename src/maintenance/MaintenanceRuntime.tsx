import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,type PropsWithChildren,useContext,useEffect,useMemo,useState} from 'react';
import type {MainPageKey} from '../domain/pageRegistry';
import {normalizeEditorConfig,type FrameEditorConfig,type PageDisplayConfig,usePageEditor} from '../editor/pageEditor';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {instantiateComponent,normalizeInstances,type MaintenanceInstance} from './componentLibrary';
import {normalizeTargetMap,normalizeTargetOverride,type InspectedTarget,type TargetOverride} from './inspectionModel';
import {DEFAULT_WORKSPACE,normalizeWorkspace,type WorkspaceConfig} from './workspaceModel';

export const MAINTENANCE_STORAGE_KEY='@tf-asset/v3.0.1-frame-instances';
const scopeId=(page:MainPageKey,frameKey:string)=>page+':'+frameKey;

export type MaintenanceSession=Readonly<{
  page:MainPageKey;frameKey:string;title:string;scope:'frame'|'instance'|'target';
  instanceId?:string|undefined;focusInstanceId?:string|undefined;target?:InspectedTarget|undefined;
  draft:FrameEditorConfig;draftInstances:readonly MaintenanceInstance[];
  draftTargets:Readonly<Record<string,TargetOverride>>;
  draftWorkspace:WorkspaceConfig;
  draftDisplay:PageDisplayConfig;displayTouched:readonly (keyof PageDisplayConfig)[];
}>;
type MaintenanceContextValue=Readonly<{
  hydrated:boolean;enabled:boolean;session:MaintenanceSession|null;selection:InspectedTarget|null;
  getInstances:(page:MainPageKey,frameKey:string)=>readonly MaintenanceInstance[];
  getTargetOverride:(page:MainPageKey,frameKey:string,id:string)=>TargetOverride;
  getWorkspace:(page:MainPageKey,frameKey:string)=>WorkspaceConfig;
  begin:(page:MainPageKey,frameKey:string,title:string,config:FrameEditorConfig,instanceId?:string,displayConfig?:PageDisplayConfig)=>void;
  selectTarget:(target:InspectedTarget)=>void;syncTarget:(target:InspectedTarget)=>void;
  enterTarget:(target:InspectedTarget,frameConfig:FrameEditorConfig,displayConfig:PageDisplayConfig)=>void;
  patchFrame:(patch:Partial<FrameEditorConfig>)=>void;
  patchInstance:(id:string,patch:Partial<MaintenanceInstance>)=>void;
  patchTarget:(id:string,patch:TargetOverride)=>void;
  patchWorkspace:(patch:Partial<WorkspaceConfig>)=>void;
  patchDisplay:(patch:Partial<PageDisplayConfig>)=>void;
  install:(templateId:string)=>void;remove:(id:string)=>void;
  cancel:()=>void;apply:()=>Promise<boolean>;
}>;
const MaintenanceContext=createContext<MaintenanceContextValue|null>(null);
const normalizeSaved=(raw:unknown):Record<string,MaintenanceInstance[]>=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  return Object.fromEntries(Object.entries(raw as Record<string,unknown>)
    .filter(([key])=>/^(home|ledger|portfolio|dividend|ai|settings):[a-z0-9-]+$/.test(key))
    .map(([key,val])=>[key,normalizeInstances(val)]));
};
const sameTarget=(a:InspectedTarget|null|undefined,b:InspectedTarget)=>
  a?.page===b.page&&a.frameKey===b.frameKey&&a.id===b.id;
const sameInspector=(a:InspectedTarget|null|undefined,b:InspectedTarget)=>
  sameTarget(a,b)&&JSON.stringify(a)===JSON.stringify(b);
export function MaintenanceProvider({children}:PropsWithChildren){
  const settings=useSettingsRuntime();
  const [saved,setSaved]=useState<Record<string,MaintenanceInstance[]>>({});
  const [targetStyles,setTargetStyles]=useState<Record<string,Record<string,TargetOverride>>>({});
  const [workspaces,setWorkspaces]=useState<Record<string,WorkspaceConfig>>({});
  const [hydrated,setHydrated]=useState(false);
  const [selection,setSelection]=useState<InspectedTarget|null>(null);
  const [session,setSession]=useState<MaintenanceSession|null>(null);
  const editor=usePageEditor(session?.page??'home');

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(MAINTENANCE_STORAGE_KEY).then(raw=>{
      if(!alive||!raw)return;
      const parsed=JSON.parse(raw) as Record<string,unknown>;
      if(parsed.schema===2||parsed.schema===3){
        setSaved(normalizeSaved(parsed.instances));
        setTargetStyles(normalizeTargetMap(parsed.targets));
        if(parsed.schema===3&&parsed.workspaces&&typeof parsed.workspaces==='object'&&!Array.isArray(parsed.workspaces)){
          setWorkspaces(Object.fromEntries(Object.entries(parsed.workspaces as Record<string,unknown>)
            .filter(([key])=>/^(home|ledger|portfolio|dividend|ai|settings):[a-z0-9-]+$/.test(key))
            .map(([key,value])=>[key,normalizeWorkspace(value)])));
        }
      }else setSaved(normalizeSaved(parsed)); // migrate existing V3.0.1 instances
    }).catch(()=>{}).finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[]);
  useEffect(()=>{
    if(settings.prefs.engineerEnabled!==true){setSession(null);setSelection(null);}
  },[settings.prefs.engineerEnabled]);
  const enabled=settings.prefs.engineerEnabled===true;
  const value=useMemo<MaintenanceContextValue>(()=>({
    hydrated,enabled,session,selection,
    getInstances:(page,frameKey)=>saved[scopeId(page,frameKey)]??[],
    getWorkspace:(page,frameKey)=>session?.page===page&&session.frameKey===frameKey?
      session.draftWorkspace:workspaces[scopeId(page,frameKey)]??DEFAULT_WORKSPACE,
    getTargetOverride:(page,frameKey,id)=>{
      const key=scopeId(page,frameKey);
      return (session?.page===page&&session.frameKey===frameKey?
        session.draftTargets[id]:targetStyles[key]?.[id])??{};
    },
    begin:(page,frameKey,title,config,instanceId,displayConfig)=>{
      if(!enabled||!hydrated)return;
      setSelection(null);
      setSession(previous=>previous?.page===page&&previous.frameKey===frameKey?
        {...previous,scope:instanceId?'instance':'frame',instanceId,focusInstanceId:instanceId,target:undefined}:
        previous??{
          page,frameKey,title,scope:instanceId?'instance':'frame',...(instanceId?{instanceId}:{}),
          draft:{...config},
          draftInstances:(saved[scopeId(page,frameKey)]??[]).map(item=>({...item})),
          draftTargets:{...(targetStyles[scopeId(page,frameKey)]??{})},
          draftWorkspace:workspaces[scopeId(page,frameKey)]??DEFAULT_WORKSPACE,
          draftDisplay:{...(displayConfig??editor.displayConfig)},displayTouched:[],
        });
    },
    selectTarget:target=>{
      if(!enabled||!hydrated)return;
      if(session&&(session.page!==target.page||session.frameKey!==target.frameKey))return;
      setSelection(current=>sameInspector(current,target)?current:target);
    },
    syncTarget:target=>{
      setSelection(current=>sameTarget(current,target)?
        (sameInspector(current,target)?current:target):current);
      setSession(current=>current&&sameTarget(current.target,target)?
        (sameInspector(current.target,target)?current:{...current,target}):current);
    },
    enterTarget:(target,frameConfig,displayConfig)=>{
      if(!enabled||!hydrated)return;
      if(session&&(session.page!==target.page||session.frameKey!==target.frameKey))return;
      setSelection(target);
      setSession(previous=>previous&&previous.page===target.page&&previous.frameKey===target.frameKey?
        {...previous,scope:'target',target,instanceId:undefined}:
        {
          page:target.page,frameKey:target.frameKey,title:target.frameTitle,scope:'target',target,
          draft:{...frameConfig},
          draftInstances:(saved[scopeId(target.page,target.frameKey)]??[]).map(item=>({...item})),
          draftTargets:{...(targetStyles[scopeId(target.page,target.frameKey)]??{})},
          draftWorkspace:workspaces[scopeId(target.page,target.frameKey)]??DEFAULT_WORKSPACE,
          draftDisplay:{...displayConfig},displayTouched:[],
        });
    },
    patchFrame:patch=>setSession(current=>current&&current.draft.behavior!=='locked'?
      {...current,draft:{...current.draft,...patch}}:current),
    patchInstance:(id,patch)=>setSession(current=>current?{...current,
      draftInstances:current.draftInstances.map(item=>item.id===id?{...item,...patch}:item),
    }:current),
    patchTarget:(id,patch)=>setSession(current=>current&&current.scope==='target'&&current.target?.id===id?
      {...current,draftTargets:{...current.draftTargets,[id]:normalizeTargetOverride({...current.draftTargets[id],...patch})}}:current),
    patchWorkspace:patch=>setSession(current=>current?{...current,
      draftWorkspace:normalizeWorkspace({...current.draftWorkspace,...patch})}:current),
    patchDisplay:patch=>setSession(current=>current?{
      ...current,draftDisplay:{...current.draftDisplay,...patch},
      displayTouched:[...new Set([...current.displayTouched,...Object.keys(patch) as (keyof PageDisplayConfig)[]])],
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
    cancel:()=>{setSession(null);setSelection(null);},
    apply:async()=>{
      if(!session)return false;
      const key=scopeId(session.page,session.frameKey);
      const normalizedInstances=normalizeInstances(session.draftInstances);
      const nextSaved={...saved,[key]:normalizedInstances};
      const nextWorkspace={...workspaces,[key]:normalizeWorkspace(session.draftWorkspace)};
      const nextTargets={...targetStyles,[key]:Object.fromEntries(
        Object.entries(session.draftTargets).map(([id,override])=>[id,normalizeTargetOverride(override)]))};
      try{
        // One key contains both local instance and native target overrides. No finance keys.
        await AsyncStorage.setItem(MAINTENANCE_STORAGE_KEY,JSON.stringify({
          schema:3,instances:nextSaved,targets:nextTargets,workspaces:nextWorkspace,
        }));
        const normalized=normalizeEditorConfig(session.page,{...editor.config,[session.frameKey]:session.draft});
        editor.replacePageConfig(normalized);
        if(session.displayTouched.length){
          const patch=Object.fromEntries(session.displayTouched.map(field=>[field,session.draftDisplay[field]])) as Partial<PageDisplayConfig>;
          editor.updateDisplayConfig(patch);
        }
        setSaved(nextSaved);setTargetStyles(nextTargets);setWorkspaces(nextWorkspace);
        setSelection(null);setSession(null);
        return true;
      }catch{return false;}
    },
  }),[hydrated,enabled,session,selection,saved,targetStyles,workspaces,editor.config,editor.displayConfig,editor.replacePageConfig,editor.updateDisplayConfig]);

  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
}
export function useMaintenance(){
  const value=useContext(MaintenanceContext);
  if(!value)throw new Error('MaintenanceProvider is required');
  return value;
}
