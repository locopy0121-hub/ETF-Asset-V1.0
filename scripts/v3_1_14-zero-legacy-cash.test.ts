import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {
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
assert.equal(pkg.version,'3.2.1');
assert.equal(app.expo.version,'3.2.1');
assert.equal(app.expo.android.versionCode,30201);
assert.equal(app.expo.ios.buildNumber,'30201');

const runtimeSource=readFileSync('src/finance/FinanceRuntime.tsx','utf8');
const auditSource=readFileSync('src/finance/cashAudit.ts','utf8');
const settingsSource=readFileSync('src/screens/SettingsScreen.tsx','utf8');
const ledgerSource=readFileSync('src/screens/LedgerScreen.tsx','utf8');
for(const [name,source] of [
  ['FinanceRuntime',runtimeSource],
  ['cashAudit',auditSource],
  ['SettingsScreen',settingsSource],
  ['LedgerScreen',ledgerSource],
] as const){
  assert.doesNotMatch(source,/750000|750_000|750,000/,name+' must not contain the retired hard-coded cash amount');
}

assert.match(runtimeSource,/const SCHEMA=4/);
assert.match(runtimeSource,/forceOpeningCashZero:!parsedCashConfigured/);
assert.match(runtimeSource,/removeGeneratedLegacyReversals:true/);
assert.match(runtimeSource,/restoredCashConfigured=parsedCashConfigured\|\|explicitCashAdjustment/);
assert.doesNotMatch(runtimeSource,/initialCash!==750/);

const genuine:CanonicalLedgerEntry[]=[
  {id:'real-adjustment',date:'2026-09-28',kind:'other',label:'本人現金調整',amount:-23_871},
];
const generated:CanonicalLedgerEntry={
  id:LEGACY_REVERSAL_ID_PREFIX+'-stale',
  date:'2026-09-24',
  kind:'other',
  label:LEGACY_REVERSAL_LABEL,
  amount:-1,
};
assert.equal(isGeneratedLegacyReversal(generated),true,'generated reversal detection must rely on provenance, not magic amount');

const repaired=migrateLegacyOpeningCash(123_456,[...genuine,generated],{
  forceOpeningCashZero:true,
  removeGeneratedLegacyReversals:true,
});
assert.equal(repaired.initialCash,0,'unconfigured opening cash must be normalized to zero');
assert.equal(repaired.removedLegacyReversals,1);
assert.deepEqual(repaired.entries,genuine);
assert.equal(auditCashSources(repaired.initialCash,repaired.entries).cashBalance,-23_871);

const preserved=migrateLegacyOpeningCash(123_456,genuine,{
  forceOpeningCashZero:false,
  removeGeneratedLegacyReversals:true,
});
assert.equal(preserved.initialCash,123_456,'explicitly configured opening cash must remain user data');

const lookalike:CanonicalLedgerEntry={
  id:'user-adjustment',
  date:'2026-09-24',
  kind:'other',
  label:LEGACY_REVERSAL_LABEL,
  amount:-1,
};
assert.equal(isGeneratedLegacyReversal(lookalike),false,'label alone must never authorize deletion');

const backupText=JSON.stringify({
  product:'TF Asset',version:2,appVersion:'3.1.17',exportedAt:'2026-09-28T09:00:00.000Z',
  payload:{[TF_LEDGER_KEY]:JSON.stringify({schema:4,initialCash:0,cashConfigured:false,entries:genuine})},
  backupHistory:[],
});
const parsedBackup=parseBackupDocument(backupText);
assert.equal(parsedBackup.inspection.ledgerEntries,1,'schema 4 ledger must remain backup-compatible');

assert.doesNotMatch(settingsSource,/沖回 750|LEGACY_DEFAULT_CASH|confirmLegacyCashCorrection/);
assert.doesNotMatch(ledgerSource,/possibleLegacyDefault|hasLegacyReversal/);

console.log('V3.1.18 zero-cash normalization PASS — no hard-coded legacy amount, no generated reversal action, schema 4 compatible');
