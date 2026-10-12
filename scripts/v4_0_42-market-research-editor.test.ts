import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');
const market=read('src/screens/MarketResearchScreen.tsx');
const editor=read('src/components/PageLayoutToolWorkbench.tsx');
const visual=read('src/components/MarketEditableContent.tsx');
const constituents=read('src/components/EtfConstituentsContent.tsx');
const dividend=read('src/components/StockDividendHistoryContent.tsx');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json')).expo;
assert.equal(pkg.version,'4.0.42');
assert.equal(app.version,pkg.version);
assert.equal(app.android.versionCode,40042);
assert.equal(app.ios.buildNumber,'40042');
assert.match(read('src/settings/BackupService.ts'),/APP_VERSION='4\.0\.42'/);
for(const id of ['market:details:etf','market:details:institution:controls',
  'market:details:dividend','market:details:nav-list','market:details:news-list']){
  assert.ok(market.includes('id="'+id+'"'),'research module visual editor missing '+id);
}
for(const id of ['market:details:institution:heading','market:details:institution:total']){
  assert.ok(market.includes('id="'+id+'"'),'institution target missing '+id);
}
assert.match(market,/market:details:fact:'\+label\+':label/);
assert.match(market,/market:details:fact:'\+label\+':value/);
assert.match(market,/market:details:institution:'\+item\.key\+':value/);
assert.match(market,/MarketPreviewActionGuard><Pressable onPress=\{\(\)=>void Linking\.openURL/);
assert.match(market,/MarketPreviewActionGuard>\{relatedNews\.map/);
assert.match(editor,/id:'market:details:etf'/);
assert.match(editor,/\['market-index','market-search','market-summary','market-chart','market-details'\]\.includes\(item\.key\)/);
assert.match(visual,/original\?\.flex!==undefined/);
assert.match(constituents,/native:EtfConstituentsContent:weight:11/);
assert.match(dividend,/fetchStockDividendHistory\(symbol,years/,'official dividend source unchanged');
assert.doesNotMatch(read('src/finance/FinanceRuntime.tsx'),/market:details:/);
assert.match(read('src/screens/SettingsScreen.tsx'),/駐點維護工程師｜全局總開關/);
console.log('V4.0.42 official research facts, ETF, dividends, institutions, NAV and news editor PASS');
