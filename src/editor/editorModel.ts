import { PAGE_FRAMES } from '../domain/frameRegistry';
import type { MainPageKey } from '../domain/pageRegistry';
import { DEFAULT_HOLDING_WALL_CONFIG, type HoldingSortKey, type HoldingWallConfig, type HoldingWallFieldConfig, type HoldingWallFieldKey, type QuoteModuleStyle } from '../domain/uiModels';
import { DEFAULT_ITEM_EFFECT, ITEM_EFFECT_INTENSITIES, ITEM_EFFECT_KINDS, ITEM_EFFECT_SPEEDS, ITEM_EFFECT_TRIGGERS, type ItemEffectConfig } from '../domain/displayItemContract';

export type FrameLayout = 'standard' | 'compact' | 'dense';
export type FrameAppearance = 'theme' | 'soft' | 'outline';
export type FrameBehavior = 'manual' | 'auto' | 'locked';
export type PortfolioViewMode = 'list' | 'wall';
export type HoldingLayoutMode = 'list' | 'grid2' | 'grid3' | 'horizontal' | 'paged2';

export type DashboardMetricKey = 'totalMarketValue'|'totalPnl'|'totalUnrealizedProfit'|'realizedNetPnL'|'totalDividendsReceived'|'cashBalance'|'holdingCount';
export type DashboardChartStyle = 'line'|'area'|'bar'|'horizontalBar'|'stackedBar'|'pie'|'donut'|'allocation'|'pnlTrend'|'dividendTrend'|'investVsValue'|'holdingWeight'|'costVsPrice'|'roiTrend'|'priceK'|'volume';
export type DashboardChartSource = 'allocation'|'pnl'|'dividend'|'roi'|'marketValue'|'avgCost'|'price'|'shares'|'realizedPnl'|'comprehensivePnl'|'transactions';
export type ChartBorderStyle='solid'|'dashed'|'dotted';
export type TextAlign='left'|'center'|'right';
export type DashboardChartConfig = Readonly<{
  id:string;
  title:string;
  visible:boolean;
  style:DashboardChartStyle;
  source:DashboardChartSource;
  x:number;
  y:number;
  width:number;
  height:number;
  zIndex:number;
  locked:boolean;
  aspectLocked:boolean;
  backgroundColor:string;
  backgroundOpacity:number;
  textColor:string;
  accentColor:string;
  gainColor:string;
  lossColor:string;
  flatColor:string;
  opacity:number;
  contentOpacity:number;
  borderColor:string;
  borderWidth:number;
  borderStyle:ChartBorderStyle;
  borderRadius:number;
  shadowEnabled:boolean;
  shadowOpacity:number;
  padding:number;
  titleFontSize:number;
  titleAlign:TextAlign;
  lineWidth:number;
  showPoints:boolean;
  pointSize:number;
  legendVisible:boolean;
  xAxisVisible:boolean;
  yAxisVisible:boolean;
  gridVisible:boolean;
  tooltipEnabled:boolean;
  dataLabels:boolean;
  crosshairEnabled:boolean;
  pinchZoomEnabled:boolean;
  panEnabled:boolean;
  doubleTapReset:boolean;
  rememberZoom:boolean;
  touchThrough:boolean;
  zoomMin:number;
  zoomMax:number;
}>;

