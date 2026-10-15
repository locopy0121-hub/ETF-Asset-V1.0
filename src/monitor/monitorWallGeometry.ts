/** Android configuration uses physical pixels. Counts have no preset 1–4 restriction. */
export const MAX_MONITOR_COLUMNS=2147483647;
export function parseMonitorColumns(value:string):number|null{
  if(!/^\d+$/.test(value.trim()))return null;
  const n=Number(value.trim());
  return Number.isInteger(n)&&n>=1&&n<=MAX_MONITOR_COLUMNS?n:null;
}
export function normalizeMonitorColumns(value:unknown,fallback=2):number{
  return typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=MAX_MONITOR_COLUMNS?value:fallback;
}
export function monitorWallGeometry(baseWidth:number,padding:number,columns:number,gap:number,screenWidth:number,rowCount:number){
  const count=normalizeMonitorColumns(columns),cardWidth=Math.max(1,Math.round(baseWidth)-2*Math.round(padding));
  const occupied=Math.min(count,Math.max(1,rowCount));
  return {cardWidth,windowWidth:Math.max(1,Math.min(screenWidth,2*padding+count*cardWidth+(count-1)*gap)),contentWidth:Math.max(1,Math.min(16777215,occupied*cardWidth+(occupied-1)*gap))};
}
