/** Geometry and display mode shared by one-card AB live preview. */
export function holdingPreviewLayout(mode?:string):'full'|'narrow'{
  return mode==='grid2'||mode==='grid3'||mode==='paged2'?'narrow':'full';
}
export function previewLimit(viewport:number,panel:number):number{
  if(!Number.isFinite(viewport)||!Number.isFinite(panel))return 0;
  return Math.max(0,viewport-panel-8);
}
export function clampPreviewPosition(value:number,max:number):number{
  return Math.max(0,Math.min(Number.isFinite(value)?value:0,Math.max(0,max)));
}
