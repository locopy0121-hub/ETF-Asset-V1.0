import assert from 'node:assert/strict';
import fs from 'node:fs';

const assistant=fs.readFileSync('src/ai/aiAssistant.ts','utf8');
const screen=fs.readFileSync('src/screens/AiScreen.tsx','utf8');
const box=fs.readFileSync('src/components/AiQuestionBox.tsx','utf8');

for(const token of ["intent:'allocation'","intent:'ranking'","intent:'ledger'","資產配置","最近交易","賺最多"])
  assert.ok(assistant.includes(token),'missing AI capability: '+token);

assert.match(assistant,/holdingWeight/);
assert.match(assistant,/latestLedgerRows/);
assert.match(assistant,/持股損益排行/);
assert.match(assistant,/最近紀錄/);
assert.match(screen,/finance\.holdings\.length/);
assert.match(screen,/finance\.entries\.length/);
assert.match(screen,/ai\.items\.length/);
assert.match(screen,/目前資產配置？/);
assert.match(screen,/最近 5 筆交易？/);
assert.match(box,/flexWrap:'wrap'/,'AI quick actions should wrap instead of being clipped horizontally');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(fs.existsSync(core),'immutable finance core missing: '+core);

console.log('V3.2.23 AI capability hub regression PASS');
