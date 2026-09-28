export type DashboardLayoutConfig=Readonly<{
  sectionGap:number;
  contentPadding:number;
  overview:Readonly<{
    minHeight:number;
    padding:number;
    prefixVisible:boolean;
    captionVisible:boolean;
    decorationVisible:boolean;
  }>;
  profitAnalysis:Readonly<{
    cardGap:number;
    cardHeight:number;
    iconVisible:boolean;
    captionVisible:boolean;
  }>;
  profitDetail:Readonly<{
    itemCount:2|3|4;
    rowHeight:number;
    showMore:boolean;
  }>;
  quickActions:Readonly<{
    columns:2|4;
    iconSize:number;
    titleVisible:boolean;
  }>;
}>;

export const DEFAULT_DASHBOARD_LAYOUT:DashboardLayoutConfig={
  sectionGap:12,
  contentPadding:0,
  overview:{minHeight:132,padding:16,prefixVisible:true,captionVisible:true,decorationVisible:true},
  profitAnalysis:{cardGap:10,cardHeight:104,iconVisible:true,captionVisible:true},
  profitDetail:{itemCount:4,rowHeight:48,showMore:true},
  quickActions:{columns:4,iconSize:24,titleVisible:true},
};

const clamp=(value:unknown,min:number,max:number,fallback:number)=>{
  const n=Number(value);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
};

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
    },
    profitAnalysis:{
      cardGap:clamp(profitAnalysis.cardGap,6,24,DEFAULT_DASHBOARD_LAYOUT.profitAnalysis.cardGap),
      cardHeight:clamp(profitAnalysis.cardHeight,84,156,DEFAULT_DASHBOARD_LAYOUT.profitAnalysis.cardHeight),
      iconVisible:profitAnalysis.iconVisible!==false,
      captionVisible:profitAnalysis.captionVisible!==false,
    },
    profitDetail:{
      itemCount:(Math.round(itemCount) as 2|3|4),
      rowHeight:clamp(profitDetail.rowHeight,40,72,DEFAULT_DASHBOARD_LAYOUT.profitDetail.rowHeight),
      showMore:profitDetail.showMore!==false,
    },
    quickActions:{
      columns:quickActions.columns===2?2:4,
      iconSize:clamp(quickActions.iconSize,18,36,DEFAULT_DASHBOARD_LAYOUT.quickActions.iconSize),
      titleVisible:quickActions.titleVisible!==false,
    },
  };
}
