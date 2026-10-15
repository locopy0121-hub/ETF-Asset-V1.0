/** Shared display-only chart geometry; neither quotes nor accounting data are resampled. */
export function trendContentWidth(viewport:number,points:number,zoom:number):number{
 const safeViewport=Number.isFinite(viewport)?Math.max(120,viewport):240;
 const count=Number.isFinite(points)?Math.max(0,Math.floor(points)):0;
 const scale=Number.isFinite(zoom)?Math.min(2.5,Math.max(.65,zoom)):1;
 return Math.max(safeViewport,Math.round(24+Math.max(0,count-1)*Math.max(10,Math.round(18*scale))));
}
/** Keep the same historical bucket centered when chart width changes. */
export function trendCenteredOffset(offset:number,viewport:number,oldWidth:number,newWidth:number):number{
 if(![offset,viewport,oldWidth,newWidth].every(Number.isFinite)||oldWidth<=0||newWidth<=0||viewport<=0)return 0;
 const focalRatio=(Math.max(0,offset)+viewport/2)/oldWidth;
 return Math.min(Math.max(0,newWidth-viewport),Math.max(0,focalRatio*newWidth-viewport/2));
}
