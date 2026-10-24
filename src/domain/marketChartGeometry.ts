import type {DailyCandle} from '../market/twseDailyHistory';
/** Pure chart geometry: 1 point per official closing-price observation. */
export function marketPricePath(input:readonly DailyCandle[],step:number,offset:number,height:number,topMargin=4){
  if(!Number.isFinite(step)||step<=0||!Number.isFinite(height)||height<=0)return null;
  const candles=[...input].filter(x=>Number.isFinite(x.close)&&x.close>0);
  if(candles.length!==input.length||candles.length<2)return null;
  const upper=Math.max(...candles.map(x=>x.high)),lower=Math.min(...candles.map(x=>x.low));
  if(!Number.isFinite(upper)||!Number.isFinite(lower)||upper<lower||lower<=0)return null;
  const buffer=Math.max((upper-lower)*.08,.01),yMax=upper+buffer,yMin=Math.max(0,lower-buffer);
  const axisRange=Math.max(.01,yMax-yMin),maxY=height-topMargin;
  const points=candles.map((x,i)=>({
    x:offset+i*step+step/2,
    y:topMargin+(yMax-x.close)/axisRange*(height-topMargin*2)
  }));
  const line=points.map(p=>p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ');
  const area=points[0]!.x.toFixed(2)+','+maxY.toFixed(2)+' '+line+' '+
    points[points.length-1]!.x.toFixed(2)+','+maxY.toFixed(2);
  return {line,area,points,count:points.length,low:yMin,high:yMax};
}
