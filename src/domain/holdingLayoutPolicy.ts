import type {QuoteModuleStyle} from './uiModels';

/** Presentation-only rules; all prices, holdings and transactions remain untouched. */
export function safeHoldingStyle(layout:string,requested:QuoteModuleStyle):QuoteModuleStyle{
  return layout==='grid3'&&(requested==='chart'||requested==='advanced')?'quote':requested;
}

export function holdingCardLayout(layout:string):'full'|'narrow'|'micro'{
  if(layout==='grid3')return 'micro';
  if(layout==='grid2'||layout==='paged2')return 'narrow';
  return 'full';
}

/** A carousel page and its snap step always occupy the same measured width. */
export function holdingPageWidth(measured:number,screen:number):number{
  if(Number.isFinite(measured)&&measured>0)return Math.round(measured);
  return Math.max(220,Math.round(Number.isFinite(screen)?screen-96:220));
}

export function holdingPages<T>(rows:readonly T[],count=2):T[][]{
  const size=Math.max(1,Math.floor(Number.isFinite(count)?count:2));
  const pages:T[][]=[];
  for(let i=0;i<rows.length;i+=size)pages.push(rows.slice(i,i+size));
  return pages;
}
