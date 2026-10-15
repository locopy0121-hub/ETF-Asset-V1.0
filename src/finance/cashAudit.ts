/** Cash provenance normalization. Canonical finance formulas stay immutable. */
import { calculateLedgerCashFlow, type CanonicalLedgerEntry } from './canonicalLedger';

export const LEGACY_REVERSAL_LABEL = '沖回舊版預設初始現金';
export const LEGACY_REVERSAL_ID_PREFIX = 'legacy-opening-cash-reversal';

export const isGeneratedLegacyReversal = (entry: CanonicalLedgerEntry) =>
  entry.kind === 'other' &&
  entry.id.startsWith(LEGACY_REVERSAL_ID_PREFIX) &&
  entry.label === LEGACY_REVERSAL_LABEL;

function removeGeneratedLegacyReversals(entries: readonly CanonicalLedgerEntry[]) {
  const normalizedEntries = entries.filter(entry=>!isGeneratedLegacyReversal(entry));
  return {
    entries: normalizedEntries,
    removed: entries.length-normalizedEntries.length,
  };
}

/**
 * V3.1.14 cash provenance normalization.
 *
 * Rules:
 * - No hard-coded opening-cash amount exists in runtime logic.
 * - If storage has no explicit opening-cash provenance, opening cash is normalized to zero.
 * - Stale system-generated reversal entries are identified only by TF Asset's dedicated ID + label,
 *   never by a magic amount, and are removed during hydration.
 * - User-created cash adjustments survive even when their amount happens to match a historical value.
 */
export function migrateLegacyOpeningCash(
  initialCash: number,
  entries: readonly CanonicalLedgerEntry[],
  options: Readonly<{
    forceOpeningCashZero?: boolean;
    removeGeneratedLegacyReversals?: boolean;
  }> = {},
) {
  const safeInitialCash = Number.isFinite(initialCash) ? initialCash : 0;
  const normalized = options.removeGeneratedLegacyReversals
    ? removeGeneratedLegacyReversals(entries)
    : {entries:[...entries],removed:0};
  const normalizedInitialCash = options.forceOpeningCashZero ? 0 : safeInitialCash;
  const migrated =
    normalizedInitialCash !== initialCash ||
    normalized.removed > 0;

  return {
    initialCash: normalizedInitialCash,
    entries: normalized.entries,
    migrated,
    removedLegacyReversals: normalized.removed,
    orphanLegacyReversalRemoved: normalized.removed > 0 && normalizedInitialCash === 0,
  };
}

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
  const hasLegacyReversal = entries.some(isGeneratedLegacyReversal);
  const netMovement = buyOutflow + sellInflow + dividendInflow + otherNet;
  return {
    opening: initialCash,
    buyOutflow,
    sellInflow,
    dividendInflow,
    otherNet,
    netMovement,
    cashBalance: initialCash + netMovement,
    possibleLegacyDefault: false,
    hasLegacyReversal,
  };
}
