const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('src/screens/PortfolioScreen.tsx','utf8');

assert.match(src,/fixedColumn/,'portfolio must have fixed ETF identity column');
assert.match(src,/ScrollView horizontal/,'numeric columns must scroll independently');
assert.match(src,/ETF代號｜名稱/,'first column label must be ETF code + name');
for(const label of ['股數','即時','純均價','含費均價','損益','報酬率']) {
  assert.ok(src.includes(label),'missing portfolio column '+label);
}
assert.match(src,/rowHeight=\{tableRowHeight\}/,'portfolio table must receive one shared configurable row height');
assert.match(src,/fixedRow,\{height:rowHeight\}/,'fixed identity rows must use the shared row height');
assert.match(src,/rightRow,\{height:rowHeight\}/,'numeric rows must use the shared row height');
assert.match(src,/tradeAvg/,'portfolio must expose pure trade average');
assert.match(src,/costAvg/,'portfolio must expose fee-included average');
assert.ok(!src.includes('item.weight*2'),'allocation bar must use true portfolio percentage');
console.log('TF_ASSET_PORTFOLIO_SKELETON: PASS');
