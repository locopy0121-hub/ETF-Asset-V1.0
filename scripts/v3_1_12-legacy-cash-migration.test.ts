import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import {
  LEGACY_REVERSAL_ID_PREFIX,
  LEGACY_REVERSAL_LABEL,
  auditCashSources,
  migrateLegacyOpeningCash,
} from '../src/finance/cashAudit';
import type {CanonicalLedgerEntry} from '../src/finance/canonicalLedger';

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
  id:LEGACY_REVERSAL_ID_PREFIX+'-compat',
  date:'2026-09-24',
  kind:'other',
  label:LEGACY_REVERSAL_LABEL,
  amount:-1,
};

const normalized=migrateLegacyOpeningCash(456_789,[...genuine,generated],{
  forceOpeningCashZero:true,
  removeGeneratedLegacyReversals:true,
});
assert.equal(normalized.initialCash,0);
assert.equal(normalized.removedLegacyReversals,1);
assert.deepEqual(normalized.entries,genuine);
assert.equal(auditCashSources(normalized.initialCash,normalized.entries).cashBalance,-23_871);

const runtime=readFileSync('src/finance/FinanceRuntime.tsx','utf8');
assert.match(runtime,/const SCHEMA=4/);
assert.match(runtime,/forceOpeningCashZero:!parsedCashConfigured/);
assert.match(runtime,/removeGeneratedLegacyReversals:true/);
assert.doesNotMatch(runtime,/750000|750_000|750,000/);

console.log('V3.1.16 migration compatibility PASS — unconfigured opening cash is zero and stale generated reversal is removed');
