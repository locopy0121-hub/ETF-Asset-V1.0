import type {TargetOverride} from '../maintenance/inspectionModel';
import {normalizeEditorDimension} from '../editor/dimensionPolicy';

/** Suggested auto-layout dimensions. These are NOT minimum editable dimensions. */
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
/** Keep historical helper name for consumers, but never expand user dimensions.
 * Labels/values may clip at very small sizes by user choice.
 */
export function readableDividendSummaryMetric(override?:TargetOverride):TargetOverride {
  return {
    ...(override??{}),
    ...(override?.width!==undefined?{width:normalizeEditorDimension(override.width,1)}:{}),
    ...(override?.height!==undefined?{height:normalizeEditorDimension(override.height,1)}:{}),
  };
}
