import {holdingCardLayout} from '../domain/holdingLayoutPolicy';

/** Geometry and display mode shared by one-card AB live preview. */
export function holdingPreviewLayout(mode?:string):'full'|'narrow'|'micro'{
  return holdingCardLayout(mode??'list');
}
export function previewLimit(viewport:number,panel:number):number{
  if(!Number.isFinite(viewport)||!Number.isFinite(panel))return 0;
  return Math.max(0,viewport-panel-8);
}
export function clampPreviewPosition(value:number,max:number):number{
  return Math.max(0,Math.min(Number.isFinite(value)?value:0,Math.max(0,max)));
}
