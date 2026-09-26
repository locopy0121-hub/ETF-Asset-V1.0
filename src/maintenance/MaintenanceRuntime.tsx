import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,type PropsWithChildren,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import type {MainPageKey} from '../domain/pageRegistry';
import {normalizeEditorConfig,type FrameEditorConfig,type PageDisplayConfig,usePageEditor} from '../editor/pageEditor';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {instantiateComponent,isEngineerOwnedInstance,removeEngineerOwnedInstance,normalizeInstances,type MaintenanceInstance} from './componentLibrary';
import {normalizeTargetMap,normalizeTargetOverride,resetTargetVisualOverride,VISUAL_TARGET_KEYS,type TargetKind,type TargetAppearance,type InspectedTarget,type TargetOverride} from './inspectionModel';
import {DEFAULT_WORKSPACE,normalizeWorkspace,type WorkspaceConfig,type PositionedRect} from './workspaceModel';

export const MAINTENANCE_STORAGE_KEY='@tf-asset/v3.0.1-frame-instances';
const scopeId=(page:MainPageKey,frameKey:string)=>page+':'+frameKey;
const instanceKind=(templateId:string):TargetKind=>templateId==='parent-frame'?'frame':templateId==='divider'?'generic':'text';
type StyleSyncScope='frame'|'page'|'app';
const sharedKey=(page:MainPageKey,frameKey:string,kind:TargetKind,scope:StyleSyncScope)=>
  scope==='frame'?`frame:${page}:${frameKey}:${kind}`:scope==='page'?`page:${page}:${kind}`:`app:${kind}`;

