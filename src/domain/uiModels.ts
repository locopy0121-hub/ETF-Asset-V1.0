import { DEFAULT_ITEM_EFFECT, type ItemEffectConfig } from './displayItemContract';
import type {EtfReminderType} from './etfBadges';
export type QuoteModuleStyle = 'quote' | 'chart' | 'compact' | 'advanced';
export type HoldingSortKey = 'manual' | 'changePct' | 'pnl' | 'roi' | 'marketValue' | 'weight' | 'price' | 'dividend';

export type HoldingWallFieldKey = 'name' | 'symbol' | 'price' | 'change' | 'changePercent' | 'pnl' | 'roi' | 'marketValue' | 'etfType' | 'dividendType';
export type HoldingWallAlign = 'left' | 'center' | 'right';
export type HoldingWallFieldConfig = Readonly<{
  field: HoldingWallFieldKey;
  enabled: boolean;
  label: string;
  fontScale: number;
  align: HoldingWallAlign;
  useProfitColor: boolean;
  /** Dynamic background mode; separate from fixed Color Picker selection. */
  useProfitBackground?:boolean;
  textColor:string|null;
  backgroundColor:string|null;
  lineGap:number|null;
  paddingY:number;
  effect:ItemEffectConfig;
}>;
export type HoldingWallHeaderConfig = Readonly<{
  visible: boolean;
  fontScale: number;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  effect:ItemEffectConfig;
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
export type WallTickerConfig = Readonly<{
  enabled:boolean;
  direction:'left'|'right';
  speed:number;
  itemGap:number;
  showPrice:boolean;
  showChange:boolean;
  textColor:string;
  backgroundColor:string;
}>;
export type HoldingWallConfig = Readonly<{
  header: HoldingWallHeaderConfig;
  fields: readonly HoldingWallFieldConfig[];
  style: HoldingWallStyleConfig;
  ticker?:WallTickerConfig;
}>;

export const DEFAULT_HOLDING_WALL_CONFIG: HoldingWallConfig = {
  header:{visible:true,fontScale:1,backgroundColor:'#0C121B',textColor:'#FFFFFF',borderColor:'#738197',borderWidth:1,effect:{...DEFAULT_ITEM_EFFECT}},
  fields:[
    {field:'symbol',enabled:true,label:'代號',fontScale:1,align:'left',useProfitColor:true,textColor:null,backgroundColor:null,lineGap:null,paddingY:0,effect:{...DEFAULT_ITEM_EFFECT}},
    {field:'etfType',enabled:false,label:'ETF類型',fontScale:1,align:'left',useProfitColor:false,textColor:null,backgroundColor:null,lineGap:null,paddingY:0,effect:{...DEFAULT_ITEM_EFFECT}},
    {field:'dividendType',enabled:false,label:'配息型態',fontScale:1,align:'left',useProfitColor:false,textColor:null,backgroundColor:null,lineGap:null,paddingY:0,effect:{...DEFAULT_ITEM_EFFECT}},
    {field:'name',enabled:true,label:'名稱',fontScale:1,align:'left',useProfitColor:false,textColor:null,backgroundColor:null,lineGap:null,paddingY:0,effect:{...DEFAULT_ITEM_EFFECT}},
    {field:'price',enabled:true,label:'價格',fontScale:1,align:'left',useProfitColor:true,textColor:null,backgroundColor:null,lineGap:null,paddingY:0,effect:{...DEFAULT_ITEM_EFFECT}},
    {field:'changePercent',enabled:true,label:'漲跌%',fontScale:1,align:'right',useProfitColor:true,textColor:null,backgroundColor:null,lineGap:null,paddingY:0,effect:{...DEFAULT_ITEM_EFFECT}},
    {field:'change',enabled:false,label:'漲跌',fontScale:1,align:'right',useProfitColor:true,textColor:null,backgroundColor:null,lineGap:null,paddingY:0,effect:{...DEFAULT_ITEM_EFFECT}},
    {field:'pnl',enabled:true,label:'損益',fontScale:1,align:'right',useProfitColor:true,textColor:null,backgroundColor:null,lineGap:null,paddingY:0,effect:{...DEFAULT_ITEM_EFFECT}},
    {field:'roi',enabled:false,label:'報酬率',fontScale:1,align:'right',useProfitColor:true,textColor:null,backgroundColor:null,lineGap:null,paddingY:0,effect:{...DEFAULT_ITEM_EFFECT}},
    {field:'marketValue',enabled:false,label:'市值',fontScale:1,align:'right',useProfitColor:false,textColor:null,backgroundColor:null,lineGap:null,paddingY:0,effect:{...DEFAULT_ITEM_EFFECT}},
  ],
  ticker:{enabled:false,direction:'left',speed:55,itemGap:24,showPrice:true,showChange:true,textColor:'#DCEAFE',backgroundColor:'#101B2B'},
  style:{backgroundColor:'#0C121B',textColor:'#FFFFFF',secondaryTextColor:'#91A0B5',gainColor:'#EF5B64',lossColor:'#10B981',borderColor:'#263343',borderWidth:1,cornerRadius:16,padding:10,rowGap:6},
};

export type HoldingQuote = {
  /** Only authoritative exchange/issuer metadata; never infer from a ticker or price. */
  etfType?: string | null;
  dividendType?: string | null;
  reminderEvent?:EtfReminderType|null;
  symbol: string;
  name: string;
  quoteVerified?: boolean;
  quoteQuality?: 'trade'|'official_close'|'unavailable';
  quoteSourceAt?: number|null;
  marketDataVersion?:number;
  previousCloseKnown?:boolean;
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
