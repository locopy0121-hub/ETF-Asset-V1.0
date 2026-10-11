/**
 * Shared TF Asset OHLC candle appearance.
 * Every chart that renders a K-line body must use opaque fill and matching
 * border/wick colors. Both the market research chart and stock/holding chart
 * use OfficialCandleChart, so the rule is app-wide.
 *
 * Semantic gain/loss palette comes from SystemColors (positive=Taiwan red,
 * negative=Taiwan green by default); this module does NOT change user colors.
 * A doji retains the existing >= open mapping, rendered at least 2px tall.
 */
export type CandleColors=Readonly<{gain:string;loss:string}>;
export type SolidCandleAppearance=Readonly<{bodyFill:string;bodyBorder:string;wick:string;volume:string}>;
export function solidCandleAppearance(open:number,close:number,colors:CandleColors):SolidCandleAppearance{
  const tone=close>=open?colors.gain:colors.loss;
  return {bodyFill:tone,bodyBorder:tone,wick:tone,volume:tone};
}
