import type { SharedSnapshot } from '../domain/snapshot';
import { DEFAULT_HOLDING_WALL_CONFIG, type HoldingWallConfig } from '../domain/uiModels';

export type MonitorMode = 'normal' | 'mini';
export type MonitorTemplate = 'portfolio' | 'quotes' | 'compact' | 'single' | 'dual' | 'advanced' | 'market-wall' | 'heatmap' | 'pnl-wall' | 'weight-wall' | 'ticker' | 'terminal';
export type MonitorField = 'symbol' | 'name' | 'price' | 'change' | 'changePercent' | 'shares' | 'avgCost' | 'marketValue' | 'pnl' | 'roi' | 'comprehensivePnl' | 'marketStatus' | 'updatedAt';
export type MonitorSortKey = 'manual' | 'symbol' | 'price' | 'changePercent';
export type MonitorEffect = 'none' | 'fade' | 'pulse' | 'flash-on-change';
export type MonitorTextAlign = 'left' | 'center' | 'right';

export type MiniHeaderStyle = Readonly<{
  visible:boolean;
  height:number;
  backgroundColor:string;
  backgroundOpacity:number;
  textColor:string;
  fontScale:number;
  borderColor:string;
  borderWidth:number;
}>;

export type MiniColumnConfig = Readonly<{
  field:MonitorField;
  enabled:boolean;
  widthPercent:number;
  align:MonitorTextAlign;
  fontScale:number;
  useProfitColor:boolean;
  label:string;
}>;

export type MonitorLayout = Readonly<{x:number;y:number;width:number;height:number;}>;
export type MonitorStyle = Readonly<{
  fontScale:number;
  titleFontScale:number;
  valueFontScale:number;
  backgroundColor:string;
  textColor:string;
  secondaryTextColor:string;
  gainColor:string;
  lossColor:string;
  neutralColor:string;
  backgroundOpacity:number;
  borderColor:string;
  borderWidth:number;
  cornerRadius:number;
  shadowEnabled:boolean;
  textAlign:MonitorTextAlign;
  rowGap:number;
  padding:number;
}>;
export type MonitorEffects=Readonly<{
  refresh:MonitorEffect;
  gain:MonitorEffect;
  loss:MonitorEffect;
  alert:MonitorEffect;
  animationsEnabled:boolean;
}>;
export type MonitorSort=Readonly<{
  key:MonitorSortKey;
  direction:'asc'|'desc';
  manualSymbols:readonly string[];
}>;

export type MonitorConfig = Readonly<{
  enabled: boolean;
  mode: MonitorMode;
  template: MonitorTemplate;
  fields: readonly MonitorField[];
  miniFields: readonly MonitorField[];
  selectedSymbols: readonly string[];
  showBreathingLight: boolean;
  alertChangePct: number | null;
  normalLayout: MonitorLayout;
  miniLayout: MonitorLayout;
  normalStyle: MonitorStyle;
  miniStyle: MonitorStyle;
  miniHeader: MiniHeaderStyle;
  miniColumns: readonly MiniColumnConfig[];
  normalWall: HoldingWallConfig;
  effects: MonitorEffects;
  sort: MonitorSort;
  alwaysOnTop:boolean;
}>;

export type MonitorRuntimeState = Readonly<{
  marketState: 'live' | 'afterHours' | 'offline';
  lastUpdatedAt: string | null;
  breathing: boolean;
  alertingSymbols: readonly string[];
}>;

export type MonitorViewModel = Readonly<{
  config: MonitorConfig;
  snapshot: SharedSnapshot | null;
  runtime: MonitorRuntimeState;
}>;

