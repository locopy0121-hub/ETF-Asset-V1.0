export type WidgetSizePreset='small'|'medium'|'large';
export type WidgetTemplate='asset-summary'|'quote-board'|'quote-chart'|'compact';
export type WidgetField='totalAssets'|'marketValue'|'todayPnl'|'totalPnl'|'symbol'|'name'|'price'|'changePct'|'holdingPnl'|'updatedAt';
export type WidgetTapAction='openApp'|'openPortfolio'|'refresh';

export type WidgetConfig={
  enabled:boolean;
  size:WidgetSizePreset;
  template:WidgetTemplate;
  fields:WidgetField[];
  opacity:number;
  fontScale:number;
  positiveColor:string;
  negativeColor:string;
  tapAction:WidgetTapAction;
  refreshMinutes:number;
  selectedSymbols:string[];
};

export const DEFAULT_WIDGET_CONFIG:WidgetConfig={
  enabled:true,
  size:'medium',
  template:'quote-board',
  fields:['symbol','name','price','changePct','holdingPnl','updatedAt'],
  opacity:92,
  fontScale:100,
  positiveColor:'#E5484D',
  negativeColor:'#16A36A',
  tapAction:'openApp',
  refreshMinutes:15,
  selectedSymbols:[],
};

export const WIDGET_CONTROL_SECTIONS=[
  {key:'size',label:'尺寸'},
  {key:'template',label:'模板'},
  {key:'fields',label:'顯示欄位'},
  {key:'appearance',label:'外觀'},
  {key:'tap',label:'點擊行為'},
  {key:'update',label:'更新摘要'},
] as const;
