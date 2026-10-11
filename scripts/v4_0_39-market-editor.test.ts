import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const screen=read('src/screens/MarketResearchScreen.tsx');
const taiex=read('src/components/TaiexIndexCard.tsx');
const settings=read('src/screens/SettingsScreen.tsx');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json')).expo;

assert.equal(pkg.version,'4.0.39');
assert.equal(app.version,pkg.version);
assert.equal(app.android.versionCode,40039);
assert.equal(app.ios.buildNumber,'40039');
assert.match(settings,/const VERSION='4\.0\.39'/);
assert.match(settings,/const BUILD='40039'/);

// A real frame from MarketResearchScreen must appear in the independent preview.
// The background page-header artwork must not replace the selected index card.
assert.match(screen,/previewElements=\{frameData\}/);
assert.match(workbench,/actualMarketPreviewKeys=new Set/);
for(const key of ['market-index','market-search','market-summary','market-chart','market-details']){
  assert.ok(workbench.includes("'"+key+"'"),'market frame missing from real preview: '+key);
}
assert.match(workbench,/page==='market'\?actualMarketPreviewKeys\.has\(key\)/);
assert.match(workbench,/pageKey==='market'\)\{/);
assert.match(workbench,/actual\.props\.children/);
assert.match(workbench,/pageKey==='market'\|\|\(pageKey==='home'&&frameKey==='holding-quotes'\)/);

// Market data is read-only. Labels, values and charts select a visual-only target.
assert.match(workbench,/selection\.id\.startsWith\('market:index:'\)/);
assert.match(workbench,/id:'market:index:value'/);
assert.match(workbench,/id:'market:index:chart'/);
assert.match(workbench,/selection\.id\.startsWith\('market:index:'\)\)/);
for(const id of ['title','subtitle','value','change','status']){
  assert.match(taiex,new RegExp('id="market:index:'+id+'"'));
}
for(const part of ['open','previous','high','low','year-high','year-low']){
  assert.match(taiex,new RegExp('<IndexMetric id="'+part+'"'));
}
assert.match(taiex,/runtime\.onSelect\?\.\(\{id,label,kind\}\)/);
assert.match(taiex,/editor\.displayConfig\.layoutTargets/);
assert.match(taiex,/editorReadOnly style=/);
assert.match(taiex,/if\(!layoutPreview\.active\)void refresh\(true\)/);
assert.match(taiex,/if\(!layoutPreview\.active\)setRange\(item\.id\)/);

// Engineer-mode market overrides must survive persistence and reload.
assert.match(read('src/maintenance/inspectionModel.ts'),/home\|ledger\|portfolio\|market\|dividend\|ai\|settings/);

// The protected top-level system settings structure must remain intact.
assert.match(settings,/駐點維護工程師｜全局總開關/);
assert.match(settings,/systemPanel==='engineer'/);
assert.doesNotMatch(read('src/finance/FinanceRuntime.tsx'),/market:index:/);
console.log('V4.0.39 real market preview, target selection, read-only index values, protected settings PASS');
