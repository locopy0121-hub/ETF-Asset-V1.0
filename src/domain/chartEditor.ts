export type ChartDataKey='open'|'high'|'low'|'close'|'volume'|'price'|'change'|'changePct'|'cost'|'pnl'|'comprehensivePnl'|'roi'|'marketValue'|'dividend';
export type ChartDataSource='market'|'holding';
export type NativeChartStyle='candlestick'|'ohlc'|'line'|'area'|'column'|'price-volume'|'cost-price'|'pnl'|'roi';
export type HoldingChartRange='1月'|'3月'|'6月'|'1年';
export type HoldingChartConfig=Readonly<{
  style:NativeChartStyle;
  dataKeys:readonly ChartDataKey[];
  range:HoldingChartRange;
  crosshairEnabled:boolean;
  costLineEnabled:boolean;
}>;
export type ChartLibraryStatus='native'|'pending-adapter';
export type ChartLibraryItem=Readonly<{id:string;label:string;family:string;status:ChartLibraryStatus}>;

export const MARKET_CHART_DATA_OPTIONS:readonly Readonly<{key:ChartDataKey;label:string}>[]=[
  {key:'open',label:'開盤價'},{key:'high',label:'最高價'},{key:'low',label:'最低價'},{key:'close',label:'收盤價'},
  {key:'volume',label:'成交量'},{key:'price',label:'行情走勢'},{key:'change',label:'漲跌額'},{key:'changePct',label:'漲跌幅'},
];

export const HOLDING_CHART_DATA_OPTIONS:readonly Readonly<{key:ChartDataKey;label:string}>[]=[
  {key:'cost',label:'持股成本線'},{key:'pnl',label:'持股損益'},{key:'comprehensivePnl',label:'含息總損益'},
  {key:'roi',label:'報酬率'},{key:'marketValue',label:'市值'},{key:'dividend',label:'累積股息'},
];

export const CHART_DATA_OPTIONS:readonly Readonly<{key:ChartDataKey;label:string}>[]=[
  ...MARKET_CHART_DATA_OPTIONS,
  ...HOLDING_CHART_DATA_OPTIONS,
];

export const NATIVE_CHART_STYLES:readonly Readonly<{id:NativeChartStyle;label:string}>[]=[
  {id:'candlestick',label:'K 線'},
  {id:'ohlc',label:'OHLC'},
  {id:'line',label:'折線'},
  {id:'area',label:'面積'},
  {id:'column',label:'柱狀'},
  {id:'price-volume',label:'價量'},
  {id:'cost-price',label:'成本/市價'},
  {id:'pnl',label:'持股損益'},
  {id:'roi',label:'報酬率'},
];
export const HOLDING_CHART_RANGES:readonly HoldingChartRange[]=['1月','3月','6月','1年'];
export const DEFAULT_HOLDING_CHART:HoldingChartConfig={
  style:'candlestick',dataKeys:['open','high','low','close','volume'],range:'1月',
  crosshairEnabled:true,costLineEnabled:true,
};
export function normalizeHoldingChart(raw:unknown):HoldingChartConfig{
  const source=(raw&&typeof raw==='object'?raw:{}) as Partial<HoldingChartConfig>;
  const style=NATIVE_CHART_STYLES.some(item=>item.id===source.style)?source.style as NativeChartStyle:DEFAULT_HOLDING_CHART.style;
  const allowed=new Set(CHART_DATA_OPTIONS.map(item=>item.key));
  const selected=Array.isArray(source.dataKeys)?source.dataKeys.filter((key):key is ChartDataKey=>allowed.has(key as ChartDataKey)):[];
  const dataKeys=selected.length?Array.from(new Set(selected)):DEFAULT_HOLDING_CHART.dataKeys;
  const range=HOLDING_CHART_RANGES.includes(source.range as HoldingChartRange)?source.range as HoldingChartRange:DEFAULT_HOLDING_CHART.range;
  return {style,dataKeys,range,crosshairEnabled:source.crosshairEnabled!==false,costLineEnabled:source.costLineEnabled!==false};
}

