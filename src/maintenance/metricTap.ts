/** Only a local presentation state: never navigates or changes portfolio data. */
export type MetricTapAction='none'|'emphasize';
export function nextMetricTapEmphasis(current:boolean,action:MetricTapAction):boolean{
 return action==='emphasize'?!current:false;
}

/** Native metric tap/swipe arbitration: cross the 12dp slop before suppressing tap. */
export type MetricTouchPoint=Readonly<{x:number;y:number}>;
export function metricSwipeExceeded(start:MetricTouchPoint|null,point:MetricTouchPoint,threshold=12):boolean{
 if(!start)return false;
 return Math.abs(point.x-start.x)>threshold||Math.abs(point.y-start.y)>threshold;
}
