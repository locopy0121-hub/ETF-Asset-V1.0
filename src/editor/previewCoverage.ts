import type {MainPageKey} from '../domain/pageRegistry';

/** Render previews only for mounted card surfaces, or the established live-data
 * overview renderers. Never manufacture a preview for a closed modal or settings. */
const BUILT_IN:Readonly<Partial<Record<MainPageKey,readonly string[]>>>={
  home:['asset-dashboard','profit-analysis','pnl-detail','dashboard-quick-actions','holding-quotes'],
  portfolio:['holding-view'],
};
export function resolvePreviewFrameKeys(page:MainPageKey,orderedKeys:readonly string[],mountedKeys:readonly string[]):string[]{
  if(page==='settings')return [];
  const mounted=new Set(mountedKeys),builtIn=new Set(BUILT_IN[page]??[]);
  return orderedKeys.filter(key=>key==='page-header'||mounted.has(key)||builtIn.has(key));
}

/** Previously omitted content cards, all backed by live production surfaces. */
const CONTENT_CARD_KEYS:Readonly<Partial<Record<MainPageKey,readonly string[]>>>={
  home:['market-news'],
  ledger:['quick-entry','ledger-list','monthly-summary'],
  portfolio:['holding-dashboard','allocation'],
  ai:['ai-news'],
};
export function supportsCardContentEditor(page:MainPageKey,key:string):boolean{
  return CONTENT_CARD_KEYS[page]?.includes(key)??false;
}
