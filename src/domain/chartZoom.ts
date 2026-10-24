/** Chart pixel-scale only; never resample / mutate official OHLC or volume records. */
export const CHART_ZOOM_STOPS=[0.65,0.8,1,1.25,1.5,2,2.5] as const;
export const DEFAULT_CHART_ZOOM=1;
export function nearestChartZoom(value:number):number{
 if(!Number.isFinite(value))return DEFAULT_CHART_ZOOM;
 return CHART_ZOOM_STOPS.reduce((best,x)=>Math.abs(x-value)<Math.abs(best-value)?x:best,DEFAULT_CHART_ZOOM as number);
}
export function stepChartZoom(value:number,direction:-1|0|1):number{
 const index=CHART_ZOOM_STOPS.indexOf(nearestChartZoom(value) as typeof CHART_ZOOM_STOPS[number]);
 return CHART_ZOOM_STOPS[Math.max(0,Math.min(CHART_ZOOM_STOPS.length-1,index+direction))]!;
}
export function chartCandleMetrics(zoom:number){
 const scale=nearestChartZoom(zoom),width=Math.max(7,Math.round(13*scale));
 return {step:Math.max(width+2,Math.round(18*scale)),width,
   bodyWidth:Math.min(width-1,Math.max(4,Math.round(10*scale))),
   volumeWidth:Math.max(3,Math.round(7*scale))};
}
/** Preserve the focal date when resizing chart candles, clamped to scroll bounds. */
export function anchoredChartOffset(offset:number,viewport:number,oldStep:number,newStep:number,newWidth:number,pad=3):number{
 if(![offset,viewport,oldStep,newStep,newWidth,pad].every(Number.isFinite)||viewport<=0||oldStep<=0||newStep<=0)return 0;
 const center=viewport/2,at=(Math.max(0,offset)+center-pad)/oldStep;
 return Math.max(0,Math.min(Math.max(0,newWidth-viewport),pad+at*newStep-center));
}
