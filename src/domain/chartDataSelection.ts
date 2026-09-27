import type {DailyCandle} from '../market/twseDailyHistory';
import type {HoldingQuote} from './uiModels';

export const CHART_DATA_FIELDS=[
 {id:'ohlc',label:'官方日 K',source:'TWSE OHLCV',unit:'元'},
 {id:'close',label:'歷史收盤價',source:'TWSE',unit:'元'},
 {id:'volume',label:'歷史成交量',source:'TWSE',unit:'股'},
 {id:'cost',label:'含費成本均價',source:'正式持股',unit:'元'},
 {id:'marketValue',label:'目前市值',source:'正式持股',unit:'NT$'},
 {id:'pnl',label:'未實現損益',source:'正式持股',unit:'NT$'},
 {id:'dividend',label:'累積淨股息',source:'正式帳務',unit:'NT$'},
] as const;
export type ChartDataField=typeof CHART_DATA_FIELDS[number]['id'];
export type ChartRender='candles'|'line'|'bars';
export const DEFAULT_CHART_DATA:readonly ChartDataField[]=['ohlc'];
export function validChartFields(raw:unknown):ChartDataField[]{
 if(!Array.isArray(raw))return [...DEFAULT_CHART_DATA];
 const allowed=new Set<string>(CHART_DATA_FIELDS.map(field=>field.id));
 const unique=[...new Set(raw.filter((item):item is ChartDataField=>typeof item==='string'&&allowed.has(item)))];
 return unique.length?unique:[...DEFAULT_CHART_DATA];
}
export function officialChartValues(field:ChartDataField,candles:readonly DailyCandle[]){
 const rows=[...candles].filter(c=>[c.open,c.high,c.low,c.close,c.volume].every(Number.isFinite))
  .sort((a,b)=>a.date.localeCompare(b.date));
 return field==='close'?rows.map(row=>({label:row.date.slice(5),value:row.close})):
  field==='volume'?rows.map(row=>({label:row.date.slice(5),value:row.volume})):[];
}
export function holdingChartValue(field:ChartDataField,holding:HoldingQuote):number|null{
 const value=field==='cost'?holding.costAvg:field==='marketValue'?holding.marketValue:
  field==='pnl'?holding.pnl:field==='dividend'?holding.cumulativeDividend:null;
 if(value===null||!Number.isFinite(value))return null;
 if((field==='marketValue'||field==='pnl')&&holding.quoteVerified===false)return null;
 return value;
}
