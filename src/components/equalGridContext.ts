import {createContext,useContext} from 'react';

/** Lightweight visual flag. Kept outside editor/provider dependencies so MetricTile
 * can still render in isolated Node finance tests without native market bridges.
 */
export const EqualGridContext=createContext(false);
export const useEqualGridActive=()=>useContext(EqualGridContext);
