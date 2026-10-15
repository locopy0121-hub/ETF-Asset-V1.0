import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');
const market=read('src/screens/MarketResearchScreen.tsx');
const editor=read('src/components/PageLayoutToolWorkbench.tsx');
const visual=read('src/components/MarketEditableContent.tsx');
const constituents=read('src/components/EtfConstituentsContent.tsx');
const dividend=read('src/components/StockDividendHistoryContent.tsx');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json')).expo;
const [vMajor42=0,vMinor42=0,vPatch42=0]=pkg.version.split('.').map(Number);assert.ok(vMajor42>4||(vMajor42===4&&(vMinor42>0||(vMinor42===0&&vPatch42>=42))),'market research editor remains supported');
assert.equal(app.version,pkg.version);
const build=Number(pkg.version.split('.')[0])*10000+Number(pkg.version.split('.')[1])*100+Number(pkg.version.split('.')[2]);
assert.equal(app.android.versionCode,build);
assert.equal(app.ios.buildNumber,String(build));
assert.ok(read('src/settings/BackupService.ts').includes("APP_VERSION='"+pkg.version+"'"));
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