export const DEFAULT_DASHBOARD_METRICS:readonly DashboardMetricKey[]=['totalMarketValue','totalPnl','totalUnrealizedProfit','realizedNetPnL','totalDividendsReceived','cashBalance','holdingCount'];
export const DEFAULT_DASHBOARD_CHARTS:readonly DashboardChartConfig[]=[{
  id:'allocation-main',title:'資產配置',visible:true,style:'donut',source:'allocation',x:-1,y:48,width:160,height:140,zIndex:10,locked:false,aspectLocked:false,
  backgroundColor:'#FFFFFF',backgroundOpacity:1,textColor:'#0F172A',accentColor:'#0066FF',gainColor:'#10B981',lossColor:'#EF4444',flatColor:'#64748B',opacity:1,contentOpacity:1,
  borderColor:'#0066FF',borderWidth:1,borderStyle:'solid',borderRadius:16,shadowEnabled:false,shadowOpacity:.18,padding:10,titleFontSize:12,titleAlign:'left',
  lineWidth:2,showPoints:true,pointSize:4,legendVisible:true,xAxisVisible:true,yAxisVisible:true,gridVisible:true,tooltipEnabled:true,dataLabels:false,crosshairEnabled:true,
  pinchZoomEnabled:true,panEnabled:true,doubleTapReset:true,rememberZoom:true,touchThrough:false,zoomMin:1,zoomMax:8,
}];

export type FrameEditorConfig = Readonly<{
  visible:boolean;
  order:number;
  layout:FrameLayout;
  appearance:FrameAppearance;
  behavior:FrameBehavior;
  titleFontSize:number;
  titleColor:string;
  titleAlign:TextAlign;
  backgroundColor:string;
  backgroundOpacity:number;
  borderColor:string;
  borderWidth:number;
  borderRadius:number;
  shadowEnabled:boolean;
  shadowOpacity:number;
}>;

export type PageEditorState = Readonly<Record<MainPageKey, Readonly<Record<string, FrameEditorConfig>>>>;

export type PageDisplayConfig = Readonly<{
  quoteStyle?: QuoteModuleStyle;
  sortKey?: HoldingSortKey;
  portfolioViewMode?: PortfolioViewMode;
  holdingLayoutMode?: HoldingLayoutMode;
  holdingWall?: HoldingWallConfig;
  newsVisibleCount?: number;
  newsHoldingsOnly?: boolean;
  dashboardMetrics?: readonly DashboardMetricKey[];
  dashboardCharts?: readonly DashboardChartConfig[];
}>;

export type PageDisplayState = Readonly<Record<MainPageKey, PageDisplayConfig>>;

export const makePageConfig = (page: MainPageKey): Record<string, FrameEditorConfig> =>
  Object.fromEntries(PAGE_FRAMES[page].map((frame, index) => [
    frame.key,
    {visible:true,order:index,layout:'standard',appearance:'theme',behavior:'manual',titleFontSize:17,titleColor:'#0F172A',titleAlign:'left',backgroundColor:'#FFFFFF',backgroundOpacity:1,borderColor:'#E2E8F0',borderWidth:1,borderRadius:16,shadowEnabled:false,shadowOpacity:.12} satisfies FrameEditorConfig,
  ]));

export function createInitialEditorState(): PageEditorState {
  return {
    home: makePageConfig('home'),
    ledger: makePageConfig('ledger'),
    portfolio: makePageConfig('portfolio'),
    dividend: makePageConfig('dividend'),
    ai: makePageConfig('ai'),
    settings: makePageConfig('settings'),
  };
}

export function createInitialDisplayState(): PageDisplayState {
  return {
    home: { quoteStyle:'quote', sortKey:'pnl', holdingLayoutMode:'grid2', holdingWall:DEFAULT_HOLDING_WALL_CONFIG, newsVisibleCount:5, newsHoldingsOnly:true, dashboardMetrics:DEFAULT_DASHBOARD_METRICS, dashboardCharts:DEFAULT_DASHBOARD_CHARTS },
    ledger: {},
    portfolio: { quoteStyle:'chart', sortKey:'manual', portfolioViewMode:'list', holdingLayoutMode:'list', holdingWall:DEFAULT_HOLDING_WALL_CONFIG },
    dividend: {},
    ai: { newsVisibleCount:10, newsHoldingsOnly:true },
    settings: {},
  };
}

const isFrameLayout=(v:unknown):v is FrameLayout=>v==='standard'||v==='compact'||v==='dense';
const isFrameAppearance=(v:unknown):v is FrameAppearance=>v==='theme'||v==='soft'||v==='outline';
const isFrameBehavior=(v:unknown):v is FrameBehavior=>v==='manual'||v==='auto'||v==='locked';

