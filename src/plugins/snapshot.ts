import type { ETFSummary, PortfolioSummary } from '../types/etf';

export type SnapshotHolding = Pick<
  ETFSummary,
  'etfCode'|'name'|'currentPrice'|'totalShares'|'currentMarketValue'|'unrealizedProfit'|'unrealizedROI'|'totalDividendsReceived'
> & {
  previousClose?: number;
  change?: number;
  changePct?: number;
};

export type CanonicalSnapshot = {
  id: string;
  createdAt: number;
  marketState: 'preopen'|'open'|'closed'|'unknown';
  portfolio: Pick<
    PortfolioSummary,
    'totalMarketValue'|'totalInvestmentCost'|'totalNetLiquidationValue'|'totalUnrealizedProfit'|'realizedNetPnL'|'comprehensivePnL'|'totalDividendsReceived'
  >;
  holdings: SnapshotHolding[];
};

export type SnapshotConsumer = 'app'|'home-widget'|'floating-monitor';

/**
 * Snapshot is an immutable presentation contract.
 * Consumers may sort/filter/format it, but never recompute finance formulas.
 */
export function freezeSnapshot(snapshot:CanonicalSnapshot):Readonly<CanonicalSnapshot>{
  return Object.freeze({
    ...snapshot,
    portfolio:Object.freeze({...snapshot.portfolio}),
    holdings:Object.freeze(snapshot.holdings.map(row=>Object.freeze({...row}))) as SnapshotHolding[],
  });
}
