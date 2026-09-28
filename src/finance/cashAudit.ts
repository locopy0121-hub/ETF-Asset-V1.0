/** Cash provenance and legacy-opening-cash migration. Canonical finance formulas stay immutable. */
import { calculateLedgerCashFlow, type CanonicalLedgerEntry } from './canonicalLedger';

export const LEGACY_DEFAULT_CASH = 750_000;
export const LEGACY_REVERSAL_LABEL = '沖回舊版預設初始現金';
export const LEGACY_REVERSAL_ID_PREFIX = 'legacy-opening-cash-reversal';

export const isGeneratedLegacyReversal = (entry: CanonicalLedgerEntry) =>
  entry.kind === 'other' &&
  entry.id.startsWith(LEGACY_REVERSAL_ID_PREFIX) &&
  entry.label === LEGACY_REVERSAL_LABEL &&
  entry.amount === -LEGACY_DEFAULT_CASH;

function removeFirstGeneratedLegacyReversal(entries: readonly CanonicalLedgerEntry[]) {
  const index = entries.findIndex(isGeneratedLegacyReversal);
  if (index < 0) return {entries:[...entries], removed:0};
  const normalizedEntries = [...entries];
  normalizedEntries.splice(index,1);
  return {entries:normalizedEntries, removed:1};
}

/**
 * Storage migration for the product's historical NT$750,000 sentinel.
 *
 * V3.1.12 handled the obvious state (opening cash still equals 750,000) but
 * missed an already-normalized opening cash of 0 with the old generated
 * -750,000 reversal still present. That orphan reversal produces the exact
 * extra -750,000 cash delta seen on upgraded devices.
 *
 * Rules:
 * - The exact legacy opening sentinel is normalized to zero.
 * - Only a reversal created by TF Asset's dedicated generated ID is removable.
 * - At most one generated reversal is removed in a migration pass.
 * - User-created adjustments that merely share the same label/amount survive.
 * - Orphan-reversal cleanup is opt-in so schema 3 becomes idempotent.
 */
export function migrateLegacyOpeningCash(
  initialCash: number,
  entries: readonly CanonicalLedgerEntry[],
  options: Readonly<{removeOrphanGeneratedReversal?: boolean}> = {},
) {
  const safeInitialCash = Number.isFinite(initialCash) ? initialCash : 0;

  if (safeInitialCash === LEGACY_DEFAULT_CASH) {
    const normalized = removeFirstGeneratedLegacyReversal(entries);
    return {
      initialCash: 0,
      entries: normalized.entries,
      migrated: true,
      removedLegacyReversals: normalized.removed,
      orphanLegacyReversalRemoved: false,
    };
  }

  if (safeInitialCash === 0 && options.removeOrphanGeneratedReversal) {
    const normalized = removeFirstGeneratedLegacyReversal(entries);
    if (normalized.removed) {
      return {
        initialCash: 0,
        entries: normalized.entries,
        migrated: true,
        removedLegacyReversals: 1,
        orphanLegacyReversalRemoved: true,
      };
    }
  }

  return {
    initialCash: safeInitialCash,
    entries: [...entries],
    migrated: false,
    removedLegacyReversals: 0,
    orphanLegacyReversalRemoved: false,
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
    possibleLegacyDefault: initialCash === LEGACY_DEFAULT_CASH && !hasLegacyReversal,
    hasLegacyReversal,
  };
}
