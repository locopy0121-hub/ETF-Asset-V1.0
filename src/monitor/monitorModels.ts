import type {HoldingSnapshot} from '../domain/snapshot';
import {DEFAULT_MONITOR_WALL_CONFIG,type MonitorConfig,type MonitorField,type MonitorModelId} from './monitorDomain';

type Model=Readonly<{id:MonitorModelId;label:string;description:string;columns:number;priceScale:number;fields:readonly MonitorField[]}>;
const quote:readonly MonitorField[]=['name','symbol','price','change','changePercent'];
export const MONITOR_MODELS:readonly Model[]=[
 {id:'broker',label:'券商雙欄',description:'灰色標題、大字報價、成交總量與持股市值',columns:2,priceScale:1.25,fields:[...quote,'volume','marketValue']},
 {id:'triple',label:'三欄速覽',description:'三檔並排，快速比較行情與持股損益',columns:3,priceScale:0.8,fields:[...quote,'pnl']},
 {id:'detail',label:'單欄進階',description:'單欄完整持股與行情資料',columns:1,priceScale:1.2,fields:[...quote,'volume','previousClose','shares','avgCost','marketValue','pnl','roi','updatedAt','marketStatus']},
 {id:'large',label:'大字報價',description:'突出最新成交價與漲跌',columns:1,priceScale:2,fields:[...quote,'updatedAt']},
 {id:'compact-holdings',label:'精簡持股',description:'緊湊雙欄，保留股數與持股損益',columns:2,priceScale:0.8,fields:[...quote,'shares','pnl']},
 {id:'volume',label:'成交量觀察',description:'比較成交總量、漲跌與行情時間',columns:2,priceScale:1,fields:[...quote,'volume','previousClose','updatedAt']},
 {id:'reference',label:'昨收對照',description:'最新成交價、昨收與漲跌幅對照',columns:2,priceScale:1.15,fields:[...quote,'previousClose','marketStatus']},
 {id:'cost',label:'成本對照',description:'持股成本、股數與市值',columns:1,priceScale:1.1,fields:[...quote,'avgCost','shares','marketValue','roi']},
 {id:'profit',label:'損益排行',description:'依持股損益由大到小排列',columns:2,priceScale:1,fields:[...quote,'pnl','roi','comprehensivePnl']},
 {id:'allocation',label:'資產權重',description:'依市值排序，顯示持股比重',columns:2,priceScale:0.95,fields:[...quote,'marketValue','weight','shares']},
];

/** Presets affect normal presentation only; quote subscriptions and mini state are preserved. */
export function applyMonitorModel(config:MonitorConfig,id:MonitorModelId):MonitorConfig{
 const model=MONITOR_MODELS.find(row=>row.id===id)!;
 const existing=new Map(config.normalWall.fields.map(field=>[field.field,field]));
 const fields=DEFAULT_MONITOR_WALL_CONFIG.fields.map(fallback=>{
  const item=existing.get(fallback.field)??fallback;
  return {...item,enabled:model.fields.includes(item.field as MonitorField),fontScale:item.field==='price'?model.priceScale:1};
 });
 // Display in preset order, retaining every disabled field and its custom label/color.
 const rank=new Map(model.fields.map((field,index)=>[field,index]));
 fields.sort((a,b)=>(rank.get(a.field as MonitorField)??100)-(rank.get(b.field as MonitorField)??100));
 return {...config,model:id,template:'market-wall',normalWallLayout:{...config.normalWallLayout,columns:model.columns},
  sort:id==='profit'?{...config.sort,key:'pnl',direction:'desc'}:id==='allocation'?{...config.sort,key:'marketValue',direction:'desc'}:config.sort,
  normalWall:{...config.normalWall,header:{...config.normalWall.header,backgroundColor:'#292B2E'},fields,
   style:{...config.normalWall.style,backgroundColor:'#050505',cornerRadius:id==='broker'?0:10,padding:id==='compact-holdings'?5:10,rowGap:id==='compact-holdings'?2:6}}};
}

export function monitorMarketFieldText(row:HoldingSnapshot,field:string):string|null{
 if(field==='volume')return typeof row.volume==='number'&&Number.isFinite(row.volume)&&row.volume>=0?Math.round(row.volume).toLocaleString('zh-TW'):'--';
 if(field==='previousClose')return typeof row.previousClose==='number'&&row.previousClose>0?row.previousClose.toFixed(2):'--';
 if(field==='quoteStatus')return row.quoteStatus??'--';
 return null;
}
