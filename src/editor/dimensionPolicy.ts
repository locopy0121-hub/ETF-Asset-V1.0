/** User-authored geometry, not an opinionated minimum content size.
 * 1 physical layout unit is the only lower bound for explicit width/height:
 * React Native rejects negative/nonfinite sizes. 0 is reserved for disabled
 * minHeight / maxWidth constraints in existing persisted page configurations.
 */
export const EDITOR_DIMENSION_MIN=1;
export const EDITOR_DIMENSION_MAX=100000;
export const normalizeEditorDimension=(value:unknown,fallback:number,allowZero=false):number=>{
  const min=allowZero?0:EDITOR_DIMENSION_MIN;
  return typeof value==='number'&&Number.isFinite(value)
    ?Math.max(min,Math.min(EDITOR_DIMENSION_MAX,Math.round(value))):fallback;
};