const HOLDING_WALL_FIELDS:readonly HoldingWallFieldKey[]=['name','symbol','price','change','changePercent','pnl','roi','marketValue'];
const clamp=(value:unknown,min:number,max:number,fallback:number)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
const wallColor=(value:unknown,fallback:string)=>typeof value==='string'&&/^#[0-9A-Fa-f]{6}$/.test(value)?value.toUpperCase():fallback;
const wallNullableColor=(value:unknown,fallback:string|null)=>value===undefined?fallback:value===null?null:typeof value==='string'&&/^#[0-9A-Fa-f]{6}$/.test(value)?value.toUpperCase():fallback;
const normalizeWallEffect=(raw:unknown,fallback:ItemEffectConfig=DEFAULT_ITEM_EFFECT):ItemEffectConfig=>{
  const effect=(raw&&typeof raw==='object'?raw:{}) as Partial<ItemEffectConfig>;
  return {
    kind:ITEM_EFFECT_KINDS.includes(effect.kind as ItemEffectConfig['kind'])?effect.kind as ItemEffectConfig['kind']:fallback.kind,
    trigger:ITEM_EFFECT_TRIGGERS.includes(effect.trigger as ItemEffectConfig['trigger'])?(effect.trigger==='alert'?'change':effect.trigger as ItemEffectConfig['trigger']):fallback.trigger,
    speed:ITEM_EFFECT_SPEEDS.includes(effect.speed as ItemEffectConfig['speed'])?effect.speed as ItemEffectConfig['speed']:fallback.speed,
    intensity:ITEM_EFFECT_INTENSITIES.includes(effect.intensity as ItemEffectConfig['intensity'])?effect.intensity as ItemEffectConfig['intensity']:fallback.intensity,
  };
};
const normalizeHoldingWall=(raw:unknown):HoldingWallConfig=>{
  const source=(raw&&typeof raw==='object'?raw:{}) as Partial<HoldingWallConfig>;
  const header=(source.header??{}) as Partial<HoldingWallConfig['header']>;
  const style=(source.style??{}) as Partial<HoldingWallConfig['style']>;
  const rawFields=Array.isArray(source.fields)?source.fields:[];
  const rawFieldKeys=rawFields.map(field=>(field as Partial<HoldingWallFieldConfig>).field);
  const legacyWrongWall=rawFieldKeys.join(',')==='name,symbol,price,change,changePercent,pnl,roi,marketValue'
    &&rawFields.every(field=>{
      const f=field as Partial<HoldingWallFieldConfig>;
      if(f.field==='marketValue')return f.enabled===false;
      return f.enabled!==false;
    });
  const normalizedSourceFields=legacyWrongWall?DEFAULT_HOLDING_WALL_CONFIG.fields:rawFields;
  const fieldMap=new Map(normalizedSourceFields.map(field=>[(field as Partial<HoldingWallFieldConfig>).field,field as Partial<HoldingWallFieldConfig>]));
  const fields=DEFAULT_HOLDING_WALL_CONFIG.fields.map((fallback):HoldingWallFieldConfig=>{
    const candidate=fieldMap.get(fallback.field);
    return {
      field:fallback.field,
      enabled:candidate?.enabled??fallback.enabled,
      label:typeof candidate?.label==='string'&&candidate.label.trim()?candidate.label.trim().slice(0,12):fallback.label,
      fontScale:clamp(candidate?.fontScale,.7,1.8,fallback.fontScale),
      align:candidate?.align==='left'||candidate?.align==='center'||candidate?.align==='right'?candidate.align:fallback.align,
      useProfitColor:candidate?.useProfitColor??fallback.useProfitColor,
      useProfitBackground:candidate?.useProfitBackground===true,
      textColor:wallNullableColor(candidate?.textColor,fallback.textColor),
      backgroundColor:wallNullableColor(candidate?.backgroundColor,fallback.backgroundColor),
      lineGap:candidate?.lineGap==null?fallback.lineGap:clamp(candidate.lineGap,0,32,fallback.lineGap??0),
      paddingY:clamp(candidate?.paddingY,0,16,fallback.paddingY),
      effect:normalizeWallEffect(candidate?.effect,fallback.effect),
    };
  }).filter(field=>HOLDING_WALL_FIELDS.includes(field.field));
  return {
    header:{
      visible:header.visible??DEFAULT_HOLDING_WALL_CONFIG.header.visible,
      fontScale:clamp(header.fontScale,.7,1.8,DEFAULT_HOLDING_WALL_CONFIG.header.fontScale),
      backgroundColor:wallColor(header.backgroundColor,DEFAULT_HOLDING_WALL_CONFIG.header.backgroundColor),
      textColor:wallColor(header.textColor,DEFAULT_HOLDING_WALL_CONFIG.header.textColor),
      borderColor:wallColor(header.borderColor,DEFAULT_HOLDING_WALL_CONFIG.header.borderColor),
      borderWidth:clamp(header.borderWidth,0,4,DEFAULT_HOLDING_WALL_CONFIG.header.borderWidth),
      effect:normalizeWallEffect(header.effect,DEFAULT_HOLDING_WALL_CONFIG.header.effect),
    },
    fields,
    style:{
      backgroundColor:wallColor(style.backgroundColor,DEFAULT_HOLDING_WALL_CONFIG.style.backgroundColor),
      textColor:wallColor(style.textColor,DEFAULT_HOLDING_WALL_CONFIG.style.textColor),
      secondaryTextColor:wallColor(style.secondaryTextColor,DEFAULT_HOLDING_WALL_CONFIG.style.secondaryTextColor),
      gainColor:wallColor(style.gainColor,DEFAULT_HOLDING_WALL_CONFIG.style.gainColor),
      lossColor:wallColor(style.lossColor,DEFAULT_HOLDING_WALL_CONFIG.style.lossColor),
      borderColor:wallColor(style.borderColor,DEFAULT_HOLDING_WALL_CONFIG.style.borderColor),
      borderWidth:clamp(style.borderWidth,0,6,DEFAULT_HOLDING_WALL_CONFIG.style.borderWidth),
      cornerRadius:clamp(style.cornerRadius,0,40,DEFAULT_HOLDING_WALL_CONFIG.style.cornerRadius),
      padding:clamp(style.padding,0,32,DEFAULT_HOLDING_WALL_CONFIG.style.padding),
      rowGap:clamp(style.rowGap,0,24,DEFAULT_HOLDING_WALL_CONFIG.style.rowGap),
    },
  };
};


