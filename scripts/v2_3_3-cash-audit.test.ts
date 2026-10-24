import assert from 'node:assert/strict';
import {
  auditCashSources,
  LEGACY_REVERSAL_ID_PREFIX,
  LEGACY_REVERSAL_LABEL,
  isGeneratedLegacyReversal,
  migrateLegacyOpeningCash,
} from '../src/finance/cashAudit';
import { INITIAL_CASH, SEED_LEDGER } from '../src/finance/financeSeed';
import type { CanonicalLedgerEntry } from '../src/finance/canonicalLedger';

assert.equal(INITIAL_CASH,0,'new accounts must not get virtual cash');
assert.deepEqual(SEED_LEDGER,[],'new accounts must not get example trades');

const previous:CanonicalLedgerEntry[]=[
  {id:'real-test-outflow',date:'2026-09-24',kind:'other',label:'已記錄的現金支出',amount:-23_979},
];
assert.equal(auditCashSources(0,previous).cashBalance,-23_979);
assert.deepEqual(previous,[{id:'real-test-outflow',date:'2026-09-24',kind:'other',label:'已記錄的現金支出',amount:-23_979}],
  'audit must never mutate historical entries');

const normalized=migrateLegacyOpeningCash(888_888,previous,{forceOpeningCashZero:true});
assert.equal(normalized.initialCash,0);
assert.equal(normalized.migrated,true);
assert.deepEqual(normalized.entries,previous);

const generated:CanonicalLedgerEntry={
  id:LEGACY_REVERSAL_ID_PREFIX+'-old',
  date:'2026-09-24',
  kind:'other',
  label:LEGACY_REVERSAL_LABEL,
  amount:-1,
};
assert.equal(isGeneratedLegacyReversal(generated),true);
const cleaned=migrateLegacyOpeningCash(0,[...previous,generated],{removeGeneratedLegacyReversals:true});
assert.equal(cleaned.removedLegacyReversals,1);
assert.deepEqual(cleaned.entries,previous);

console.log('V3.1.14 CASH NORMALIZATION: PASS — zero opening cash and provenance cleanup without magic amount');
