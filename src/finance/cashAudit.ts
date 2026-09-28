/** Cash provenance and legacy-opening-cash migration. Canonical finance formulas stay immutable. */
import { calculateLedgerCashFlow, type CanonicalLedgerEntry } from './canonicalLedger';

export const LEGACY_DEFAULT_CASH = 750_000;
export const LEGACY_REVERSAL_LABEL = '沖回舊版預設初始現金';

const isLegacyReversal = (entry: CanonicalLedgerEntry) =>
  entry.kind === 'other' &&
  entry.label === LEGACY_REVERSAL_LABEL &&
  entry.amount === -LEGACY_DEFAULT_CASH;

/**
 * V3.1.12 storage migration.
 *
 * Older builds persisted the product's hard-coded NT$750,000 opening cash.
 * That amount was never entered by the user. Normalize that exact legacy
 * sentinel to zero while preserving every real buy/sell/dividend/other entry.
 *
 * If a previous build already inserted the dedicated -750,000 reversal,
 * remove that generated reversal at the same time so the migration is
 * balance-preserving and idempotent.
 */
export function migrateLegacyOpeningCash(
  initialCash: number,
  entries: readonly CanonicalLedgerEntry[],
) {
  const safeInitialCash = Number.isFinite(initialCash) ? initialCash : 0;
  if (safeInitialCash !== LEGACY_DEFAULT_CASH) {
    return {
      initialCash: safeInitialCash,
      entries: [...entries],
      migrated: false,
      removedLegacyReversals: 0,
    };
  }

  const normalizedEntries = entries.filter(entry => !isLegacyReversal(entry));
  return {
    initialCash: 0,
    entries: normalizedEntries,
    migrated: true,
    removedLegacyReversals: entries.length - normalizedEntries.length,
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
  const hasLegacyReversal = entries.some(isLegacyReversal);
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
