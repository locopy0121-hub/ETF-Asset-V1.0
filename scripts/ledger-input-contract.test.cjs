const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('src/screens/LedgerScreen.tsx','utf8');
const runtime=fs.readFileSync('src/finance/FinanceRuntime.tsx','utf8');
const core=fs.readFileSync('src/finance/canonicalLedger.ts','utf8');

for(const label of ['買進','賣出','股息','其他','實際手續費','實際證交稅','正式入帳','返回修改']) {
  assert.ok(src.includes(label),'missing ledger UX: '+label);
}
assert.match(src,/DatePickerModal/,'ledger must use date selection flow');
assert.match(src,/calendarGrid/,'ledger date picker must render a real calendar grid');
assert.match(src,/\['日','一','二','三','四','五','六'\]/,'ledger date picker must render weekday headings');
assert.match(src,/前一年/,'ledger date picker must support direct year navigation');
assert.match(src,/上個月/,'ledger date picker must support direct month navigation');
assert.match(src,/setSelectedDate\(viewYear,viewMonth,day\)/,'ledger date picker must allow selecting a calendar day');
for(const shortcut of ['上月','前一天','今天','後一天','下月']) assert.ok(src.includes(shortcut),'missing date shortcut: '+shortcut);
assert.match(src,/keyboardType/,'numeric inputs must request numeric keyboard');
assert.match(src,/freezeTradeEntry/,'trade preview and commit must use canonical freeze function');
assert.match(src,/已覆寫/,'manual fee/tax override state must be visible');
assert.ok(!src.includes('placeholder="actualFee"'),'technical actualFee key must never appear in UI');
assert.ok(!src.includes('DEMO_LEDGER'),'ledger must not consume demo ledger');
assert.match(runtime,/AsyncStorage/,'ledger must persist');
assert.match(runtime,/calculateCanonicalLedgerSnapshot/,'runtime must consume canonical snapshot');
assert.match(runtime,/validateLedgerSequence/,'runtime must guard invalid ledger sequence');
assert.match(src,/賣出股數不可大於目前持有股數/,'ledger must show oversell validation');
assert.match(src,/useMarketRuntime/,'ledger symbol lookup must use shared market runtime');
assert.match(src,/market\.catalog/,'ETF prefix suggestions must use market catalog, not active quotes');
assert.match(src,/recentSymbols/,'recent ETF shortcuts must remain directly below input');
assert.match(core,/actualFee == null \? estimate\.commission/,'missing frozen actualFee default');
assert.match(core,/actualTax == null \? estimated\.tax/,'missing frozen actualTax default');
console.log('TF_ASSET_LEDGER_INPUT_CONTRACT: PASS');
