import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {
  LEGACY_REVERSAL_ID_PREFIX,
  LEGACY_REVERSAL_LABEL,
  isGeneratedLegacyReversal,
  migrateLegacyOpeningCash,
} from '../src/finance/cashAudit';
import type {CanonicalLedgerEntry} from '../src/finance/canonicalLedger';
import {parseBackupDocument,TF_LEDGER_KEY} from '../src/settings/backupDocumentFormat';

const app=JSON.parse(readFileSync('app.json','utf8'));
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(pkg.version,'3.1.16');
assert.equal(app.expo.version,'3.1.16');
assert.equal(app.expo.android.versionCode,30116);
assert.equal(app.expo.ios.buildNumber,'30116');

const genuine:CanonicalLedgerEntry[]=[
  {id:'real-adjustment',date:'2026-09-28',kind:'other',label:'本人現金調整',amount:-23_871},
];
const generated:CanonicalLedgerEntry={
  id:LEGACY_REVERSAL_ID_PREFIX+'-orphan',
  date:'2026-09-24',
  kind:'other',
  label:LEGACY_REVERSAL_LABEL,
  amount:-1,
};
assert.equal(isGeneratedLegacyReversal(generated),true);
const repaired=migrateLegacyOpeningCash(0,[...genuine,generated],{
  forceOpeningCashZero:true,
  removeGeneratedLegacyReversals:true,
});
assert.equal(repaired.initialCash,0);
assert.equal(repaired.removedLegacyReversals,1);
assert.deepEqual(repaired.entries,genuine);

const backupText=JSON.stringify({
  product:'TF Asset',version:2,appVersion:'3.1.16',exportedAt:'2026-09-28T09:00:00.000Z',
  payload:{[TF_LEDGER_KEY]:JSON.stringify({schema:4,initialCash:0,cashConfigured:false,entries:genuine})},
  backupHistory:[],
});
assert.equal(parseBackupDocument(backupText).inspection.ledgerEntries,1);

const runtime=readFileSync('src/finance/FinanceRuntime.tsx','utf8');
const settings=readFileSync('src/screens/SettingsScreen.tsx','utf8');
assert.doesNotMatch(runtime,/750000|750_000|750,000/);
assert.doesNotMatch(settings,/750000|750_000|750,000|confirmLegacyCashCorrection/);

console.log('V3.1.16 provenance migration PASS — stale system reversal removed without amount matching');
