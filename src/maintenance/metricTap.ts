/** Only a local presentation state: never navigates or changes portfolio data. */
export type MetricTapAction='none'|'emphasize';
export function nextMetricTapEmphasis(current:boolean,action:MetricTapAction):boolean{
 return action==='emphasize'?!current:false;
}
