// V3.0.1: one central catalog for every page. Runtime instances are local to their frame.
export type ComponentKind='frame'|'text'|'divider'|'metric'|'chart'|'quote'|'calendar'|'button'|'image'|'icon'|'tag'|'marquee'|'reminder';
export type ComponentTemplate=Readonly<{
  id:string;kind:ComponentKind;label:string;description:string;category:string;
  installation:'ready'|'adapter-required';defaultText?:string;
}>;
export type MaintenanceInstance=Readonly<{
  id:string;templateId:string; text:string; visible:boolean;
  fontSize:number;color:string; marginTop:number;
}>;
export const CENTRAL_COMPONENT_LIBRARY:readonly ComponentTemplate[]=[
  {id:'text-note',kind:'text',label:'文字備註',description:'可編輯的局部說明文字',category:'文字',installation:'ready',defaultText:'新增文字'},
  {id:'section-label',kind:'text',label:'區域標題',description:'目前框架內的文字標題',category:'文字',installation:'ready',defaultText:'新區域'},
  {id:'divider',kind:'divider',label:'分隔線',description:'分隔目前框架中的資訊',category:'框架',installation:'ready',defaultText:''},
  {id:'metric-tile',kind:'metric',label:'財務數值方塊',description:'需綁定可信帳務只讀欄位',category:'數據',installation:'adapter-required'},
  {id:'official-candle',kind:'chart',label:'官方 OHLCV K 線',description:'需綁定 ETF 與歷史資料來源',category:'圖表',installation:'adapter-required'},
  {id:'quote-module',kind:'quote',label:'ETF 行情模塊',description:'需綁定持股與行情 Runtime',category:'行情',installation:'adapter-required'},
  {id:'dividend-calendar',kind:'calendar',label:'股息月曆',description:'需綁定股息與配發事件',category:'股息',installation:'adapter-required'},
  {id:'action-button',kind:'button',label:'互動按鈕',description:'需配置授權動作與手勢',category:'互動',installation:'adapter-required'},
  {id:'image',kind:'image',label:'圖片',description:'需指定安全圖片來源',category:'視覺',installation:'adapter-required'},
  {id:'icon',kind:'icon',label:'圖示',description:'需指定圖示及點擊行為',category:'視覺',installation:'adapter-required'},
  {id:'etf-badge',kind:'tag',label:'ETF 類型標籤',description:'需綁定可信 ETF 類型',category:'行情',installation:'adapter-required'},
  {id:'quote-marquee',kind:'marquee',label:'行情跑馬燈',description:'需綁定行情與動畫生命週期',category:'行情',installation:'adapter-required'},
  {id:'event-reminder',kind:'reminder',label:'事件提醒',description:'需綁定有來源的事件',category:'通知',installation:'adapter-required'},
];
export const readyComponents=()=>CENTRAL_COMPONENT_LIBRARY.filter(item=>item.installation==='ready');
export function instantiateComponent(templateId:string,id:string):MaintenanceInstance{
  const template=CENTRAL_COMPONENT_LIBRARY.find(item=>item.id===templateId&&item.installation==='ready');
  if(!template)throw new Error('尚未接入可實際安裝的元件：'+templateId);
  return {id,templateId,text:template.defaultText??'',visible:true,fontSize:templateId==='section-label'?17:13,color:'#0F172A',marginTop:6};
}
export function normalizeInstances(input:unknown):MaintenanceInstance[]{
  if(!Array.isArray(input))return [];
  return input.slice(0,30).flatMap((raw:unknown)=>{
    if(!raw||typeof raw!=='object')return [];
    const v=raw as Partial<MaintenanceInstance>;
    if(typeof v.id!=='string'||!v.id||typeof v.templateId!=='string'||!readyComponents().some(t=>t.id===v.templateId))return [];
    const clamp=(x:unknown,min:number,max:number,def:number)=>typeof x==='number'&&Number.isFinite(x)?Math.max(min,Math.min(max,x)):def;
    return [{id:v.id.slice(0,96),templateId:v.templateId,text:String(v.text??'').slice(0,200),visible:v.visible!==false,fontSize:clamp(v.fontSize,10,36,13),color:typeof v.color==='string'&&/^#[0-9a-f]{6}$/i.test(v.color)?v.color:'#0F172A',marginTop:clamp(v.marginTop,0,32,6)}];
  });
}
