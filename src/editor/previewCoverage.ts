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
