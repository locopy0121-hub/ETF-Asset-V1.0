import assert from 'node:assert/strict';
import {
  auditCashSources,
  LEGACY_DEFAULT_CASH,
  LEGACY_REVERSAL_LABEL,
  migrateLegacyOpeningCash,
} from '../src/finance/cashAudit';
import { INITIAL_CASH, SEED_LEDGER } from '../src/finance/financeSeed';
import type { CanonicalLedgerEntry } from '../src/finance/canonicalLedger';

assert.equal(INITIAL_CASH,0,'new accounts must not get virtual cash');
assert.deepEqual(SEED_LEDGER,[],'new accounts must not get example trades');

const previous:CanonicalLedgerEntry[]=[
  {id:'real-test-outflow',date:'2026-09-24',kind:'other',label:'已記錄的現金支出',amount:-23979},
];

const legacy=auditCashSources(LEGACY_DEFAULT_CASH,previous);
assert.equal(legacy.opening,750000);
assert.equal(legacy.cashBalance,726021);
assert.equal(legacy.possibleLegacyDefault,true);
assert.deepEqual(previous,[{id:'real-test-outflow',date:'2026-09-24',kind:'other',label:'已記錄的現金支出',amount:-23979}],
  'audit must never mutate historical entries');

const migrated=migrateLegacyOpeningCash(LEGACY_DEFAULT_CASH,previous);
assert.equal(migrated.initialCash,0);
assert.equal(migrated.migrated,true);
assert.equal(migrated.removedLegacyReversals,0);
assert.deepEqual(migrated.entries,previous,'real ledger entries must survive the migration');
assert.equal(auditCashSources(migrated.initialCash,migrated.entries).cashBalance,-23979);

const withGeneratedReversal:CanonicalLedgerEntry[]=[...previous,
  {id:'user-confirmed-reversal',date:'2026-09-24',kind:'other',label:LEGACY_REVERSAL_LABEL,amount:-750000}];
const adjusted=auditCashSources(LEGACY_DEFAULT_CASH,withGeneratedReversal);
assert.equal(adjusted.cashBalance,-23979);
assert.equal(adjusted.possibleLegacyDefault,false);
assert.equal(adjusted.hasLegacyReversal,true);

const normalizedReversal=migrateLegacyOpeningCash(LEGACY_DEFAULT_CASH,withGeneratedReversal);
assert.equal(normalizedReversal.initialCash,0);
assert.equal(normalizedReversal.removedLegacyReversals,1);
assert.deepEqual(normalizedReversal.entries,previous,
  'generated legacy reversal must be removed when opening cash is normalized');
assert.equal(auditCashSources(normalizedReversal.initialCash,normalizedReversal.entries).cashBalance,-23979,
  'migration must preserve the pre-migration cash balance when a reversal already exists');

const idempotent=migrateLegacyOpeningCash(normalizedReversal.initialCash,normalizedReversal.entries);
assert.equal(idempotent.migrated,false);
assert.deepEqual(idempotent.entries,previous);

const genuine=migrateLegacyOpeningCash(1_000_000,previous);
assert.equal(genuine.initialCash,1_000_000,'non-legacy opening cash must never be changed');
assert.deepEqual(genuine.entries,previous);

console.log('V3.1.12 CASH MIGRATION: PASS — legacy 750,000 removed, real ledger preserved, reversal normalized, idempotent');
