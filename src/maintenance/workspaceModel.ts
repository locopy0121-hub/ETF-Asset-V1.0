// Spatial engineering model. ALL dimensions are React Native dp, not raw screen pixels.
// This module has no React or finance dependencies and is regression-testable.
export type WorkspaceOrigin='top-left'|'center';
export type SnapMode='grid'|'center'|'edges'|'siblings';
export type WorkspaceConfig=Readonly<{
  width:number; height:number; // 0 = natural responsive size; an explicit width may scroll on narrow screens.
  origin:WorkspaceOrigin;showAxes:boolean;showGrid:boolean;gridSize:number;
  snapEnabled:boolean;snapThreshold:number;snapModes:readonly SnapMode[];
}>;
export type TargetGeometry=Readonly<{
  naturalX:number;naturalY:number;width:number;height:number;spaceWidth:number;spaceHeight:number;
}>;
export type SpatialOffset=Readonly<{
  offsetX?:number;offsetY?:number;width?:number;height?:number;
  anchorX?:'free'|'left'|'center'|'right';anchorY?:'free'|'top'|'center'|'bottom';
  anchorBaseWidth?:number;anchorBaseHeight?:number;
}>;
export type PositionedRect=Readonly<{x:number;y:number;width:number;height:number}>;
export const DEFAULT_WORKSPACE:WorkspaceConfig={
  width:0,height:0,origin:'top-left',showAxes:true,showGrid:false,gridSize:8,
  snapEnabled:false,snapThreshold:6,snapModes:['center','edges','grid','siblings'],
};
const safe=(x:unknown,min:number,max:number,fallback:number)=>
  typeof x==='number'&&Number.isFinite(x)?Math.max(min,Math.min(max,x)):fallback;
export function normalizeWorkspace(input:unknown):WorkspaceConfig{
  const v=(input&&typeof input==='object'&&!Array.isArray(input)?input:{}) as Partial<WorkspaceConfig>;
  const modes:readonly SnapMode[]=['grid','center','edges','siblings'];
  return {width:safe(v.width,0,2400,0),height:safe(v.height,0,2400,0),
    origin:v.origin==='center'?'center':'top-left',
    showAxes:v.showAxes!==false,showGrid:v.showGrid===true,
    gridSize:safe(v.gridSize,2,80,8),
    snapEnabled:v.snapEnabled===true, // Mobile OFF until the user intentionally enables it.
    snapThreshold:safe(v.snapThreshold,1,20,6),
    snapModes:Array.isArray(v.snapModes)?modes.filter(mode=>v.snapModes?.includes(mode)):DEFAULT_WORKSPACE.snapModes,
  };
}
const anchorShift=(axis:'x'|'y',p:SpatialOffset,g:TargetGeometry)=>{
  if(axis==='x'){const delta=g.spaceWidth-(p.anchorBaseWidth??g.spaceWidth);
    return p.anchorX==='right'?delta:p.anchorX==='center'?delta/2:0;}
  const delta=g.spaceHeight-(p.anchorBaseHeight??g.spaceHeight);
  return p.anchorY==='bottom'?delta:p.anchorY==='center'?delta/2:0;
};
export function effectiveOffset(p:SpatialOffset,g:TargetGeometry){
  return {x:(p.offsetX??0)+anchorShift('x',p,g),
    y:(p.offsetY??0)+anchorShift('y',p,g)};
}
export function positionedRect(g:TargetGeometry,p:SpatialOffset):PositionedRect{
  const delta=effectiveOffset(p,g);
  return {x:g.naturalX+delta.x,y:g.naturalY+delta.y,
    width:p.width??g.width,height:p.height??g.height};
}
export function displayPoint(value:number,axis:'x'|'y',g:TargetGeometry,origin:WorkspaceOrigin){
  return value-(origin==='center'?(axis==='x'?g.spaceWidth:g.spaceHeight)/2:0);
}
export function enteredOffset(input:number,axis:'x'|'y',g:TargetGeometry,p:SpatialOffset,origin:WorkspaceOrigin){
  if(!Number.isFinite(input)||Math.abs(input)>5000)return null;
  const center=origin==='center'?(axis==='x'?g.spaceWidth:g.spaceHeight)/2:0;
  const natural=axis==='x'?g.naturalX:g.naturalY;
  return input+center-natural-anchorShift(axis,p,g);
}
export function intersects(a:PositionedRect,b:PositionedRect){
  return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
}
export function positionWarnings(rect:PositionedRect,g:TargetGeometry,others:readonly PositionedRect[]){
  return {overflow:rect.x<0||rect.y<0||rect.x+rect.width>g.spaceWidth||rect.y+rect.height>g.spaceHeight,
    overlaps:others.filter(other=>intersects(rect,other)).length};
}
// Only call snapping on DRAG END. Never call it from manual entry or ±1 dp buttons.
export function snapDraggedRect(rect:PositionedRect,config:WorkspaceConfig,space:{width:number;height:number},siblings:readonly PositionedRect[]=[]):PositionedRect{
  if(!config.snapEnabled)return rect;
  const c=normalizeWorkspace(config);
  const candidatesX:number[]=[],candidatesY:number[]=[];
  // In an exact-distance tie, favor the parent's edge before neighboring components,
  // center guides, and grid: dragging 4dp from an edge must not jump inward to an 8dp grid.
  if(c.snapModes.includes('edges')){candidatesX.push(0,space.width-rect.width);candidatesY.push(0,space.height-rect.height);}
  if(c.snapModes.includes('siblings'))for(const s of siblings){
    candidatesX.push(s.x,s.x+s.width,s.x+s.width/2-rect.width/2);
    candidatesY.push(s.y,s.y+s.height,s.y+s.height/2-rect.height/2);
  }
  if(c.snapModes.includes('center')){candidatesX.push((space.width-rect.width)/2);candidatesY.push((space.height-rect.height)/2);}
  if(c.snapModes.includes('grid')){candidatesX.push(Math.round(rect.x/c.gridSize)*c.gridSize);candidatesY.push(Math.round(rect.y/c.gridSize)*c.gridSize);}
  const near=(actual:number,opts:number[])=>{
    const values=opts.map(v=>({v,d:Math.abs(v-actual)})).filter(item=>item.d<=c.snapThreshold).sort((a,b)=>a.d-b.d);
    return values[0]?.v??actual;
  };
  return {...rect,x:near(rect.x,candidatesX),y:near(rect.y,candidatesY)};
}
// All color tools use the existing picker; flags reference current global display settings.
export type FinancialTone='gain'|'loss'|'neutral';
export function linkedColor(custom:string,enabled:boolean|undefined,tone:FinancialTone,palette:{gainColor:string;lossColor:string;neutralColor:string}){
  if(enabled!==true)return custom;
  return tone==='gain'?palette.gainColor:tone==='loss'?palette.lossColor:palette.neutralColor;
}
