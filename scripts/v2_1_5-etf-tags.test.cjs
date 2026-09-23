// Source-integration smoke only. Runtime feed and Android visual acceptance remain separate gates.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const model=read('src/domain/uiModels.ts');
const editor=read('src/components/EtfBadgeEditor.tsx');
const renderer=read('src/components/HoldingQuoteModule.tsx');
const normalize=read('src/editor/editorModel.ts');
const market=read('src/market/MarketRuntime.tsx');
const home=read('src/screens/HomeScreen.tsx');
const portfolio=read('src/screens/PortfolioScreen.tsx');
for(const name of ['etfType','dividendType']){
  assert.ok(model.includes("field:'"+name+"'"),name+' should have its own AB field');
  assert.ok(editor.includes("'"+name+"'"),name+' should be editable');
  assert.ok(renderer.includes("field==='"+name+"'"),name+' should render');
  assert.ok(normalize.includes("'"+name+"'"),name+' should migrate to saved settings');
  assert.ok(home.includes("tags.get(item.symbol)?."+name),name+' should appear on Home');
  assert.ok(portfolio.includes("tags.get(item.symbol)?."+name),name+' should appear in Portfolio');
}
assert.ok(market.includes('https://openapi.twse.com.tw/v1/opendata/t187ap47_L'));
assert.ok(renderer.includes("類型待確認")&&renderer.includes("配息待確認"));
assert.ok(market.includes("if(!etfType&&!dividendType)continue"));
for(const forbidden of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts']){
  assert.ok(fs.existsSync(forbidden));
}
console.log('V2.1.5 ETF AB field source integration smoke PASS; official feed and device remain unverified.');
