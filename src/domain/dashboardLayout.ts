export const DASHBOARD_OVERVIEW_ORDER=['label','amount','caption'] as const;
export type DashboardOverviewItemKey=typeof DASHBOARD_OVERVIEW_ORDER[number];

export const DASHBOARD_KPI_ORDER=['realizedNetPnL','totalPnl','totalUnrealizedProfit','totalMarketValue'] as const;
export type DashboardKpiKey=typeof DASHBOARD_KPI_ORDER[number];

export const DASHBOARD_DETAIL_ORDER=['price','net','realized','total'] as const;
export type DashboardDetailKey=typeof DASHBOARD_DETAIL_ORDER[number];

export const DASHBOARD_QUICK_ORDER=['stock-query','ledger','allocation','dividend'] as const;
export type DashboardQuickKey=typeof DASHBOARD_QUICK_ORDER[number];

export type DashboardContentAlign='left'|'center'|'right';

export type DashboardLayoutConfig=Readonly<{
  sectionGap:number;
  contentPadding:number;
  overview:Readonly<{
    minHeight:number;
    padding:number;
    prefixVisible:boolean;
    captionVisible:boolean;
    decorationVisible:boolean;
    contentGap:number;
    align:DashboardContentAlign;
    labelFontSize:number;
    valueFontSize:number;
    prefixFontSize:number;
    captionFontSize:number;
    labelColor:string;
    valueColor:string;
    prefixColor:string;
    captionColor:string;
    order:readonly DashboardOverviewItemKey[];
  }>;
  profitAnalysis:Readonly<{
    cardGap:number;
    cardHeight:number;
    iconVisible:boolean;
    captionVisible:boolean;
    cardPadding:number;
    align:DashboardContentAlign;
    labelFontSize:number;
    valueFontSize:number;
    captionFontSize:number;
    labelColor:string;
    valueColor:string;
    captionColor:string;
    order:readonly DashboardKpiKey[];
  }>;
  profitDetail:Readonly<{
    itemCount:2|3|4;
    rowHeight:number;
    showMore:boolean;
    rowPaddingHorizontal:number;
    rowGap:number;
    align:DashboardContentAlign;
    labelFontSize:number;
    valueFontSize:number;
    labelColor:string;
    valueColor:string;
    order:readonly DashboardDetailKey[];
  }>;
  quickActions:Readonly<{
    columns:2|4;
    iconSize:number;
    titleVisible:boolean;
    itemPadding:number;
    itemGap:number;
    align:DashboardContentAlign;
    labelFontSize:number;
    labelColor:string;
    iconColor:string;
    order:readonly DashboardQuickKey[];
  }>;
}>;

export const DEFAULT_DASHBOARD_LAYOUT:DashboardLayoutConfig={
  sectionGap:12,
  contentPadding:0,
  overview:{
    minHeight:132,padding:16,prefixVisible:true,captionVisible:true,decorationVisible:true,
    contentGap:4,align:'left',
    labelFontSize:12,valueFontSize:42,prefixFontSize:18,captionFontSize:11,
    labelColor:'#64748B',valueColor:'#0F172A',prefixColor:'#0066FF',captionColor:'#64748B',
    order:DASHBOARD_OVERVIEW_ORDER,
  },
  profitAnalysis:{
    cardGap:10,cardHeight:104,iconVisible:true,captionVisible:true,
    cardPadding:12,align:'left',
    labelFontSize:11,valueFontSize:17,captionFontSize:10,
    labelColor:'#64748B',valueColor:'#0F172A',captionColor:'#64748B',
    order:DASHBOARD_KPI_ORDER,
  },
  profitDetail:{
    itemCount:4,rowHeight:48,showMore:true,rowPaddingHorizontal:12,rowGap:12,align:'left',
    labelFontSize:12,valueFontSize:14,labelColor:'#64748B',valueColor:'#0F172A',
    order:DASHBOARD_DETAIL_ORDER,
  },
  quickActions:{
    columns:4,iconSize:24,titleVisible:true,itemPadding:10,itemGap:5,align:'center',
    labelFontSize:10,labelColor:'#64748B',iconColor:'#0066FF',
    order:DASHBOARD_QUICK_ORDER,
  },
};