export const CHART_LIBRARY:readonly ChartLibraryItem[]=[
  {id:'line',label:'標準折線',family:'價格與趨勢',status:'native'},
  {id:'smooth-line',label:'平滑折線',family:'價格與趨勢',status:'pending-adapter'},
  {id:'step-line',label:'階梯折線',family:'價格與趨勢',status:'pending-adapter'},
  {id:'multi-line',label:'多系列比較',family:'價格與趨勢',status:'pending-adapter'},
  {id:'area',label:'面積圖',family:'價格與趨勢',status:'native'},
  {id:'stacked-area',label:'堆疊面積',family:'價格與趨勢',status:'pending-adapter'},
  {id:'range-band',label:'區間帶',family:'價格與趨勢',status:'pending-adapter'},
  {id:'sparkline',label:'迷你走勢圖',family:'價格與趨勢',status:'native'},
  {id:'candlestick',label:'K 線',family:'行情',status:'native'},
  {id:'ohlc',label:'OHLC',family:'行情',status:'native'},
  {id:'heikin-ashi',label:'平均 K 線',family:'行情',status:'pending-adapter'},
  {id:'price-volume',label:'價量組合',family:'行情',status:'native'},
  {id:'column',label:'直條圖',family:'比較',status:'native'},
  {id:'bar',label:'橫條圖',family:'比較',status:'pending-adapter'},
  {id:'grouped-column',label:'群組柱',family:'比較',status:'pending-adapter'},
  {id:'stacked-column',label:'堆疊柱',family:'比較',status:'pending-adapter'},
  {id:'diverging-bar',label:'正負發散',family:'比較',status:'pending-adapter'},
  {id:'pie',label:'圓餅圖',family:'配置',status:'pending-adapter'},
  {id:'donut',label:'甜甜圈',family:'配置',status:'pending-adapter'},
  {id:'treemap',label:'樹狀矩形',family:'配置',status:'pending-adapter'},
  {id:'sunburst',label:'旭日圖',family:'配置',status:'pending-adapter'},
  {id:'waterfall',label:'瀑布圖',family:'財務',status:'pending-adapter'},
  {id:'sankey',label:'桑基圖',family:'財務',status:'pending-adapter'},
  {id:'dual-axis',label:'雙軸組合',family:'財務',status:'pending-adapter'},
  {id:'growth',label:'累積成長',family:'財務',status:'pending-adapter'},
  {id:'cost-price',label:'成本／市價雙線',family:'持股',status:'native'},
  {id:'pnl',label:'持股損益',family:'持股',status:'native'},
  {id:'roi',label:'持股報酬率',family:'持股',status:'native'},
  {id:'scatter',label:'散佈圖',family:'統計',status:'pending-adapter'},
  {id:'bubble',label:'氣泡圖',family:'統計',status:'pending-adapter'},
  {id:'radar',label:'雷達圖',family:'統計',status:'pending-adapter'},
  {id:'bullet',label:'子彈圖',family:'統計',status:'pending-adapter'},
  {id:'histogram',label:'直方圖',family:'分布',status:'pending-adapter'},
  {id:'boxplot',label:'箱型圖',family:'分布',status:'pending-adapter'},
  {id:'calendar-heatmap',label:'月曆熱力圖',family:'分布',status:'pending-adapter'},
  {id:'matrix-heatmap',label:'矩陣熱力圖',family:'分布',status:'pending-adapter'},
  {id:'drawdown',label:'最大回撤圖',family:'績效',status:'pending-adapter'},
  {id:'gauge',label:'儀表圖',family:'績效',status:'pending-adapter'},
  {id:'dividend-monthly',label:'每月股息分布',family:'績效',status:'pending-adapter'},
];
