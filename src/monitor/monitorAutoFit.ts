export type MonitorAutoFit=Readonly<{enabled:boolean;minFontSize:number;maxFontSize:number;rowHeight:number}>;
export type MonitorFitCell=Readonly<{width:number;height:number;naturalWidth:number;naturalHeight:number}>;
export const DEFAULT_MONITOR_AUTO_FIT:MonitorAutoFit={enabled:false,minFontSize:8,maxFontSize:24,rowHeight:32};
const bounded=(n:unknown,min:number,max:number,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
export function normalizeMonitorAutoFit(raw:Partial<MonitorAutoFit>|undefined):MonitorAutoFit{
 const minFontSize=bounded(raw?.minFontSize,6,48,8);
 return {enabled:raw?.enabled===true,minFontSize,maxFontSize:bounded(raw?.maxFontSize,minFontSize,72,Math.max(24,minFontSize)),rowHeight:bounded(raw?.rowHeight,16,160,32)};
}
/** Natural metrics are measured at maxFontSize using the actual face/weight. */
export function fitMonitorRowFont(options:MonitorAutoFit,cells:readonly MonitorFitCell[]):number{
 let size=options.maxFontSize;
 for(const c of cells){if(![c.width,c.height,c.naturalWidth,c.naturalHeight].every(Number.isFinite)||c.width<=0||c.height<=0)return options.minFontSize;
  const ratio=Math.min(c.naturalWidth>0?c.width/c.naturalWidth:1,c.naturalHeight>0?c.height/c.naturalHeight:1,1);
  size=Math.min(size,Math.max(options.minFontSize,options.maxFontSize*ratio));
 }
 return Math.max(options.minFontSize,Math.min(options.maxFontSize,Math.floor((size+1e-6)*10)/10));
}