const clamp=(value:unknown,min:number,max:number,fallback:number)=>{
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
};
const color=(value:unknown,fallback:string)=>typeof value==='string'&&/^#[0-9A-Fa-f]{6}$/.test(value)?value.toUpperCase():fallback;
const align=(value:unknown,fallback:DashboardContentAlign):DashboardContentAlign=>value==='center'||value==='right'||value==='left'?value:fallback;
function normalizeOrder<T extends string>(raw:unknown,allowed:readonly T[],fallback:readonly T[]):readonly T[]{
  const chosen=Array.isArray(raw)?raw.filter((item):item is T=>typeof item==='string'&&allowed.includes(item as T)):[];
  const unique=Array.from(new Set(chosen));
  return [...unique,...fallback.filter(item=>!unique.includes(item))];
}

export function normalizeDashboardLayout(raw:unknown):DashboardLayoutConfig{
  const source=(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}) as Partial<DashboardLayoutConfig>;
  const overview=(source.overview??{}) as Partial<DashboardLayoutConfig['overview']>;
  const profitAnalysis=(source.profitAnalysis??{}) as Partial<DashboardLayoutConfig['profitAnalysis']>;
  const profitDetail=(source.profitDetail??{}) as Partial<DashboardLayoutConfig['profitDetail']>;
  const quickActions=(source.quickActions??{}) as Partial<DashboardLayoutConfig['quickActions']>;
  const itemCount=clamp(profitDetail.itemCount,2,4,DEFAULT_DASHBOARD_LAYOUT.profitDetail.itemCount);
  return {
    sectionGap:clamp(source.sectionGap,6,32,DEFAULT_DASHBOARD_LAYOUT.sectionGap),
    contentPadding:clamp(source.contentPadding,0,24,DEFAULT_DASHBOARD_LAYOUT.contentPadding),
    overview:{
      minHeight:clamp(overview.minHeight,104,220,DEFAULT_DASHBOARD_LAYOUT.overview.minHeight),
      padding:clamp(overview.padding,8,28,DEFAULT_DASHBOARD_LAYOUT.overview.padding),
      prefixVisible:overview.prefixVisible!==false,
      captionVisible:overview.captionVisible!==false,
      decorationVisible:overview.decorationVisible!==false,
      contentGap:clamp(overview.contentGap,0,24,DEFAULT_DASHBOARD_LAYOUT.overview.contentGap),
      align:align(overview.align,DEFAULT_DASHBOARD_LAYOUT.overview.align),
      labelFontSize:clamp(overview.labelFontSize,8,28,DEFAULT_DASHBOARD_LAYOUT.overview.labelFontSize),
      valueFontSize:clamp(overview.valueFontSize,18,64,DEFAULT_DASHBOARD_LAYOUT.overview.valueFontSize),
      prefixFontSize:clamp(overview.prefixFontSize,10,32,DEFAULT_DASHBOARD_LAYOUT.overview.prefixFontSize),
      captionFontSize:clamp(overview.captionFontSize,8,24,DEFAULT_DASHBOARD_LAYOUT.overview.captionFontSize),
      labelColor:color(overview.labelColor,DEFAULT_DASHBOARD_LAYOUT.overview.labelColor),
      valueColor:color(overview.valueColor,DEFAULT_DASHBOARD_LAYOUT.overview.valueColor),
      prefixColor:color(overview.prefixColor,DEFAULT_DASHBOARD_LAYOUT.overview.prefixColor),
      captionColor:color(overview.captionColor,DEFAULT_DASHBOARD_LAYOUT.overview.captionColor),
      order:normalizeOrder(overview.order,DASHBOARD_OVERVIEW_ORDER,DASHBOARD_OVERVIEW_ORDER),
    },
    profitAnalysis:{
      cardGap:clamp(profitAnalysis.cardGap,6,24,DEFAULT_DASHBOARD_LAYOUT.profitAnalysis.cardGap),
      cardHeight:clamp(profitAnalysis.cardHeight,84,156,DEFAULT_DASHBOARD_LAYOUT.profitAnalysis.cardHeight),
      iconVisible:profitAnalysis.iconVisible!==false,
      captionVisible:profitAnalysis.captionVisible!==false,
      cardPadding:clamp(profitAnalysis.cardPadding,0,28,DEFAULT_DASHBOARD_LAYOUT.profitAnalysis.cardPadding),
      align:align(profitAnalysis.align,DEFAULT_DASHBOARD_LAYOUT.profitAnalysis.align),
      labelFontSize:clamp(profitAnalysis.labelFontSize,8,28,DEFAULT_DASHBOARD_LAYOUT.profitAnalysis.labelFontSize),
      valueFontSize:clamp(profitAnalysis.valueFontSize,10,40,DEFAULT_DASHBOARD_LAYOUT.profitAnalysis.valueFontSize),
      captionFontSize:clamp(profitAnalysis.captionFontSize,8,24,DEFAULT_DASHBOARD_LAYOUT.profitAnalysis.captionFontSize),
      labelColor:color(profitAnalysis.labelColor,DEFAULT_DASHBOARD_LAYOUT.profitAnalysis.labelColor),
      valueColor:color(profitAnalysis.valueColor,DEFAULT_DASHBOARD_LAYOUT.profitAnalysis.valueColor),
      captionColor:color(profitAnalysis.captionColor,DEFAULT_DASHBOARD_LAYOUT.profitAnalysis.captionColor),
      order:normalizeOrder(profitAnalysis.order,DASHBOARD_KPI_ORDER,DASHBOARD_KPI_ORDER),
    },
    profitDetail:{
      itemCount:(Math.round(itemCount) as 2|3|4),
      rowHeight:clamp(profitDetail.rowHeight,40,72,DEFAULT_DASHBOARD_LAYOUT.profitDetail.rowHeight),
      showMore:profitDetail.showMore!==false,
      rowPaddingHorizontal:clamp(profitDetail.rowPaddingHorizontal,0,32,DEFAULT_DASHBOARD_LAYOUT.profitDetail.rowPaddingHorizontal),
      rowGap:clamp(profitDetail.rowGap,0,28,DEFAULT_DASHBOARD_LAYOUT.profitDetail.rowGap),
      align:align(profitDetail.align,DEFAULT_DASHBOARD_LAYOUT.profitDetail.align),
      labelFontSize:clamp(profitDetail.labelFontSize,8,28,DEFAULT_DASHBOARD_LAYOUT.profitDetail.labelFontSize),
      valueFontSize:clamp(profitDetail.valueFontSize,9,32,DEFAULT_DASHBOARD_LAYOUT.profitDetail.valueFontSize),
      labelColor:color(profitDetail.labelColor,DEFAULT_DASHBOARD_LAYOUT.profitDetail.labelColor),
      valueColor:color(profitDetail.valueColor,DEFAULT_DASHBOARD_LAYOUT.profitDetail.valueColor),
      order:normalizeOrder(profitDetail.order,DASHBOARD_DETAIL_ORDER,DASHBOARD_DETAIL_ORDER),
    },
    quickActions:{
      columns:quickActions.columns===2?2:4,
      iconSize:clamp(quickActions.iconSize,18,36,DEFAULT_DASHBOARD_LAYOUT.quickActions.iconSize),
      titleVisible:quickActions.titleVisible!==false,
      itemPadding:clamp(quickActions.itemPadding,0,28,DEFAULT_DASHBOARD_LAYOUT.quickActions.itemPadding),
      itemGap:clamp(quickActions.itemGap,0,24,DEFAULT_DASHBOARD_LAYOUT.quickActions.itemGap),
      align:align(quickActions.align,DEFAULT_DASHBOARD_LAYOUT.quickActions.align),
      labelFontSize:clamp(quickActions.labelFontSize,8,24,DEFAULT_DASHBOARD_LAYOUT.quickActions.labelFontSize),
      labelColor:color(quickActions.labelColor,DEFAULT_DASHBOARD_LAYOUT.quickActions.labelColor),
      iconColor:color(quickActions.iconColor,DEFAULT_DASHBOARD_LAYOUT.quickActions.iconColor),
      order:normalizeOrder(quickActions.order,DASHBOARD_QUICK_ORDER,DASHBOARD_QUICK_ORDER),
    },
  };
}