export type MaintenanceSession=Readonly<{
  page:MainPageKey;frameKey:string;title:string;scope:'frame'|'instance'|'target';
  instanceId?:string|undefined;focusInstanceId?:string|undefined;target?:InspectedTarget|undefined;
  draft:FrameEditorConfig;draftInstances:readonly MaintenanceInstance[];
  draftTargets:Readonly<Record<string,TargetOverride>>;
  draftWorkspace:WorkspaceConfig;
  draftDisplay:PageDisplayConfig;displayTouched:readonly (keyof PageDisplayConfig)[];
  syncSameKind:boolean;syncScope:StyleSyncScope;sharedTouched:readonly (keyof TargetAppearance)[];
}>;
type MaintenanceContextValue=Readonly<{
  hydrated:boolean;enabled:boolean;session:MaintenanceSession|null;selection:InspectedTarget|null;
  getInstances:(page:MainPageKey,frameKey:string)=>readonly MaintenanceInstance[];
  getTargetOverride:(page:MainPageKey,frameKey:string,id:string,kind?:TargetKind)=>TargetOverride;
  setSyncSameKind:(enabled:boolean)=>void;
  setSyncScope:(scope:StyleSyncScope)=>void;
  getWorkspace:(page:MainPageKey,frameKey:string)=>WorkspaceConfig;
  getWorkspaceBounds:(page:MainPageKey,frameKey:string)=>{width:number;height:number};
  getFrameRects:(page:MainPageKey,frameKey:string)=>Readonly<Record<string,PositionedRect>>;
  reportWorkspaceBounds:(page:MainPageKey,frameKey:string,bounds:{width:number;height:number})=>void;
  reportRect:(page:MainPageKey,frameKey:string,id:string,rect:PositionedRect|null)=>void;
  begin:(page:MainPageKey,frameKey:string,title:string,config:FrameEditorConfig,instanceId?:string,displayConfig?:PageDisplayConfig)=>void;
  selectTarget:(target:InspectedTarget)=>void;syncTarget:(target:InspectedTarget)=>void;
  enterTarget:(target:InspectedTarget,frameConfig:FrameEditorConfig,displayConfig:PageDisplayConfig)=>void;
  patchFrame:(patch:Partial<FrameEditorConfig>)=>void;
  clearFrameDimension:(axis:'width'|'height')=>void;
  patchInstance:(id:string,patch:Partial<MaintenanceInstance>)=>void;
  patchTarget:(id:string,patch:TargetOverride)=>void;
  resetTargetVisual:(id:string)=>void;
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
  const [sharedStyles,setSharedStyles]=useState<Record<string,TargetOverride>>({});
  const [localOnlyKeys,setLocalOnlyKeys]=useState<Record<string,string[]>>({});
  const [workspaces,setWorkspaces]=useState<Record<string,WorkspaceConfig>>({});
  const [liveBounds,setLiveBounds]=useState<Record<string,{width:number;height:number}>>({});
  const [liveRects,setLiveRects]=useState<Record<string,Record<string,PositionedRect>>>({});
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
        if(parsed.localOnlyKeys&&typeof parsed.localOnlyKeys==='object'&&!Array.isArray(parsed.localOnlyKeys)){
          setLocalOnlyKeys(Object.fromEntries(Object.entries(parsed.localOnlyKeys as Record<string,unknown>)
            .filter(([key,value])=>key.length<260&&Array.isArray(value))
            .map(([key,value])=>[key,(value as unknown[]).filter((field):field is string=>typeof field==='string'&&
              VISUAL_TARGET_KEYS.includes(field as keyof TargetAppearance))])));
        }
        if(parsed.sharedStyles&&typeof parsed.sharedStyles==='object'&&!Array.isArray(parsed.sharedStyles)){
          const kinds:readonly TargetKind[]=['metric','text','value','action','quote-card','wall','portfolio-list','control','generic','prefix','frame'];
          const shared=parsed.sharedStyles as Record<string,unknown>;
          setSharedStyles(Object.fromEntries(Object.entries(shared).filter(([id])=>{
            const kind=id.split(':').at(-1) as TargetKind;
            return kinds.includes(kind)&&(kinds.includes(id as TargetKind)||id.startsWith('app:')||id.startsWith('page:')||id.startsWith('frame:'))&&id.length<=240;
          }).map(([id,value])=>{
            const normalized=normalizeTargetOverride(value);
            const key=kinds.includes(id as TargetKind)?`app:${id}`:id;
            return [key,Object.fromEntries(Object.entries(normalized).filter(([field])=>VISUAL_TARGET_KEYS.includes(field as keyof TargetAppearance)))];
          })));
        }
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
  const reportWorkspaceBounds=useCallback((page:MainPageKey,frameKey:string,bounds:{width:number;height:number})=>setLiveBounds(previous=>{
    const key=scopeId(page,frameKey),old=previous[key];
    return old?.width===bounds.width&&old?.height===bounds.height?previous:{...previous,[key]:bounds};
  }),[]);
  const reportRect=useCallback((page:MainPageKey,frameKey:string,id:string,rect:PositionedRect|null)=>setLiveRects(previous=>{
    const key=scopeId(page,frameKey),all=previous[key]??{},old=all[id];
    if(rect===null){if(!old)return previous;const next={...all};delete next[id];return {...previous,[key]:next};}
    if(old&&old.x===rect.x&&old.y===rect.y&&old.width===rect.width&&old.height===rect.height)return previous;
    return {...previous,[key]:{...all,[id]:rect}};
  }),[]);
  const value=useMemo<MaintenanceContextValue>(()=>({
    hydrated,enabled,session,selection,
    getInstances:(page,frameKey)=>saved[scopeId(page,frameKey)]??[],
    getWorkspaceBounds:(page,frameKey)=>liveBounds[scopeId(page,frameKey)]??{width:0,height:0},
    getFrameRects:(page,frameKey)=>liveRects[scopeId(page,frameKey)]??{},
    reportWorkspaceBounds,reportRect,
    getWorkspace:(page,frameKey)=>session?.page===page&&session.frameKey===frameKey?
      session.draftWorkspace:workspaces[scopeId(page,frameKey)]??DEFAULT_WORKSPACE,
    getTargetOverride:(page,frameKey,id,kind)=>{
      const key=scopeId(page,frameKey);
      const local=(session?.page===page&&session.frameKey===frameKey?
        session.draftTargets[id]:targetStyles[key]?.[id])??{};
      if(!kind)return local;
      const group={...(sharedStyles[sharedKey(page,frameKey,kind,'app')]??{}),
        ...(sharedStyles[sharedKey(page,frameKey,kind,'page')]??{}),
        ...(sharedStyles[sharedKey(page,frameKey,kind,'frame')]??{})};
      const sourceId=session?.scope==='target'?session.target?.id:
        session?.scope==='instance'&&session.instanceId?'installed:'+session.instanceId:undefined;
      const selectedInstance=session?.scope==='instance'?
        session.draftInstances.find(item=>item.id===session.instanceId):undefined;
      const sourceKind=session?.scope==='target'?session.target?.kind:
        selectedInstance?instanceKind(selectedInstance.templateId):undefined;
      const active=sourceId!==undefined&&sourceKind===kind&&session?.syncSameKind&&
        (session.syncScope==='app'||session.page===page&&
          (session.syncScope==='page'||session.frameKey===frameKey));
      const changed=active&&session?Object.fromEntries(session.sharedTouched
        .filter(field=>session.draftTargets[sourceId]?.[field]!==undefined)
        .map(field=>[field,session.draftTargets[sourceId]?.[field]])):{};
      const isolated=Object.fromEntries((localOnlyKeys[key+':'+id]??[])
        .filter(field=>local[field as keyof TargetOverride]!==undefined)
        .map(field=>[field,local[field as keyof TargetOverride]]));
      const merged={...local,...group,...isolated,...changed};
      return active&&sourceId===id&&session?.page===page&&session.frameKey===frameKey?
        {...merged,...session.draftTargets[id]}:merged;
    },
    setSyncSameKind:enabled=>setSession(current=>current?{...current,syncSameKind:enabled}:current),
    setSyncScope:scope=>setSession(current=>current?{...current,syncScope:scope}:current),
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
          draftDisplay:{...(displayConfig??editor.displayConfig)},displayTouched:[],syncSameKind:true,syncScope:'frame',sharedTouched:[],
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
          draftDisplay:{...displayConfig},displayTouched:[],syncSameKind:true,syncScope:'frame',sharedTouched:[],
        });
    },
    patchFrame:patch=>setSession(current=>current&&current.draft.behavior!=='locked'?
      {...current,draft:{...current.draft,...patch}}:current),
    clearFrameDimension:axis=>setSession(current=>{
      if(!current||current.draft.behavior==='locked')return current;
      const draft={...current.draft};
      delete draft[axis];
      return {...current,draft};
    }),
    patchInstance:(id,patch)=>setSession(current=>{
      if(!current||!current.draftInstances.some(item=>item.id===id&&isEngineerOwnedInstance(item)))return current;
      const style:TargetOverride={
        ...(patch.fontSize!==undefined?{fontSize:patch.fontSize}:{}),
        ...(patch.color!==undefined?{textColor:patch.color}:{}),
      };
      const targetId='installed:'+id;
      return {...current,draftInstances:current.draftInstances.map(item=>item.id===id?{
        ...item,...patch,id:item.id,templateId:item.templateId,createdBy:item.createdBy,
      }:item),
        ...(Object.keys(style).length?{
          draftTargets:{...current.draftTargets,[targetId]:normalizeTargetOverride({
            ...current.draftTargets[targetId],...style})},
          sharedTouched:[...new Set([...current.sharedTouched,...Object.keys(style) as (keyof TargetAppearance)[]])],
        }:{}),
      };
    }),
    patchTarget:(id,patch)=>setSession(current=>current&&current.scope==='target'&&current.target?.id===id?
      {...current,draftTargets:{...current.draftTargets,[id]:normalizeTargetOverride({...current.draftTargets[id],...patch})},
        sharedTouched:[...new Set([...current.sharedTouched,...Object.keys(patch).filter(
          key=>VISUAL_TARGET_KEYS.includes(key as keyof TargetAppearance)) as (keyof TargetAppearance)[]])]}:current),
    resetTargetVisual:id=>setSession(current=>current&&current.scope==='target'&&current.target?.id===id?
      {...current,draftTargets:{...current.draftTargets,[id]:resetTargetVisualOverride(current.draftTargets[id]??{})}}:current),
    patchWorkspace:patch=>setSession(current=>current?{...current,
      draftWorkspace:normalizeWorkspace({...current.draftWorkspace,...patch})}:current),
    patchDisplay:patch=>setSession(current=>current?{
      ...current,draftDisplay:{...current.draftDisplay,...patch},
      displayTouched:[...new Set([...current.displayTouched,...Object.keys(patch) as (keyof PageDisplayConfig)[]])],
    }:current),
    install:templateId=>setSession(current=>{
      if(!current||current.draftInstances.length>=30)return current;
      const selected=current.scope==='instance'?current.draftInstances.find(item=>item.id===current.instanceId):undefined;
      if(current.scope!=='frame'&&!(selected&&selected.templateId==='parent-frame'&&isEngineerOwnedInstance(selected)))return current;
      const id='i-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
      const instance=instantiateComponent(templateId,id);
      // Parent frames live at the local root; other new components can be nested inside one.
      const located=selected&&instance.templateId!=='parent-frame'?{...instance,parentId:selected.id}:instance;
      return {...current,draftInstances:[...current.draftInstances,located],focusInstanceId:id};
    }),
    remove:id=>setSession(current=>{
      if(!current||!['frame','instance'].includes(current.scope))return current;
      // A built-in UI target never appears in the minted component array. Even a
      // forged native ID or stale selection cannot remove real App functionality.
      const victim=current.draftInstances.find(item=>item.id===id);
      if(!isEngineerOwnedInstance(victim)||current.scope==='instance'&&current.instanceId!==id)return current;
      return {...current,draftInstances:removeEngineerOwnedInstance(current.draftInstances,id),
        scope:'frame',instanceId:undefined,focusInstanceId:current.focusInstanceId===id?undefined:current.focusInstanceId};
    }),
    cancel:()=>{setSession(null);setSelection(null);},
    apply:async()=>{
      if(!session)return false;
      const key=scopeId(session.page,session.frameKey);
      const normalizedInstances=normalizeInstances(session.draftInstances);
      const nextSaved={...saved,[key]:normalizedInstances};
      const nextWorkspace={...workspaces,[key]:normalizeWorkspace(session.draftWorkspace)};
      let nextTargets={...targetStyles,[key]:Object.fromEntries(
        Object.entries(session.draftTargets).map(([id,override])=>[id,normalizeTargetOverride(override)]))};
      let nextShared={...sharedStyles};
      let nextLocalOnly={...localOnlyKeys};
      const syncInstance=session.scope==='instance'?
        session.draftInstances.find(item=>item.id===session.instanceId&&isEngineerOwnedInstance(item)):undefined;
      const syncId=session.scope==='target'?session.target?.id:
        syncInstance?'installed:'+syncInstance.id:undefined;
      const syncKind=session.scope==='target'?session.target?.kind:
        syncInstance?instanceKind(syncInstance.templateId):undefined;
      if(syncId&&session.sharedTouched.length){
        const itemKey=key+':'+syncId;
        const previous=nextLocalOnly[itemKey]??[];
        nextLocalOnly[itemKey]=session.syncSameKind?
          previous.filter(field=>!session.sharedTouched.includes(field as keyof TargetAppearance)):
          [...new Set([...previous,...session.sharedTouched])];
      }
      if(syncId&&syncKind&&session.syncSameKind&&session.sharedTouched.length){
        const kind=syncKind;
        const edited=session.draftTargets[syncId]??{};
        const changed=Object.fromEntries(session.sharedTouched.filter(field=>edited[field]!==undefined)
          .map(field=>[field,edited[field]]));
        const styleKey=sharedKey(session.page,session.frameKey,kind,session.syncScope);
        // An explicit wider sync must not be masked by old narrower shared overrides.
        if(session.syncScope!=='frame')for(const oldKey of Object.keys(nextShared)){
          if(oldKey===styleKey||!oldKey.endsWith(':'+kind))continue;
          if(session.syncScope==='page'&&!oldKey.startsWith(`frame:${session.page}:`))continue;
          const next={...nextShared[oldKey]};for(const field of Object.keys(changed))delete next[field as keyof TargetOverride];
          nextShared[oldKey]=next;
        }
        nextShared={...nextShared,[styleKey]:normalizeTargetOverride({...nextShared[styleKey],...changed})};
      }
      try{
        // One key contains both local instance and native target overrides. No finance keys.
        await AsyncStorage.setItem(MAINTENANCE_STORAGE_KEY,JSON.stringify({
          schema:3,instances:nextSaved,targets:nextTargets,workspaces:nextWorkspace,
          sharedStyles:nextShared,localOnlyKeys:nextLocalOnly,
        }));
        const normalized=normalizeEditorConfig(session.page,{...editor.config,[session.frameKey]:session.draft});
        editor.replacePageConfig(normalized);
        if(session.displayTouched.length){
          const patch=Object.fromEntries(session.displayTouched.map(field=>[field,session.draftDisplay[field]])) as Partial<PageDisplayConfig>;
          editor.updateDisplayConfig(patch);
        }
        setSaved(nextSaved);setTargetStyles(nextTargets);setSharedStyles(nextShared);setLocalOnlyKeys(nextLocalOnly);setWorkspaces(nextWorkspace);
        setSelection(null);setSession(null);
        return true;
      }catch{return false;}
    },
  }),[hydrated,enabled,session,selection,saved,targetStyles,sharedStyles,localOnlyKeys,workspaces,liveBounds,liveRects,reportWorkspaceBounds,reportRect,editor.config,editor.displayConfig,editor.replacePageConfig,editor.updateDisplayConfig]);

  return <MaintenanceContext.Provider value={value}>{children}</MaintenanceContext.Provider>;
}
export function useMaintenance(){
  const value=useContext(MaintenanceContext);
  if(!value)throw new Error('MaintenanceProvider is required');
  return value;
}
