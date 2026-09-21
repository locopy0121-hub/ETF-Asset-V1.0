export type FloatingPoint=Readonly<{x:number;y:number}>;
export type FloatingSize=Readonly<{width:number;height:number}>;
export type FloatingBounds=Readonly<{maxX:number;maxY:number}>;
export type FloatingViewport=Readonly<{width:number;height:number}>;

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function getFloatingBounds(viewport:FloatingViewport,activeSize:FloatingSize):FloatingBounds{
  return {
    maxX:Math.max(8,viewport.width-activeSize.width-8),
    maxY:Math.max(56,viewport.height-activeSize.height-86),
  };
}

export function clampFloatingPoint(point:FloatingPoint,bounds:FloatingBounds):FloatingPoint{
  return {
    x:clamp(point.x,8,bounds.maxX),
    y:clamp(point.y,56,bounds.maxY),
  };
}

export function snapFloatingPoint(point:FloatingPoint,bounds:FloatingBounds,edgeSnap:boolean):FloatingPoint{
  const clamped=clampFloatingPoint(point,bounds);
  if(!edgeSnap)return clamped;
  return {...clamped,x:clamped.x<=bounds.maxX/2?8:bounds.maxX};
}

export function clampFloatingPanelSize(size:FloatingSize,viewport:FloatingViewport):FloatingSize{
  const maxWidth=Math.max(280,viewport.width-16);
  const maxHeight=Math.max(300,viewport.height-130);
  return {
    width:clamp(size.width,280,maxWidth),
    height:clamp(size.height,300,maxHeight),
  };
}
