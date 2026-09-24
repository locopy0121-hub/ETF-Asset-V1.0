import assert from 'node:assert/strict';
import { auditCashSources, LEGACY_DEFAULT_CASH, LEGACY_REVERSAL_LABEL } from '../src/finance/cashAudit';
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
const adjusted=auditCashSources(LEGACY_DEFAULT_CASH,[...previous,
  {id:'user-confirmed-reversal',date:'2026-09-24',kind:'other',label:LEGACY_REVERSAL_LABEL,amount:-750000}]);
assert.equal(adjusted.cashBalance,-23979);
assert.equal(adjusted.possibleLegacyDefault,false);
assert.equal(adjusted.hasLegacyReversal,true);
assert.equal(auditCashSources(0,previous).cashBalance,-23979);
assert.equal(auditCashSources(1000000,previous).possibleLegacyDefault,false);
assert.equal(auditCashSources(750000,[]).possibleLegacyDefault,true);
console.log('V2.3.3 CASH AUDIT: PASS — default zero, legacy retained, explicit reversal and read-only audit');