export const DEFAULT_MONITOR_STYLE:MonitorStyle={
  fontScale:1,titleFontScale:1,valueFontScale:1,
  backgroundColor:'#0F172A',textColor:'#FFFFFF',secondaryTextColor:'#CBD5E1',
  gainColor:'#EF4444',lossColor:'#10B981',neutralColor:'#94A3B8',
  backgroundOpacity:0.92,borderColor:'#334155',borderWidth:1,cornerRadius:16,
  shadowEnabled:true,textAlign:'left',rowGap:6,padding:12,
};
export const DEFAULT_MONITOR_EFFECTS:MonitorEffects={refresh:'fade',gain:'none',loss:'none',alert:'pulse',animationsEnabled:true};
export const DEFAULT_MINI_HEADER:MiniHeaderStyle={
  visible:true,
  height:30,
  backgroundColor:'#111827',
  backgroundOpacity:0.96,
  textColor:'#CBD5E1',
  fontScale:0.9,
  borderColor:'#334155',
  borderWidth:1,
};
export const DEFAULT_MINI_COLUMNS:readonly MiniColumnConfig[]=[
  {field:'symbol',enabled:true,widthPercent:22,align:'left',fontScale:1,useProfitColor:false,label:'代號'},
  {field:'name',enabled:false,widthPercent:28,align:'left',fontScale:.9,useProfitColor:false,label:'名稱'},
  {field:'price',enabled:true,widthPercent:22,align:'right',fontScale:1,useProfitColor:false,label:'價格'},
  {field:'change',enabled:false,widthPercent:18,align:'right',fontScale:1,useProfitColor:true,label:'漲跌'},
  {field:'changePercent',enabled:true,widthPercent:20,align:'right',fontScale:1,useProfitColor:true,label:'漲跌%'},
  {field:'shares',enabled:false,widthPercent:18,align:'right',fontScale:1,useProfitColor:false,label:'股數'},
  {field:'avgCost',enabled:false,widthPercent:20,align:'right',fontScale:1,useProfitColor:false,label:'成本均'},
  {field:'marketValue',enabled:false,widthPercent:24,align:'right',fontScale:1,useProfitColor:false,label:'市值'},
  {field:'pnl',enabled:true,widthPercent:20,align:'right',fontScale:1,useProfitColor:true,label:'損益'},
  {field:'roi',enabled:false,widthPercent:20,align:'right',fontScale:1,useProfitColor:true,label:'報酬%'},
  {field:'comprehensivePnl',enabled:false,widthPercent:24,align:'right',fontScale:1,useProfitColor:true,label:'含息損益'},
  {field:'marketStatus',enabled:false,widthPercent:18,align:'center',fontScale:.9,useProfitColor:false,label:'狀態'},
  {field:'updatedAt',enabled:false,widthPercent:26,align:'right',fontScale:.85,useProfitColor:false,label:'更新'},
];
export const DEFAULT_MONITOR_SORT:MonitorSort={key:'manual',direction:'asc',manualSymbols:[]};

export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  enabled: false,
  mode: 'normal',
  template: 'portfolio',
  fields: ['symbol', 'price', 'changePercent', 'pnl'],
  miniFields: ['symbol', 'price', 'changePercent'],
  selectedSymbols: [],
  showBreathingLight: true,
  alertChangePct: null,
  normalLayout: { x: 16, y: 120, width: 320, height: 420 },
  miniLayout: { x: 16, y: 120, width: 360, height: 330 },
  normalStyle:DEFAULT_MONITOR_STYLE,
  miniStyle:{...DEFAULT_MONITOR_STYLE,fontScale:0.9,titleFontScale:0.9,valueFontScale:0.95,padding:6,rowGap:2,cornerRadius:12},
  miniHeader:DEFAULT_MINI_HEADER,
  miniColumns:DEFAULT_MINI_COLUMNS,
  normalWall:DEFAULT_HOLDING_WALL_CONFIG,
  effects:DEFAULT_MONITOR_EFFECTS;
  sort:DEFAULT_MONITOR_SORT,
  alwaysOnTop:true,
};

