import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');
const market=read('src/screens/MarketResearchScreen.tsx');
const target=read('src/components/MarketEditableContent.tsx');
const tools=read('src/components/PageLayoutToolWorkbench.tsx');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json')).expo;
assert.ok(Number(pkg.version.split('.')[2])>=40,'V4.0.40 market content editor must remain supported');
assert.equal(app.version,pkg.version);
const build=Number(pkg.version.split('.')[0])*10000+Number(pkg.version.split('.')[1])*100+Number(pkg.version.split('.')[2]);
assert.equal(app.android.versionCode,build);
assert.equal(app.ios.buildNumber,String(build));
assert.ok(read('src/screens/SettingsScreen.tsx').includes("const BUILD='"+build+"'"));
assert.ok(read('src/settings/BackupService.ts').includes("APP_VERSION='"+pkg.version+"'"));

// Each market visual points to stable persisted page settings, not a fake quote.
for(const id of ['market:search:input','market:search:hint','market:summary:title',
  'market:summary:context','market:summary:price','market:summary:change',
  'market:summary:status','market:summary:previous','market:summary:volume','market:summary:holding']){
  assert.ok(market.includes('id="'+id+'"'),'missing editable market target '+id);
}
assert.match(market,/<MarketPreviewActionGuard><TextInput/);
assert.match(market,/<MarketPreviewActionGuard><View>\{results/);
assert.match(market,/<MarketPreviewActionGuard><Pressable onPress=\{\(\)=>void market\.refresh/);
assert.match(target,/runtime\.active\?'none':'auto'/,'preview never runs navigation, refresh, search interaction');
assert.match(target,/editor\.displayConfig\.layoutTargets/,'real App reads persisted appearance');
assert.match(target,/runtime\.onSelect\?\.\(\{id,kind,label\}\)/);
assert.match(target,/runtime\.onSelect\?\.\(\{id,kind:'card',label\}\)/);
assert.match(tools,/\['market-index','market-search','market-summary'(?:,'market-chart')?\]\.includes\(item\.key\)\?'auto':'none'/);
assert.match(tools,/id:'market:summary:price'/);
assert.match(tools,/id:'market:search:input'/);
assert.match(tools,/selection\.id\.startsWith\('market:'\)/);

// Protected system settings and market SSOT were not restructured.
assert.match(read('src/screens/SettingsScreen.tsx'),/駐點維護工程師｜全局總開關/);
assert.doesNotMatch(read('src/finance/FinanceRuntime.tsx'),/market:summary:price/);
assert.doesNotMatch(read('src/market/MarketRuntime.tsx'),/market:summary:price/);
console.log('V4.0.40 market search & live quote editable content, preview action isolation PASS');
