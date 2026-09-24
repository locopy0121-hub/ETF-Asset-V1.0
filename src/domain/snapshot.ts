export type MarketStatus =
  | 'up'
  | 'down'
  | 'flat'
  | 'limitUp'
  | 'limitDown'
  | 'unavailable';

export type HoldingSnapshot = Readonly<{
  id: string;
  symbol: string;
  name: string;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  marketStatus: MarketStatus;
  updatedAt: string | null;
  shares: number;
  avgCost: number;
  marketValue: number;
  pnl: number;
  roi: number;
  comprehensivePnl: number;
}>;

export type AssetSnapshot = Readonly<{
  valuationComplete?: boolean;
  totalAssets: number;
  marketValue: number;
  cash: number;
  unrealizedPnl: number;
  realizedPnl: number;
  dividendIncome: number;
  totalReturn: number;
}>;

export type SharedSnapshot = Readonly<{
  contractVersion: 1;
  generatedAt: string;
  source: 'canonical-finance-core';
  asset: AssetSnapshot;
  holdings: readonly HoldingSnapshot[];
}>;

/**
 * Snapshot consumers are display-only.
 * App / Widget / Monitor must never recreate finance formulas from raw trades.
 */
export function isSharedSnapshot(value: unknown): value is SharedSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SharedSnapshot>;
  return candidate.contractVersion === 1
    && candidate.source === 'canonical-finance-core'
    && typeof candidate.generatedAt === 'string'
    && !!candidate.asset
    && Array.isArray(candidate.holdings);
}
