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
  miniFields: readonly MonitorField[];
  selectedSymbols: readonly string[];
  showBreathingLight: boolean;
  alertChangePct: number | null;
  normalLayout: MonitorLayout;
  miniLayout: MonitorLayout;
}>;

export type MonitorRuntimeState = Readonly<{
  marketState: 'live' | 'afterHours' | 'offline';
  lastUpdatedAt: string | null;
  breathing: boolean;
  alertingSymbols: readonly string[];
}>;

export type MonitorViewModel = Readonly<{
  config: MonitorConfig;
  snapshot: SharedSnapshot | null;
  runtime: MonitorRuntimeState;
}>;

export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  enabled: false,
  mode: 'normal',
  template: 'portfolio',
  fields: ['symbol', 'price', 'changePercent', 'pnl'],
  miniFields: ['symbol', 'price', 'changePercent'],
  selectedSymbols: [],
  showBreathingLight: true,
  alertChangePct: null,
  normalLayout: { x: 16, y: 120, width: 320, height: 420 },
  miniLayout: { x: 16, y: 120, width: 180, height: 72 },
};

export function activeMonitorLayout(config: MonitorConfig) {
  return config.mode === 'normal' ? config.normalLayout : config.miniLayout;
}

export function activeMonitorFields(config: MonitorConfig) {
  return config.mode === 'normal' ? config.fields : config.miniFields;
}

export function setMonitorMode(config: MonitorConfig, mode: MonitorMode): MonitorConfig {
  return { ...config, mode };
}

/** Mini mode double-tap restores the previously persisted normal layout. */
export function restoreNormalMonitor(config: MonitorConfig): MonitorConfig {
  return { ...config, mode: 'normal' };
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

export function updateMonitorFields(
  config: MonitorConfig,
  fields: readonly MonitorField[],
): MonitorConfig {
  return config.mode === 'normal'
    ? { ...config, fields: [...fields] }
    : { ...config, miniFields: [...fields] };
}

export function createMonitorRuntimeState(
  snapshot: SharedSnapshot | null,
  input: { marketState?: MonitorRuntimeState['marketState']; refreshing?: boolean } = {},
  config: MonitorConfig = DEFAULT_MONITOR_CONFIG,
): MonitorRuntimeState {
  const threshold = config.alertChangePct;
  const alertingSymbols = threshold == null || !snapshot
    ? []
    : snapshot.holdings
        .filter(row => Number.isFinite(row.changePercent) && Math.abs(row.changePercent ?? 0) >= threshold)
        .map(row => row.symbol);

  return {
    marketState: input.marketState ?? 'offline',
    lastUpdatedAt: snapshot?.generatedAt ?? null,
    breathing: config.showBreathingLight && input.refreshing === true,
    alertingSymbols,
  };
}

export function createMonitorViewModel(
  snapshot: SharedSnapshot | null,
  config: MonitorConfig = DEFAULT_MONITOR_CONFIG,
  runtimeInput: { marketState?: MonitorRuntimeState['marketState']; refreshing?: boolean } = {},
): MonitorViewModel {
  return {
    snapshot,
    config,
    runtime: createMonitorRuntimeState(snapshot, runtimeInput, config),
  };
}
