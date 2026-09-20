export type QuoteModuleStyle = 'quote' | 'chart' | 'compact' | 'advanced';
export type HoldingSortKey = 'manual' | 'changePct' | 'pnl' | 'roi' | 'marketValue' | 'weight' | 'price' | 'dividend';

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
