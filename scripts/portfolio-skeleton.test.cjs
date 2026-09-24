// Verify the current shared portfolio-list renderer, not the obsolete inline JSX.
// Rendering on Android and actual screen-width behavior remain device acceptance gates.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const screen=read('src/screens/PortfolioScreen.tsx');
const table=read('src/components/PortfolioHoldingTable.tsx');
const model=read('src/domain/portfolioList.ts');
const editor=read('src/components/PageFrameSettingsModal.tsx');

assert.match(screen,/PortfolioHoldingTable/,'Portfolio must render the shared holding table');
assert.match(table,/fixedColumn/,'Portfolio must have a fixed ETF identity column');
assert.match(table,/<ScrollView horizontal/,'Numeric columns must scroll independently');
assert.ok(table.includes('ETF 代號｜名稱')||table.includes('ETF代號｜名稱'),'First column must label ETF code and name');
assert.match(table,/EtfBadgeRow/,'Badges must remain inside the fixed identity column, not numeric columns');
for(const label of ['股數','即時','純均價','含費均價','損益','報酬率']) {
  assert.ok(model.includes(label),'Missing portfolio field '+label);
}
const rowHeightBindings=table.split('height:config.rowHeight').length-1;
assert.equal(rowHeightBindings,2,'Identity and numeric rows must share the same configured row height');
assert.ok(model.includes("field('tradeAvg'"),'Portfolio must expose pure trade average');
assert.ok(model.includes("field('costAvg'"),'Portfolio must expose fee-included average');
assert.match(editor,/PortfolioListEditor/,'The portfolio list must be editable in page settings');
assert.ok(!screen.includes('item.weight*2'),'Allocation bar must use true portfolio percentage');
console.log('TF_ASSET_PORTFOLIO_SKELETON: PASS (shared renderer, fixed identity, scrollable values, editor)');