const DASHBOARD_METRICS:readonly DashboardMetricKey[]=['totalMarketValue','totalPnl','totalUnrealizedProfit','realizedNetPnL','totalDividendsReceived','cashBalance','holdingCount'];
const DASHBOARD_STYLES:readonly DashboardChartStyle[]=['line','area','bar','horizontalBar','stackedBar','pie','donut','allocation','pnlTrend','dividendTrend','investVsValue','holdingWeight','costVsPrice','roiTrend','priceK','volume'];
const DASHBOARD_SOURCES:readonly DashboardChartSource[]=['allocation','pnl','dividend','roi','marketValue','avgCost','price','shares','realizedPnl','comprehensivePnl','transactions'];
const normalizeDashboardMetrics=(raw:unknown):readonly DashboardMetricKey[]=>{
  const values=Array.isArray(raw)?raw.filter((x):x is DashboardMetricKey=>DASHBOARD_METRICS.includes(x as DashboardMetricKey)):[];
  return values.length?Array.from(new Set(values)):DEFAULT_DASHBOARD_METRICS;
};
const normalizeDashboardCharts=(raw:unknown):readonly DashboardChartConfig[]=>{
  const values=Array.isArray(raw)?raw:[];
  const normalized=values.slice(0,8).map((item,index)=>{
    const source=(item&&typeof item==='object'?item:{}) as Partial<DashboardChartConfig>;
    const fallback=DEFAULT_DASHBOARD_CHARTS[0]!;
    const legacyMain=source.id==='allocation-main'&&Number(source.x)===8&&Number(source.y)===8&&Number(source.width)===210&&Number(source.height)===180;
    const nextX=legacyMain?-1:source.x;
    const nextY=legacyMain?48:source.y;
    const nextWidth=legacyMain?160:source.width;
    const nextHeight=legacyMain?140:source.height;
    return {
      id:typeof source.id==='string'&&source.id.trim()?source.id.slice(0,40):`chart-${index+1}`,
      title:typeof source.title==='string'&&source.title.trim()?source.title.slice(0,20):fallback.title,
      visible:source.visible!==false,
      style:DASHBOARD_STYLES.includes(source.style as DashboardChartStyle)?source.style as DashboardChartStyle:fallback.style,
      source:DASHBOARD_SOURCES.includes(source.source as DashboardChartSource)?source.source as DashboardChartSource:fallback.source,
      x:nextX===-1?-1:clamp(nextX,0,1200,fallback.x),y:clamp(nextY,0,1600,fallback.y),width:clamp(nextWidth,140,900,fallback.width),height:clamp(nextHeight,120,700,fallback.height),
      zIndex:clamp(source.zIndex,0,99,index+1),locked:source.locked===true,aspectLocked:source.aspectLocked===true,
      backgroundColor:wallColor(source.backgroundColor,fallback.backgroundColor),backgroundOpacity:clamp(source.backgroundOpacity,0,1,fallback.backgroundOpacity),
      textColor:wallColor(source.textColor,fallback.textColor),accentColor:wallColor(source.accentColor,fallback.accentColor),
      gainColor:wallColor(source.gainColor,fallback.gainColor),lossColor:wallColor(source.lossColor,fallback.lossColor),flatColor:wallColor(source.flatColor,fallback.flatColor),
      opacity:clamp(source.opacity,.05,1,fallback.opacity),contentOpacity:clamp(source.contentOpacity,.05,1,fallback.contentOpacity),
      borderColor:wallColor(source.borderColor,fallback.borderColor),borderWidth:clamp(source.borderWidth,0,8,fallback.borderWidth),
      borderStyle:source.borderStyle==='dashed'||source.borderStyle==='dotted'?source.borderStyle:'solid',borderRadius:clamp(source.borderRadius,0,48,fallback.borderRadius),
      shadowEnabled:source.shadowEnabled===true,shadowOpacity:clamp(source.shadowOpacity,0,.8,fallback.shadowOpacity),padding:clamp(source.padding,0,32,fallback.padding),
      titleFontSize:clamp(source.titleFontSize,8,28,fallback.titleFontSize),titleAlign:source.titleAlign==='center'||source.titleAlign==='right'?source.titleAlign:'left',
      lineWidth:clamp(source.lineWidth,1,8,fallback.lineWidth),showPoints:source.showPoints!==false,pointSize:clamp(source.pointSize,2,12,fallback.pointSize),
      legendVisible:source.legendVisible!==false,xAxisVisible:source.xAxisVisible!==false,yAxisVisible:source.yAxisVisible!==false,gridVisible:source.gridVisible!==false,
      tooltipEnabled:source.tooltipEnabled!==false,dataLabels:source.dataLabels===true,crosshairEnabled:source.crosshairEnabled!==false,
      pinchZoomEnabled:source.pinchZoomEnabled!==false,panEnabled:source.panEnabled!==false,doubleTapReset:source.doubleTapReset!==false,rememberZoom:source.rememberZoom!==false,
      touchThrough:source.touchThrough===true,zoomMin:clamp(source.zoomMin,1,4,fallback.zoomMin),zoomMax:clamp(source.zoomMax,2,20,fallback.zoomMax),
    } satisfies DashboardChartConfig;
  });
  return normalized.length?normalized:DEFAULT_DASHBOARD_CHARTS;
};

