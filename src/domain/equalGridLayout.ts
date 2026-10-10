/** A layout policy only: never alters finance values, metric order or manual card overrides. */
export type EqualGridColumns='auto'|2|3|4;
export type EqualGridConfig=Readonly<{enabled:boolean;columns:EqualGridColumns;gap:number}>;
export const DEFAULT_EQUAL_GRID:EqualGridConfig={enabled:false,columns:'auto',gap:8};
export function normalizeEqualGrid(raw:unknown):EqualGridConfig{
  const v=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Partial<EqualGridConfig>:{};
  return {
    enabled:v.enabled===true,
    columns:v.columns==='auto'||v.columns===2||v.columns===3||v.columns===4?v.columns:'auto',
    gap:typeof v.gap==='number'&&Number.isFinite(v.gap)?Math.max(0,Math.min(40,Math.round(v.gap))):DEFAULT_EQUAL_GRID.gap,
  };
}
export function equalGridWidths(total:number,config:EqualGridConfig,availableWidth:number):number[]{
  if(total<=0)return [];
  const columns=config.columns==='auto'?Math.min(4,Math.max(1,total)):config.columns;
  if(!Number.isFinite(availableWidth)||availableWidth<=0)return [];
  const widths:number[]=[];
  for(let first=0;first<total;first+=columns){
    const members=Math.min(columns,total-first);
    // Every row shares its remaining space equally; a final partial row expands
    // to fill available width instead of leaving an empty, non-responsive gap.
    const width=Math.max(1,(availableWidth-config.gap*(members-1))/members);
    for(let i=0;i<members;i++)widths.push(width);
  }
  return widths;
}

/**
 * The equal-grid toggle owns placement, not financial values or saved manual edits.
 * When enabled, ignore only geometry that would move/shrink a card out of its
 * allocated cell. The persisted override is never changed, so OFF restores XY,
 * anchoring, and manual widths exactly as saved.
 */
export function equalGridVisualOverride<T extends {
  width?:number;offsetX?:number;offsetY?:number;
  anchorX?:string;anchorY?:string;anchorBaseWidth?:number;anchorBaseHeight?:number;
  marginHorizontal?:number;marginVertical?:number;
}>(saved:T,enabled:boolean):T{
  if(!enabled)return saved;
  const next={...saved};
  delete next.width;
  delete next.offsetX;
  delete next.offsetY;
  delete next.anchorX;
  delete next.anchorY;
  delete next.anchorBaseWidth;
  delete next.anchorBaseHeight;
  delete next.marginHorizontal;
  delete next.marginVertical;
  return next;
}

/** Distribute integer layout pixels, including any remainder, without overflow. */
export function equalGridPixelWidths(total:number,config:EqualGridConfig,availableWidth:number):number[]{
  if(total<=0||!Number.isFinite(availableWidth)||availableWidth<=0)return [];
  const columns=config.columns==='auto'?Math.min(4,Math.max(1,total)):config.columns;
  const widths:number[]=[];
  const available=Math.max(1,Math.floor(availableWidth));
  for(let first=0;first<total;first+=columns){
    const members=Math.min(columns,total-first);
    const space=Math.max(members,available-config.gap*(members-1));
    const base=Math.floor(space/members);
    const extra=space-base*members;
    for(let i=0;i<members;i++)widths.push(base+(i<extra?1:0));
  }
  return widths;
}
