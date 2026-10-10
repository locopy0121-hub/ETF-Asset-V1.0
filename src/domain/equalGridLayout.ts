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
