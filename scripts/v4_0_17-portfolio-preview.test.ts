import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePortfolioViewMode,quickModeFromDisplay} from '../src/domain/portfolioModeSwitch';
import {sortHoldingQuotes,sortPreset} from '../src/domain/holdingSort';

assert.equal(normalizePortfolioViewMode('list'),'list');
assert.equal(normalizePortfolioViewMode('wall'),'wall');
assert.equal(quickModeFromDisplay('list','quote','list'),'list');
assert.equal(quickModeFromDisplay('wall','chart','list'),'chart');
assert.equal(quickModeFromDisplay('wall','advanced','grid2'),'advanced');
assert.deepEqual(sortHoldingQuotes([],sortPreset('symbol').key,false),[]);

const preview=readFileSync('src/components/PageLayoutToolWorkbench.tsx','utf8');
const real=readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const modal=readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
for(const component of ['PortfolioQuickBar','PortfolioHoldingTable','PortfolioSafeList','HoldingQuoteCollection']){
  assert.ok(preview.includes('<'+component+' '),'preview missing real component: '+component);
  assert.ok(real.includes('<'+component+' '),'real page missing component: '+component);
}
assert.ok(preview.includes("portfolioListMode=pageKey==='portfolio'&&normalizePortfolioViewMode(displayDraft.portfolioViewMode)==='list'"));
assert.ok(preview.includes('displayDraft.portfolioList??DEFAULT_PORTFOLIO_LIST'));
assert.ok(preview.includes('PortfolioListEditor value={displayDraft.portfolioList??DEFAULT_PORTFOLIO_LIST}'));
assert.ok(preview.includes('!portfolioListMode&&holding&&selection.kind'),'table mode must not expose card-only tools');
assert.ok(real.includes('previewFirstMode={firstMode} previewListFallback={listFallback}'));
assert.ok(modal.includes('previewFirstMode={previewFirstMode} previewListFallback={previewListFallback}'));
assert.ok(preview.includes('previewListFallback?<PortfolioSafeList'));
assert.ok(preview.includes('<ThemeBackgroundLayer/>'),'preview must use the same wallpaper layer as the real App');
const settings=readFileSync('src/screens/SettingsScreen.tsx','utf8');
assert.equal(settings.includes('PageEditorStack'),false,'protected settings page must remain untouched');
console.log('V4.0.17 portfolio preview renderer parity/mode gates PASS');
