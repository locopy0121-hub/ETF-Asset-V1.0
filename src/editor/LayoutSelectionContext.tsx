import {createContext,useContext,type PropsWithChildren} from 'react';

export type LayoutSelectionKind='frame'|'card'|'text'|'value'|'prefix'|'chart'|'data'|'button'|'badge'|'table'|'calendar'|'form'|'list'|'layout';
export type LayoutSelectionTarget=Readonly<{id:string;kind:LayoutSelectionKind;label:string}>;

type LayoutSelectionContextValue=Readonly<{
  active:boolean;
  selectedId:string|null;
  onSelect?:(target:LayoutSelectionTarget)=>void;
}>;

const LayoutSelectionContext=createContext<LayoutSelectionContextValue>({active:false,selectedId:null});

export function LayoutSelectionProvider({selectedId,onSelect,children}:PropsWithChildren<{
  selectedId:string|null;
  onSelect:(target:LayoutSelectionTarget)=>void;
}>){
  return <LayoutSelectionContext.Provider value={{active:true,selectedId,onSelect}}>{children}</LayoutSelectionContext.Provider>;
}
export const useLayoutSelection=()=>useContext(LayoutSelectionContext);
