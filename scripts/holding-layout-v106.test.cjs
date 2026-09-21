const fs=require('fs');
const assert=require('assert');

const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
const portfolio=fs.readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const collection=fs.readFileSync('src/components/HoldingQuoteCollection.tsx','utf8');
const card=fs.readFileSync('src/components/HoldingQuoteModule.tsx','utf8');
const editor=fs.readFileSync('src/editor/editorModel.ts','utf8');

assert.ok(!/sortHoldingQuotes\(finance\.holdings[\s\S]{0,80}slice\(/.test(home),'home must not slice holdings after sorting');
for(const mode of ['grid2','grid3','horizontal','paged2']){
  assert.ok(portfolio.includes(mode),'portfolio missing legacy layout '+mode);
  assert.ok(collection.includes(mode),'collection missing legacy layout '+mode);
}
assert.ok(home.includes('holdingColumns'),'home must expose independent holding column state');
assert.ok(home.includes('holdingScrollMode'),'home must expose independent holding scroll state');
assert.ok(home.includes('橫向滑動'),'home must allow horizontal scroll composition');
assert.ok(collection.includes('FlatList'),'large holding sets must use virtualized rendering');
assert.ok(collection.includes('snapToInterval'),'horizontal layout must support snap');
assert.ok(collection.includes("layout={narrow?'narrow':'full'}"),'multi-column layout must use narrow card');
assert.ok(card.includes('narrowCard'),'quote card must support narrow layout');
assert.ok(editor.includes('holdingLayoutMode'),'legacy layout selection must remain persisted for migration');
assert.ok(editor.includes('holdingColumns'),'column selection must persist in page editor display config');
assert.ok(editor.includes('holdingScrollMode'),'scroll selection must persist in page editor display config');
assert.match(editor,/home:\s*\{\s*quoteStyle:'quote',\s*sortKey:'pnl',\s*holdingLayoutMode:'grid2',\s*holdingColumns:2/,'home must preserve restored two-column default');
assert.match(editor,/portfolio:\s*\{\s*quoteStyle:'chart',\s*sortKey:'manual',\s*portfolioViewMode:'list',\s*holdingLayoutMode:'list',\s*holdingColumns:1/,'portfolio layout must have independent default');

console.log('V1.0.6 HOLDING LAYOUT: PASS');
