import type {HoldingLayoutMode} from '../editor/editorModel';

/** V3.1.5 alternate selector has a new identity; damaged old local overrides must not follow it. */
export const PORTFOLIO_SAFE_SWITCH_ID='control:portfolio-mode-v315';

/** V3.1.6 four-state first key; the emergency safe list stays a separate bypass. */
export const PORTFOLIO_QUICK_SWITCH_ID='control:portfolio-quick-v316';
export const PORTFOLIO_PRIMARY_MODES=['list','wall','quote','compact'] as const;
export type PortfolioPrimaryMode=typeof PORTFOLIO_PRIMARY_MODES[number];
export type PortfolioQuickMode=PortfolioPrimaryMode|'chart'|'advanced';
export function nextPortfolioPrimaryMode(current:PortfolioPrimaryMode):PortfolioPrimaryMode{
  return PORTFOLIO_PRIMARY_MODES[(PORTFOLIO_PRIMARY_MODES.indexOf(current)+1)%PORTFOLIO_PRIMARY_MODES.length]!;
}
export function quickModeFromDisplay(view:unknown,style:unknown,layout:unknown):PortfolioQuickMode{
  if(normalizePortfolioViewMode(view)==='list')return 'list';
  if(style==='chart'||style==='advanced'||style==='compact')return style;
  return normalizePortfolioLayoutMode(layout)==='list'?'quote':'wall';
}
export function quickModePatch(mode:PortfolioQuickMode,currentLayout:HoldingLayoutMode){
  if(mode==='list')return {portfolioViewMode:'list' as const};
  if(mode==='wall')return {portfolioViewMode:'wall' as const,quoteStyle:'quote' as const,
    holdingLayoutMode:currentLayout==='list'?'grid2' as const:currentLayout};
  return {portfolioViewMode:'wall' as const,quoteStyle:mode==='quote'?'quote' as const:mode,
    holdingLayoutMode:'list' as const};
}
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
  return page==='portfolio'&&frame==='holding-view'&&(id===PORTFOLIO_SAFE_SWITCH_ID||id===PORTFOLIO_QUICK_SWITCH_ID);
}
