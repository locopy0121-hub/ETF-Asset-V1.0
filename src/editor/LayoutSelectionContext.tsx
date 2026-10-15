import {createContext,useContext,type PropsWithChildren} from 'react';
import type {TargetOverride} from '../maintenance/inspectionModel';

export type LayoutSelectionKind='frame'|'card'|'text'|'value'|'prefix'|'chart'|'data'|'button'|'badge'|'table'|'calendar'|'form'|'list'|'layout';
export type LayoutSelectionTarget=Readonly<{id:string;kind:LayoutSelectionKind;label:string;width?:number;height?:number}>;

type LayoutRuntimeContextValue=Readonly<{
  active:boolean;
  selectedId:string|null;
  targets:Readonly<Record<string,TargetOverride>>;
  onSelect?:(target:LayoutSelectionTarget)=>void;
}>;

const LayoutRuntimeContext=createContext<LayoutRuntimeContextValue>({active:false,selectedId:null,targets:{}});

export function LayoutTargetProvider({targets,children}:PropsWithChildren<{
  targets:Readonly<Record<string,TargetOverride>>;
}>){
  return <LayoutRuntimeContext.Provider value={{active:false,selectedId:null,targets}}>{children}</LayoutRuntimeContext.Provider>;
}

export function LayoutSelectionProvider({targets,selectedId,onSelect,children}:PropsWithChildren<{
  targets:Readonly<Record<string,TargetOverride>>;
  selectedId:string|null;
  onSelect:(target:LayoutSelectionTarget)=>void;
}>){
  return <LayoutRuntimeContext.Provider value={{active:true,selectedId,targets,onSelect}}>{children}</LayoutRuntimeContext.Provider>;
}
export const useLayoutRuntime=()=>useContext(LayoutRuntimeContext);
