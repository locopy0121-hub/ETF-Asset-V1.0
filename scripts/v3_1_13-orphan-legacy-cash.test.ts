import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {
  LEGACY_DEFAULT_CASH,
  LEGACY_REVERSAL_ID_PREFIX,
  LEGACY_REVERSAL_LABEL,
  auditCashSources,
  isGeneratedLegacyReversal,
  migrateLegacyOpeningCash,
} from '../src/finance/cashAudit';
import type {CanonicalLedgerEntry} from '../src/finance/canonicalLedger';
import {parseBackupDocument,TF_LEDGER_KEY} from '../src/settings/backupDocumentFormat';

const app=JSON.parse(readFileSync('app.json','utf8'));
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(pkg.version,'3.1.13');
assert.equal(app.expo.version,'3.1.13');
assert.equal(app.expo.android.versionCode,30113);
assert.equal(app.expo.ios.buildNumber,'30113');

const genuine:CanonicalLedgerEntry[]=[
  {id:'real-adjustment',date:'2026-09-28',kind:'other',label:'本人現金調整',amount:-23_871},
];
const generated=(suffix:string):CanonicalLedgerEntry=>({
  id:LEGACY_REVERSAL_ID_PREFIX+'-'+suffix,
  date:'2026-09-24',
  kind:'other',
  label:LEGACY_REVERSAL_LABEL,
  amount:-LEGACY_DEFAULT_CASH,
});

const orphan=[...genuine,generated('1727164800000')];
assert.equal(auditCashSources(0,orphan).cashBalance,-773_871,
  'reproduce device state: opening is already 0 but one generated -750,000 reversal remains');
const repaired=migrateLegacyOpeningCash(0,orphan,{removeOrphanGeneratedReversal:true});
assert.equal(repaired.migrated,true);
assert.equal(repaired.orphanLegacyReversalRemoved,true);
assert.equal(repaired.removedLegacyReversals,1);
assert.deepEqual(repaired.entries,genuine);
assert.equal(auditCashSources(repaired.initialCash,repaired.entries).cashBalance,-23_871,
  'orphan system reversal must no longer distort current cash');

const schema3Idempotent=migrateLegacyOpeningCash(0,orphan);
assert.equal(schema3Idempotent.migrated,false,
  'schema 3 must not keep deleting historical entries on every app start');
assert.deepEqual(schema3Idempotent.entries,orphan);

const duplicates=[...genuine,generated('1'),generated('2')];
const beforeDuplicate=auditCashSources(LEGACY_DEFAULT_CASH,duplicates).cashBalance;
const onePass=migrateLegacyOpeningCash(LEGACY_DEFAULT_CASH,duplicates);
assert.equal(onePass.removedLegacyReversals,1,'remove at most one generated reversal');
assert.equal(onePass.entries.filter(isGeneratedLegacyReversal).length,1,'a second historical reversal must remain auditable');
assert.equal(auditCashSources(onePass.initialCash,onePass.entries).cashBalance,beforeDuplicate,
  'sentinel normalization with duplicate reversals must preserve pre-migration balance');

const userLookalike:CanonicalLedgerEntry={
  id:'other-user-adjustment-1',date:'2026-09-24',kind:'other',
  label:LEGACY_REVERSAL_LABEL,amount:-LEGACY_DEFAULT_CASH,
};
assert.equal(isGeneratedLegacyReversal(userLookalike),false);
const keepUser=migrateLegacyOpeningCash(LEGACY_DEFAULT_CASH,[...genuine,userLookalike]);
assert.equal(keepUser.entries.some(entry=>entry.id===userLookalike.id),true,
  'same label and amount are insufficient provenance for deletion');

const backupText=JSON.stringify({
  product:'TF Asset',version:2,appVersion:'3.1.13',exportedAt:'2026-09-28T08:30:00.000Z',
  payload:{[TF_LEDGER_KEY]:JSON.stringify({schema:3,initialCash:0,entries:genuine})},
  backupHistory:[],
});
const parsedBackup=parseBackupDocument(backupText);
assert.equal(parsedBackup.inspection.ledgerEntries,1,'schema 3 ledger must remain export/import compatible');

const runtime=readFileSync('src/finance/FinanceRuntime.tsx','utf8');
assert.match(runtime,/const SCHEMA=3/);
assert.match(runtime,/sourceSchema===1\|\|sourceSchema===2\|\|sourceSchema===SCHEMA/);
assert.match(runtime,/removeOrphanGeneratedReversal:sourceSchema<SCHEMA/);

console.log('V3.1.13 orphan legacy cash PASS — opening 0 + hidden generated -750,000 is repaired once, user entries preserved');