export function normalizeEditorConfig(
  page: MainPageKey,
  draft: Record<string, FrameEditorConfig>,
): Record<string, FrameEditorConfig> {
  const defaults = makePageConfig(page);
  const normalized: Record<string, FrameEditorConfig> = {};
  PAGE_FRAMES[page].forEach((frame, index) => {
    const fallback=defaults[frame.key]!;
    const candidate = draft[frame.key] ?? fallback;
    normalized[frame.key] = {
      visible: typeof candidate.visible==='boolean'?candidate.visible:fallback.visible,
      order: candidate.behavior === 'auto' ? index : (Number.isFinite(candidate.order)?candidate.order:fallback.order),
      layout: isFrameLayout(candidate.layout)?candidate.layout:fallback.layout,
      appearance: isFrameAppearance(candidate.appearance)?candidate.appearance:fallback.appearance,
      behavior:isFrameBehavior(candidate.behavior)?candidate.behavior:fallback.behavior,
      titleFontSize:clamp(candidate.titleFontSize,10,32,fallback.titleFontSize),titleColor:wallColor(candidate.titleColor,fallback.titleColor),
      titleAlign:candidate.titleAlign==='center'||candidate.titleAlign==='right'?candidate.titleAlign:'left',
      backgroundColor:wallColor(candidate.backgroundColor,fallback.backgroundColor),backgroundOpacity:clamp(candidate.backgroundOpacity,0,1,fallback.backgroundOpacity),
      borderColor:wallColor(candidate.borderColor,fallback.borderColor),borderWidth:clamp(candidate.borderWidth,0,8,fallback.borderWidth),borderRadius:clamp(candidate.borderRadius,0,48,fallback.borderRadius),
      shadowEnabled:candidate.shadowEnabled===true,shadowOpacity:clamp(candidate.shadowOpacity,0,.8,fallback.shadowOpacity),
    };
  });

  const ordered = Object.entries(normalized).sort((a, b) => a[1].order - b[1].order);
  ordered.forEach(([key, value], index) => {
    normalized[key] = { ...value, order: index };
  });
  return normalized;
}

