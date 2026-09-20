export type MonitorLayout={x:number;y:number;width:number;height:number};
export type MonitorTemplate='quote-list'|'quote-chart'|'compact'|'portfolio-summary';
export type MonitorField='symbol'|'name'|'price'|'change'|'changePct'|'shares'|'marketValue'|'holdingPnl'|'roi'|'updatedAt';
export type MonitorTapAction='none'|'refresh'|'toggleMini'|'openApp';

export type FloatingMonitorConfig={
  enabled:boolean;
  normalLayout:MonitorLayout;
  miniLayout:MonitorLayout;
  isMinimized:boolean;
  locked:boolean;
  template:MonitorTemplate;
  fields:MonitorField[];
  selectedSymbols:string[];
  opacity:number;
  fontScale:number;
  positiveColor:string;
  negativeColor:string;
  refreshSeconds:number;
  tapAction:MonitorTapAction;
  doubleTapAction:'restore-normal'|'none';
  snapToEdge:boolean;
  showBreathingLight:boolean;
};

export const DEFAULT_MONITOR_CONFIG:FloatingMonitorConfig={
  enabled:false,
  normalLayout:{x:24,y:160,width:360,height:240},
  miniLayout:{x:24,y:160,width:148,height:56},
  isMinimized:false,
  locked:false,
  template:'quote-list',
  fields:['symbol','price','changePct','holdingPnl','updatedAt'],
  selectedSymbols:[],
  opacity:92,
  fontScale:100,
  positiveColor:'#E5484D',
  negativeColor:'#16A36A',
  refreshSeconds:5,
  tapAction:'refresh',
  doubleTapAction:'restore-normal',
  snapToEdge:true,
  showBreathingLight:true,
};

export function updateActiveLayout(config:FloatingMonitorConfig,next:Partial<MonitorLayout>):FloatingMonitorConfig{
  if(config.locked)return config;
  if(config.isMinimized){
    return {...config,miniLayout:{...config.miniLayout,...next}};
  }
  return {...config,normalLayout:{...config.normalLayout,...next}};
}

export function toggleMonitorMode(config:FloatingMonitorConfig):FloatingMonitorConfig{
  return {...config,isMinimized:!config.isMinimized};
}

export const MONITOR_CONTROL_SECTIONS=[
  {key:'size',label:'視窗尺寸'},
  {key:'template',label:'模板'},
  {key:'fields',label:'顯示欄位'},
  {key:'appearance',label:'外觀'},
  {key:'tap',label:'點擊行為'},
  {key:'update',label:'更新摘要'},
  {key:'floating',label:'浮動行為'},
] as const;