export function activeMonitorLayout(config: MonitorConfig) {return config.mode === 'normal' ? config.normalLayout : config.miniLayout;}
export function activeMonitorStyle(config:MonitorConfig){return config.mode==='normal'?config.normalStyle:config.miniStyle;}
export function activeMonitorFields(config: MonitorConfig) {return config.mode === 'normal' ? config.fields : config.miniFields;}
export function enabledMiniColumns(config:MonitorConfig){return config.miniColumns.filter(column=>column.enabled);}
export function updateMiniHeader(config:MonitorConfig,patch:Partial<MiniHeaderStyle>):MonitorConfig{
  return {...config,miniHeader:{...config.miniHeader,...patch}};
}
export function updateMiniColumn(config:MonitorConfig,field:MonitorField,patch:Partial<MiniColumnConfig>):MonitorConfig{
  return {...config,miniColumns:config.miniColumns.map(column=>column.field===field?{...column,...patch}:column)};
}
export function moveMiniColumn(config:MonitorConfig,field:MonitorField,delta:number):MonitorConfig{
  const columns=[...config.miniColumns];
  const index=columns.findIndex(column=>column.field===field);
  const target=index+delta;
  if(index<0||target<0||target>=columns.length)return config;
  const current=columns[index]!;
  const next=columns[target]!;
  columns[index]=next;
  columns[target]=current;
  return {...config,miniColumns:columns};
}
export function setMonitorMode(config: MonitorConfig, mode: MonitorMode): MonitorConfig {return { ...config, mode };}
export function restoreNormalMonitor(config: MonitorConfig): MonitorConfig {return { ...config, mode: 'normal' };}

export function updateActiveMonitorLayout(config:MonitorConfig,patch:Partial<MonitorLayout>):MonitorConfig{
  return config.mode==='normal'?{...config,normalLayout:{...config.normalLayout,...patch}}:{...config,miniLayout:{...config.miniLayout,...patch}};
}
export function updateActiveMonitorStyle(config:MonitorConfig,patch:Partial<MonitorStyle>):MonitorConfig{
  return config.mode==='normal'?{...config,normalStyle:{...config.normalStyle,...patch}}:{...config,miniStyle:{...config.miniStyle,...patch}};
}
export function updateMonitorFields(config:MonitorConfig,fields:readonly MonitorField[]):MonitorConfig{
  return config.mode==='normal'?{...config,fields:[...fields]}:{...config,miniFields:[...fields]};
}
export function updateMonitorWall(config:MonitorConfig,wall:HoldingWallConfig):MonitorConfig{return {...config,normalWall:wall};}
export function sortMonitorHoldings(snapshot:SharedSnapshot|null,config:MonitorConfig){
  if(!snapshot)return [];
  const rows=config.selectedSymbols.length?snapshot.holdings.filter(x=>config.selectedSymbols.includes(x.symbol)):[...snapshot.holdings];
  const d=config.sort.direction==='desc'?-1:1;
  if(config.sort.key==='manual'){
    const rank=new Map(config.sort.manualSymbols.map((s,i)=>[s,i]));
    return rows.sort((a,b)=>(rank.get(a.symbol)??Number.MAX_SAFE_INTEGER)-(rank.get(b.symbol)??Number.MAX_SAFE_INTEGER));
  }
  if(config.sort.key==='symbol')return rows.sort((a,b)=>a.symbol.localeCompare(b.symbol)*d);
  if(config.sort.key==='price')return rows.sort((a,b)=>((a.price??-Infinity)-(b.price??-Infinity))*d);
  return rows.sort((a,b)=>((a.changePercent??-Infinity)-(b.changePercent??-Infinity))*d);
}

export function createMonitorRuntimeState(snapshot:SharedSnapshot|null,input:{marketState?:MonitorRuntimeState['marketState'];refreshing?:boolean}={},config:MonitorConfig=DEFAULT_MONITOR_CONFIG):MonitorRuntimeState{
  const threshold=config.alertChangePct;
  const alertingSymbols=threshold==null||!snapshot?[]:snapshot.holdings.filter(row=>Number.isFinite(row.changePercent)&&Math.abs(row.changePercent??0)>=threshold).map(row=>row.symbol);
  return {marketState:input.marketState??'offline',lastUpdatedAt:snapshot?.generatedAt??null,breathing:config.showBreathingLight&&input.refreshing===true,alertingSymbols};
}
export function createMonitorViewModel(snapshot:SharedSnapshot|null,config:MonitorConfig=DEFAULT_MONITOR_CONFIG,runtimeInput:{marketState?:MonitorRuntimeState['marketState'];refreshing?:boolean}={}):MonitorViewModel{
  return {snapshot,config,runtime:createMonitorRuntimeState(snapshot,runtimeInput,config)};
}
