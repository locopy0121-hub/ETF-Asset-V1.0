/** Native FrameCard's local gesture dimensions; no financial or child mutations. */
import {EDITOR_DIMENSION_MIN,EDITOR_DIMENSION_MAX} from '../editor/dimensionPolicy';
export type FrameSize=Readonly<{width:number;height:number}>;
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(v)));
export function frameResizeDimensions(start:FrameSize,dx:number,dy:number):FrameSize|null{
 if(![start.width,start.height,dx,dy].every(Number.isFinite)||start.width<=0||start.height<=0)return null;
 return {width:clamp(start.width+dx,EDITOR_DIMENSION_MIN,EDITOR_DIMENSION_MAX),height:clamp(start.height+dy,EDITOR_DIMENSION_MIN,EDITOR_DIMENSION_MAX)};
}
