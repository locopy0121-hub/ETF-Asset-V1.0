import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import type { MainPageKey } from '../domain/pageRegistry';
import {
  createInitialDisplayState,
  createInitialEditorState,
  makePageConfig,
  mergeDisplayState,
  mergeEditorState,
  normalizePageDisplayConfig,
  type FrameEditorConfig,
  type PageDisplayConfig,
  type PageDisplayState,
  type PageEditorState,
} from './editorModel';

export * from './editorModel';

const STORAGE_KEY='@tf-asset/v1.0.2-editor-runtime';
const STORAGE_SCHEMA=1;

type EditorContextValue = {
  hydrated:boolean;
  state: PageEditorState;
  displayState: PageDisplayState;
  getPageConfig: (page: MainPageKey) => Readonly<Record<string, FrameEditorConfig>>;
  replacePageConfig: (page: MainPageKey, config: Record<string, FrameEditorConfig>) => void;
  getDisplayConfig:(page:MainPageKey)=>PageDisplayConfig;
  updateDisplayConfig:(page:MainPageKey,patch:Partial<PageDisplayConfig>)=>void;
  resetPage: (page: MainPageKey) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function PageEditorProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<PageEditorState>(() => createInitialEditorState());
  const [displayState,setDisplayState]=useState<PageDisplayState>(()=>createInitialDisplayState());
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw=>{
        if(!alive||!raw)return;
        const parsed=JSON.parse(raw) as {schema?:number;frames?:unknown;display?:unknown};
        if(parsed.schema!==STORAGE_SCHEMA)return;
        setState(mergeEditorState(parsed.frames));
        setDisplayState(mergeDisplayState(parsed.display));
      })
      .catch(()=>{})
      .finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({schema:STORAGE_SCHEMA,frames:state,display:displayState})).catch(()=>{});
  },[hydrated,state,displayState]);

  const value = useMemo<EditorContextValue>(() => ({
    hydrated,
    state,
    displayState,
    getPageConfig: page => state[page],
    replacePageConfig: (page, config) => setState(current => ({ ...current, [page]: config })),
    getDisplayConfig:page=>displayState[page],
    updateDisplayConfig:(page,patch)=>setDisplayState(current=>({...current,[page]:normalizePageDisplayConfig(page,{...current[page],...patch})})),
    resetPage: page => {
      setState(current => ({ ...current, [page]: makePageConfig(page) }));
      const defaults=createInitialDisplayState();
      setDisplayState(current=>({...current,[page]:defaults[page]}));
    },
  }), [hydrated,state,displayState]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function usePageEditor(page: MainPageKey) {
  const context = useContext(EditorContext);
  if (!context) throw new Error('usePageEditor must be used inside PageEditorProvider');

  return {
    hydrated:context.hydrated,
    config: context.getPageConfig(page),
    displayConfig:context.getDisplayConfig(page),
    replacePageConfig: (config: Record<string, FrameEditorConfig>) => context.replacePageConfig(page, config),
    updateDisplayConfig:(patch:Partial<PageDisplayConfig>)=>context.updateDisplayConfig(page,patch),
    resetPage: () => context.resetPage(page),
  };
}
