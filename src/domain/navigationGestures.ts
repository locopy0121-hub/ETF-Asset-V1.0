import type {MainPageKey} from './pageRegistry';

export type PageSwipeInput=Readonly<{
  startX:number;startY:number;endX:number;endY:number;screenWidth:number;
  enabled:boolean;threshold:number;edgeOnly:boolean;locked:boolean;
}>;
/** Pure swipe decision: a stored edge preference can reduce conflicts with horizontal content. */
export function resolvePageSwipeDirection(input:PageSwipeInput):-1|1|null{
  const {startX,startY,endX,endY,screenWidth,enabled,threshold,edgeOnly,locked}=input;
  if(!enabled||locked||![startX,startY,endX,endY,screenWidth,threshold].every(Number.isFinite)||screenWidth<=0)return null;
  if(edgeOnly&&startX>32&&startX<screenWidth-32)return null;
  const dx=endX-startX,dy=endY-startY;
  if(Math.abs(dx)<Math.max(50,Math.min(150,threshold))||Math.abs(dx)<Math.abs(dy)*1.8)return null;
  return dx<0?1:-1;
}
export type BackInput=Readonly<{active:MainPageKey;history:readonly MainPageKey[];hasDetail:boolean;floatingExpanded:boolean;showAiTab:boolean}>;
export type BackDecision=Readonly<{kind:'collapse-ai'|'close-detail'|'navigate'|'exit';history:MainPageKey[];page?:MainPageKey}>;
export function resolveBackNavigation({active,history,hasDetail,floatingExpanded,showAiTab}:BackInput):BackDecision{
  const remaining=[...history];
  if(floatingExpanded)return {kind:'collapse-ai',history:remaining};
  if(hasDetail)return {kind:'close-detail',history:remaining};
  while(remaining.length){
    const page=remaining.pop()!;
    if(page!==active&&(page!=='ai'||showAiTab))return {kind:'navigate',page,history:remaining};
  }
  if(active!=='home')return {kind:'navigate',page:'home',history:remaining};
  return {kind:'exit',history:remaining};
}
