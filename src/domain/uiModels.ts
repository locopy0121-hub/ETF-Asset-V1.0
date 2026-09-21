export type QuoteModuleStyle = 'quote' | 'chart' | 'compact' | 'advanced';
export type HoldingSortKey = 'manual' | 'changePct' | 'pnl' | 'roi' | 'marketValue' | 'weight' | 'price' | 'dividend';

export type HoldingWallFieldKey = 'name' | 'symbol' | 'price' | 'change' | 'changePercent' | 'pnl' | 'roi' | 'marketValue';
export type HoldingWallAlign = 'left' | 'center' | 'right';
export type HoldingWallFieldConfig = Readonly<{
  field: HoldingWallFieldKey;
  enabled: boolean;
  label: string;
  fontScale: number;
  align: HoldingWallAlign;
  useProfitColor: boolean;
}>;
export type HoldingWallHeaderConfig = Readonly<{
  visible: boolean;
  fontScale: number;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderWidth: number;
}>;
export type HoldingWallStyleConfig = Readonly<{
  backgroundColor: string;
  textColor: string;
  secondaryTextColor: string;
  gainColor: string;
  lossColor: string;
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  padding: number;
  rowGap: number;
}>;
export type HoldingWallConfig = Readonly<{
  header: HoldingWallHeaderConfig;
  fields: readonly HoldingWallFieldConfig[];
  style: HoldingWallStyleConfig;
}>;

export const DEFAULT_HOLDING_WALL_CONFIG: HoldingWallConfig = {
  header:{visible:true,fontScale:.82,backgroundColor:'#0C121B',textColor:'#91A0B5',borderColor:'#263343',borderWidth:0},
  fields:[
    {field:'symbol',enabled:true,label:'代號',fontScale:1,align:'left',useProfitColor:true},
    {field:'name',enabled:true,label:'名稱',fontScale:1,align:'left',useProfitColor:false},
    {field:'price',enabled:true,label:'價格',fontScale:1,align:'left',useProfitColor:true},
    {field:'changePercent',enabled:true,label:'漲跌%',fontScale:1,align:'right',useProfitColor:true},
    {field:'change',enabled:false,label:'漲跌',fontScale:1,align:'right',useProfitColor:true},
    {field:'pnl',enabled:true,label:'損益',fontScale:1,align:'right',useProfitColor:true},
    {field:'roi',enabled:false,label:'報酬率',fontScale:1,align:'right',useProfitColor:true},
    {field:'marketValue',enabled:false,label:'市值',fontScale:1,align:'right',useProfitColor:false},
  ],
  style:{backgroundColor:'#0C121B',textColor:'#FFFFFF',secondaryTextColor:'#91A0B5',gainColor:'#EF5B64',lossColor:'#10B981',borderColor:'#263343',borderWidth:1,cornerRadius:16,padding:10,rowGap:6},
};

export type HoldingQuote = {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  previousClose: number;
  avgCost: number;
  tradeAvg: number;
  costAvg: number;
  marketValue: number;
  pnl: number;
  pricePnl: number;
  roi: number;
  weight: number;
  cumulativeDividend: number;
  realizedPnl: number;
  comprehensivePnl: number;
  pinned?: boolean;
  sparkline: number[];
};

export type MarketNewsItem = {
  id: string;
  title: string;
  source: string;
  time: string;
};

export type LedgerDemoItem = {
  id: string;
  date: string;
  kind: '買進' | '賣出' | '股息' | '其他';
  symbol: string;
  shares?: number;
  amount: number;
  fee?: number;
  tax?: number;
};

export type DividendDemoItem = {
  id: string;
  date: string;
  symbol: string;
  name: string;
  amount: number;
  status: '預估' | '待入帳' | '已入帳';
};
