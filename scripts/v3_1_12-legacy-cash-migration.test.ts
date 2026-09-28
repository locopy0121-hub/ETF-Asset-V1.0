import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {
  LEGACY_DEFAULT_CASH,
  LEGACY_REVERSAL_LABEL,
  auditCashSources,
  migrateLegacyOpeningCash,
} from '../src/finance/cashAudit';
import type {CanonicalLedgerEntry} from '../src/finance/canonicalLedger';

const app=JSON.parse(readFileSync('app.json','utf8'));
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(pkg.version,'3.1.13');
assert.equal(app.expo.version,'3.1.13');
assert.equal(app.expo.android.versionCode,30113);
assert.equal(app.expo.ios.buildNumber,'30113');

const genuine:CanonicalLedgerEntry[]=[
  {id:'real-adjustment',date:'2026-09-28',kind:'other',label:'本人現金調整',amount:-23_871},
];
const legacy=migrateLegacyOpeningCash(LEGACY_DEFAULT_CASH,genuine);
assert.equal(legacy.migrated,true);
assert.equal(legacy.initialCash,0);
assert.deepEqual(legacy.entries,genuine,'migration must preserve genuine ledger entries');
assert.equal(auditCashSources(legacy.initialCash,legacy.entries).cashBalance,-23_871);

const priorCorrection:CanonicalLedgerEntry[]=[
  ...genuine,
  {id:'legacy-opening-cash-reversal',date:'2026-09-28',kind:'other',label:LEGACY_REVERSAL_LABEL,amount:-LEGACY_DEFAULT_CASH},
];
const before=auditCashSources(LEGACY_DEFAULT_CASH,priorCorrection).cashBalance;
const normalized=migrateLegacyOpeningCash(LEGACY_DEFAULT_CASH,priorCorrection);
assert.equal(normalized.removedLegacyReversals,1);
assert.equal(auditCashSources(normalized.initialCash,normalized.entries).cashBalance,before,
  'normalizing a prior system reversal must not change the resulting cash balance');
assert.deepEqual(normalized.entries,genuine);

const idempotent=migrateLegacyOpeningCash(normalized.initialCash,normalized.entries);
assert.equal(idempotent.migrated,false);
assert.deepEqual(idempotent.entries,genuine);

const realOpening=migrateLegacyOpeningCash(750_001,genuine);
assert.equal(realOpening.initialCash,750_001,'only the exact legacy sentinel may be migrated');
assert.deepEqual(realOpening.entries,genuine);

const runtime=readFileSync('src/finance/FinanceRuntime.tsx','utf8');
assert.match(runtime,/const SCHEMA=3/);
assert.match(runtime,/sourceSchema===1\|\|sourceSchema===2\|\|sourceSchema===SCHEMA/);
assert.match(runtime,/migrateLegacyOpeningCash/);
assert.match(runtime,/removeOrphanGeneratedReversal:sourceSchema<SCHEMA/);
assert.match(runtime,/setInitialCash\(normalized\.initialCash\)/);
assert.match(runtime,/setEntries\(normalized\.entries\)/);

const seed=readFileSync('src/finance/financeSeed.ts','utf8');
assert.match(seed,/INITIAL_CASH=0/);
assert.match(seed,/SEED_LEDGER:readonly CanonicalLedgerEntry\[\]=\[\]/);

console.log('V3.1.13 legacy opening cash migration PASS — phantom 750,000 removed without touching real ledger data');