export function mergeEditorState(raw:unknown):PageEditorState{
  const source=(raw&&typeof raw==='object'?raw:{}) as Partial<Record<MainPageKey,Record<string,FrameEditorConfig>>>;
  return {
    home:normalizeEditorConfig('home',source.home??{}),
    ledger:normalizeEditorConfig('ledger',source.ledger??{}),
    portfolio:normalizeEditorConfig('portfolio',source.portfolio??{}),
    dividend:normalizeEditorConfig('dividend',source.dividend??{}),
    ai:normalizeEditorConfig('ai',source.ai??{}),
    settings:normalizeEditorConfig('settings',source.settings??{}),
  };
}

export function mergeDisplayState(raw:unknown):PageDisplayState{
  const defaults=createInitialDisplayState();
  const source=(raw&&typeof raw==='object'?raw:{}) as Partial<Record<MainPageKey,PageDisplayConfig>>;
  const merge=(page:MainPageKey):PageDisplayConfig=>({...defaults[page],...(source[page]??{})});
  const home={...merge('home'),holdingWall:normalizeHoldingWall(source.home?.holdingWall),dashboardMetrics:normalizeDashboardMetrics(source.home?.dashboardMetrics),dashboardCharts:normalizeDashboardCharts(source.home?.dashboardCharts)};
  return {home,ledger:merge('ledger'),portfolio:{...merge('portfolio'),holdingWall:normalizeHoldingWall(source.portfolio?.holdingWall)},dividend:merge('dividend'),ai:merge('ai'),settings:merge('settings')};
}
