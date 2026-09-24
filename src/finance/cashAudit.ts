/** Read-only cash provenance. The canonical finance formulas stay immutable. */
import { calculateLedgerCashFlow, type CanonicalLedgerEntry } from './canonicalLedger';

export const LEGACY_DEFAULT_CASH = 750_000;
export const LEGACY_REVERSAL_LABEL = '沖回舊版預設初始現金';

export function auditCashSources(initialCash: number, entries: readonly CanonicalLedgerEntry[]) {
  let buyOutflow = 0;
  let sellInflow = 0;
  let dividendInflow = 0;
  let otherNet = 0;
  for (const entry of entries) {
    const amount = calculateLedgerCashFlow(entry);
    if (entry.kind === 'buy') buyOutflow += amount;
    else if (entry.kind === 'sell') sellInflow += amount;
    else if (entry.kind === 'dividend') dividendInflow += amount;
    else otherNet += amount;
  }
  const hasLegacyReversal = entries.some(entry =>
    entry.kind === 'other' &&
    entry.label === LEGACY_REVERSAL_LABEL &&
    entry.amount === -LEGACY_DEFAULT_CASH
  );
  const netMovement = buyOutflow + sellInflow + dividendInflow + otherNet;
  return {
    opening: initialCash,
    buyOutflow,
    sellInflow,
    dividendInflow,
    otherNet,
    netMovement,
    cashBalance: initialCash + netMovement,
    possibleLegacyDefault: initialCash === LEGACY_DEFAULT_CASH && !hasLegacyReversal,
    hasLegacyReversal,
  };
}
