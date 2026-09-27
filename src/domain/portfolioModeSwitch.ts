import type {HoldingLayoutMode} from '../editor/editorModel';

/** V3.1.5 alternate selector has a new identity; damaged old local overrides must not follow it. */
export const PORTFOLIO_SAFE_SWITCH_ID='control:portfolio-mode-v315';
export type PortfolioModeChoice='list'|'wall'|'safe';
export type StoredPortfolioMode=Exclude<PortfolioModeChoice,'safe'>;

export function normalizePortfolioViewMode(value:unknown):StoredPortfolioMode{
  return value==='wall'?'wall':'list';
}
export function normalizePortfolioLayoutMode(value:unknown):HoldingLayoutMode{
  return value==='grid2'||value==='grid3'||value==='horizontal'||value==='paged2'?value:'list';
}
export function nextPortfolioMode(current:PortfolioModeChoice,requested:unknown):PortfolioModeChoice{
  if(requested!=='list'&&requested!=='wall'&&requested!=='safe')return current;
  return requested;
}
/** Keep a fresh control's styles local until the owner explicitly edits that native A. */
export function isIsolatedPortfolioSwitch(page:string,frame:string,id:string):boolean{
  return page==='portfolio'&&frame==='holding-view'&&id===PORTFOLIO_SAFE_SWITCH_ID;
}
