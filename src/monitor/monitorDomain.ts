import type { SharedSnapshot } from '../domain/snapshot';

export type MonitorMode = 'normal' | 'mini';
export type MonitorTemplate = 'portfolio' | 'quotes' | 'compact';
export type MonitorField = 'symbol' | 'price' | 'changePercent' | 'marketValue' | 'pnl';

export type MonitorLayout = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type MonitorConfig = Readonly<{
  enabled: boolean;
  mode: MonitorMode;
  template: MonitorTemplate;
  fields: readonly MonitorField[];
  normalLayout: MonitorLayout;
  miniLayout: MonitorLayout;
}>;

export type MonitorViewModel = Readonly<{
  config: MonitorConfig;
  snapshot: SharedSnapshot | null;
}>;

export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  enabled: false,
  mode: 'normal',
  template: 'portfolio',
  fields: ['symbol', 'price', 'changePercent', 'pnl'],
  normalLayout: { x: 16, y: 120, width: 320, height: 420 },
  miniLayout: { x: 16, y: 120, width: 180, height: 72 },
};

export function activeMonitorLayout(config: MonitorConfig) {
  return config.mode === 'normal' ? config.normalLayout : config.miniLayout;
}

export function setMonitorMode(config: MonitorConfig, mode: MonitorMode): MonitorConfig {
  return { ...config, mode };
}

export function updateActiveMonitorLayout(
  config: MonitorConfig,
  patch: Partial<MonitorLayout>,
): MonitorConfig {
  if (config.mode === 'normal') {
    return { ...config, normalLayout: { ...config.normalLayout, ...patch } };
  }
  return { ...config, miniLayout: { ...config.miniLayout, ...patch } };
}

export function createMonitorViewModel(
  snapshot: SharedSnapshot | null,
  config: MonitorConfig = DEFAULT_MONITOR_CONFIG,
): MonitorViewModel {
  return { snapshot, config };
}
