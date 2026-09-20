import type { SharedSnapshot } from '../domain/snapshot';

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetTemplate = 'asset-summary' | 'quote-summary' | 'compact';
export type WidgetField = 'totalAssets' | 'dailyPnl' | 'quote' | 'changePercent';

export type WidgetConfig = Readonly<{
  enabled: boolean;
  size: WidgetSize;
  template: WidgetTemplate;
  fields: readonly WidgetField[];
}>;

export type WidgetViewModel = Readonly<{
  config: WidgetConfig;
  snapshot: SharedSnapshot | null;
}>;

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  enabled: false,
  size: 'medium',
  template: 'asset-summary',
  fields: ['totalAssets', 'dailyPnl'],
};

export function createWidgetViewModel(
  snapshot: SharedSnapshot | null,
  config: WidgetConfig = DEFAULT_WIDGET_CONFIG,
): WidgetViewModel {
  return { snapshot, config };
}
