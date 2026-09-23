const fs=require('fs');
const assert=require('assert');

const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
const portfolio=fs.readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const collection=fs.readFileSync('src/components/HoldingQuoteCollection.tsx','utf8');
const card=fs.readFileSync('src/components/HoldingQuoteModule.tsx','utf8');
const editor=fs.readFileSync('src/editor/editorModel.ts','utf8');

assert.ok(!/sortHoldingQuotes\(finance\.holdings[\s\S]{0,80}slice\(/.test(home),'home must not slice holdings after sorting');
for(const mode of ['grid2','grid3','horizontal','paged2']){
  assert.ok(home.includes(mode),'home missing layout '+mode);
  assert.ok(portfolio.includes(mode),'portfolio missing layout '+mode);
  assert.ok(collection.includes(mode),'collection missing layout '+mode);
}
assert.ok(collection.includes('pagingEnabled'),'paged layout must support swipe paging');
assert.ok(collection.includes('snapToInterval'),'horizontal layout must support snap');
assert.ok(collection.includes("layout=\"narrow\""),'multi-column layout must use narrow card');
assert.ok(card.includes("narrowCard"),'quote card must support narrow layout');
assert.ok(editor.includes('holdingLayoutMode'),'layout selection must persist in page editor display config');
assert.match(editor,/home:\s*\{\s*quoteStyle:'quote',\s*sortKey:'pnl',\s*holdingLayoutMode:'grid2'/,'home layout must preserve the restored two-column default');
assert.match(editor,/portfolio:\s*\{\s*quoteStyle:'chart',\s*sortKey:'manual',\s*portfolioViewMode:'list',\s*holdingLayoutMode:'list'/,'portfolio layout must have independent default');
assert.ok(editor.includes('portfolioList:DEFAULT_PORTFOLIO_LIST'),'portfolio default should preserve editable list configuration');
assert.ok(editor.includes('etfBadges:DEFAULT_ETF_BADGES'),'portfolio default should preserve independent ETF labels');

console.log('V1.0.6 HOLDING LAYOUT: PASS');
