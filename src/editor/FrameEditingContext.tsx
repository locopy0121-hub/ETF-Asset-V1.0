import {createContext,useContext,type PropsWithChildren} from 'react';
import type {FrameMaintenanceContext} from '../maintenance/inspectionModel';

const FrameContext=createContext<FrameMaintenanceContext|null>(null);
export function FrameEditingProvider({frame,children}:PropsWithChildren<{frame:FrameMaintenanceContext}>){
  return <FrameContext.Provider value={frame}>{children}</FrameContext.Provider>;
}
export const useEditingFrame=()=>useContext(FrameContext);
