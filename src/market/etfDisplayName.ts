/**
 * UI names must prefer official/localized catalog metadata and ledger labels.
 * Market feeds may return English issuer names; those are fallback-only.
 */
export function resolveEtfDisplayName(
  symbol:string,
  catalogName:string|undefined,
  ledgerName:string|undefined,
  feedName:string|undefined,
){
  const normalizedSymbol=symbol.trim().toUpperCase();
  const candidates=[catalogName,ledgerName,feedName]
    .map(value=>value?.trim())
    .filter((value):value is string=>Boolean(value&&value.toUpperCase()!==normalizedSymbol));
  return candidates[0]??symbol;
}
