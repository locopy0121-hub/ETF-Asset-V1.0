import type {TargetOverride} from '../maintenance/inspectionModel';

/** Readability boundary for the three dividend-summary metric cards only.
 * Existing 68x24 legacy overrides are preserved in storage but safely rendered.
 * Monetary values remain untouched and are never derived in this adapter.
 */
export const DIVIDEND_SUMMARY_METRIC_MIN_WIDTH=136;
export const DIVIDEND_SUMMARY_METRIC_MIN_HEIGHT=128;
export const DIVIDEND_SUMMARY_METRIC_LABELS=['本月淨入帳','年度淨股息','月平均股息'] as const;
export function isDividendSummaryMetric(label:string):boolean {
  return DIVIDEND_SUMMARY_METRIC_LABELS.some(item=>item===label);
}
export function dividendSummaryMetricMinHeight(override?:TargetOverride):number {
  const label=Math.max(11,override?.labelFontSize??11);
  const value=Math.max(17,override?.fontSize??17);
  const caption=Math.max(10,override?.captionFontSize??10);
  const padding=Math.max(8,override?.padding??16);
  return Math.ceil(Math.max(DIVIDEND_SUMMARY_METRIC_MIN_HEIGHT,
    label*2.7+value*1.6+caption*1.6+padding*2+14));
}
export function readableDividendSummaryMetric(override?:TargetOverride):TargetOverride {
  const minHeight=dividendSummaryMetricMinHeight(override);
  return {
    ...(override??{}),
    ...(override?.width!==undefined?{width:Math.max(DIVIDEND_SUMMARY_METRIC_MIN_WIDTH,override.width)}:{}),
    // Without an explicit height, let the surrounding cell stretch naturally.
    ...(override?.height!==undefined?{height:Math.max(minHeight,override.height)}:{}),
  };
}
