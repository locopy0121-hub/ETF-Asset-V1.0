import type { SharedSnapshot } from '../domain/snapshot';

export type WidgetSize = '2x2' | 'small' | 'medium' | 'large';
export type WidgetTemplate = 'asset-summary' | 'quote-summary' | 'compact' | 'quote-wall';
export type WidgetField = 'appName' | 'totalAssets' | 'marketValue' | 'cash' | 'unrealizedPnl' | 'realizedPnl' | 'dividendIncome' | 'totalReturn' | 'symbol' | 'name' | 'price' | 'change' | 'changePercent' | 'shares' | 'avgCost' | 'holdingMarketValue' | 'pnl' | 'roi' | 'comprehensivePnl' | 'marketStatus' | 'updatedAt' | 'dailyPnl' | 'quote';
export type WidgetSortKey = 'manual' | 'symbol' | 'price' | 'changePercent';
export type WidgetSortDirection = 'asc' | 'desc';
export type WidgetEffect = 'none' | 'fade' | 'pulse' | 'flash-on-change';
export type WidgetTextAlign = 'left' | 'center' | 'right';

export type WidgetStyle = Readonly<{
  fontScale: number;
  titleFontScale: number;
  valueFontScale: number;
  backgroundColor: string;
  textColor: string;
  secondaryTextColor: string;
  gainColor: string;
  lossColor: string;
  neutralColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  shadowEnabled: boolean;
  textAlign: WidgetTextAlign;
  rowGap: number;
  padding: number;
}>;

export type WidgetEffects = Readonly<{
  refresh: WidgetEffect;
  gain: WidgetEffect;
  loss: WidgetEffect;
  alert: WidgetEffect;
  animationsEnabled: boolean;
}>;

export type WidgetSort = Readonly<{
  key: WidgetSortKey;
  direction: WidgetSortDirection;
  manualSymbols: readonly string[];
}>;

export type WidgetConfig = Readonly<{
  enabled: boolean;
  size: WidgetSize;
  template: WidgetTemplate;
  fields: readonly WidgetField[];
  style: WidgetStyle;
  effects: WidgetEffects;
  sort: WidgetSort;
  selectedSymbols: readonly string[];
  tapTarget: 'home' | 'portfolio' | 'dividend';
}>;

export type WidgetViewModel = Readonly<{
  config: WidgetConfig;
  snapshot: SharedSnapshot | null;
}>;

export const DEFAULT_WIDGET_STYLE: WidgetStyle = {
  fontScale: 1,
  titleFontScale: 1,
  valueFontScale: 1,
  backgroundColor: '#FFFFFF',
  textColor: '#0F172A',
  secondaryTextColor: '#64748B',
  gainColor: '#EF4444',
  lossColor: '#10B981',
  neutralColor: '#64748B',
  backgroundOpacity: 0.94,
  borderColor: '#E2E8F0',
  borderWidth: 1,
  cornerRadius: 16,
  shadowEnabled: true,
  textAlign: 'left',
  rowGap: 6,
  padding: 12,
};

export const DEFAULT_WIDGET_EFFECTS: WidgetEffects = {
  refresh: 'fade',
  gain: 'none',
  loss: 'none',
  alert: 'pulse',
  animationsEnabled: true,
};

export const DEFAULT_WIDGET_SORT: WidgetSort = {
  key: 'manual',
  direction: 'asc',
  manualSymbols: [],
};

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  enabled: false,
  size: '2x2',
  template: 'asset-summary',
  fields: ['appName','totalAssets','symbol','price','changePercent'],
  style: DEFAULT_WIDGET_STYLE,
  effects: DEFAULT_WIDGET_EFFECTS,
  sort: DEFAULT_WIDGET_SORT,
  selectedSymbols: [],
  tapTarget: 'home',
};

export function sortWidgetHoldings(snapshot: SharedSnapshot | null, config: WidgetConfig) {
  if (!snapshot) return [];
  const selected = config.selectedSymbols.length
    ? snapshot.holdings.filter(row => config.selectedSymbols.includes(row.symbol))
    : [...snapshot.holdings];

  const direction = config.sort.direction === 'desc' ? -1 : 1;
  if (config.sort.key === 'manual') {
    const rank = new Map(config.sort.manualSymbols.map((symbol, index) => [symbol, index]));
    return selected.sort((a, b) => (rank.get(a.symbol) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.symbol) ?? Number.MAX_SAFE_INTEGER));
  }
  if (config.sort.key === 'symbol') return selected.sort((a, b) => a.symbol.localeCompare(b.symbol) * direction);
  if (config.sort.key === 'price') return selected.sort((a, b) => ((a.price ?? -Infinity) - (b.price ?? -Infinity)) * direction);
  return selected.sort((a, b) => ((a.changePercent ?? -Infinity) - (b.changePercent ?? -Infinity)) * direction);
}

export function createWidgetViewModel(
  snapshot: SharedSnapshot | null,
  config: WidgetConfig = DEFAULT_WIDGET_CONFIG,
): WidgetViewModel {
  return { snapshot, config };
}
