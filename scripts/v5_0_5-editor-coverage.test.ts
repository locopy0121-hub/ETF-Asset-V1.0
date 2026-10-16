import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGE_FRAMES} from '../src/domain/frameRegistry';
import {resolvePreviewFrameKeys,supportsCardContentEditor} from '../src/editor/previewCoverage';
const mounted={
  home:['asset-dashboard','profit-analysis','pnl-detail','dashboard-quick-actions','market-news','holding-quotes'],
  ledger:['quick-entry','ledger-list','monthly-summary'],
  portfolio:['holding-dashboard','allocation','holding-view'],
  market:['market-index','market-search','market-watchlist','market-summary','market-chart','market-details'],
  dividend:['dividend-summary','dividend-ai','dividend-calendar','dividend-agenda','dividend-list','annual-trend'],
  ai:['ai-news'],
} as const;
for(const [page,keys] of Object.entries(mounted) as [keyof typeof mounted,readonly string[]][]){
  const ordered=PAGE_FRAMES[page].map(frame=>frame.key);
  const visible=resolvePreviewFrameKeys(page,ordered,keys);
  for(const key of keys)assert.ok(visible.includes(key),page+':'+key+' missing in real-card editor preview');
  const withoutMount=resolvePreviewFrameKeys(page,ordered,[]).filter(key=>key!=='page-header');
  assert.deepEqual(withoutMount,page==='home'?['asset-dashboard','profit-analysis','pnl-detail','dashboard-quick-actions','holding-quotes']:
    page==='portfolio'?['holding-view']:[],page+': unmounted card must not use fabricated preview');
}
for(const [page,keys] of Object.entries({
  home:['market-news'],ledger:['quick-entry','ledger-list','monthly-summary'],
  portfolio:['holding-dashboard','allocation'],ai:['ai-news'],
} as const)){
  for(const key of keys)assert.equal(supportsCardContentEditor(page as keyof typeof mounted,key),true,page+':'+key);
}
assert.equal(supportsCardContentEditor('settings','system'),false);
assert.match(readFileSync('src/components/PageEditorStack.tsx','utf8'),/supportsCardContentEditor\(pageKey,item.key\)/);
assert.match(readFileSync('src/components/PageLayoutToolWorkbench.tsx','utf8'),/FrameContentEditTarget/);
assert.deepEqual(resolvePreviewFrameKeys('settings',PAGE_FRAMES.settings.map(f=>f.key),PAGE_FRAMES.settings.map(f=>f.key)),[],
  'system settings page remains protected');
assert.ok(!resolvePreviewFrameKeys('portfolio',PAGE_FRAMES.portfolio.map(f=>f.key),mounted.portfolio).includes('calculator-modal'),
  'closed modal must not pretend to be mounted');
const read=(p:string)=>readFileSync(p,'utf8');
for(const [page,path] of [['home','HomeScreen'],['portfolio','PortfolioScreen'],['ai','AiScreen']] as const){
  const screen=read('src/screens/'+path+'.tsx');
  assert.match(screen,/frames=\{previewElements\}/,page+': actual screen frames must supply preview');
  assert.match(screen,/previewElements=\{previewElements\}/,page+': editor must receive same frames');
}
assert.match(read('src/screens/MarketResearchScreen.tsx'),/id="market:watchlist:content"/);
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
assert.match(workbench,/resolvePreviewFrameKeys/);
assert.match(workbench,/id:'market:watchlist:content'/);
assert.match(workbench,/<WatchlistPanel heldSymbols=\{finance.holdings.map\(row=>row.symbol\)\}/);
assert.match(workbench,/readOnlyPreview previewOverrides=\{targets\}\/>/,'preview must be read-only and consume unsaved appearance draft');
assert.match(read('src/components/WatchlistPanel.tsx'),/if\(prefsReady&&!previewMode\)/,
  'preview must never persist watchlist changes');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json')).expo;
assert.match(pkg.version,/^5\.0\.\d+$/);assert.ok(Number(pkg.version.split('.')[2])>=5);
assert.equal(app.version,pkg.version);
assert.equal(app.android.versionCode,50000+Number(pkg.version.split('.')[2]));assert.equal(app.android.package,'com.tfasset.app');
console.log('V5.0.5 mounted-card coverage / edit persistence / settings protection: PASS');
