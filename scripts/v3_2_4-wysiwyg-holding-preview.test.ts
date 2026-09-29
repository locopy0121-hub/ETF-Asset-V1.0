import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p:string)=>readFileSync(p,'utf8');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const collection=read('src/components/HoldingQuoteCollection.tsx');
const module=read('src/components/HoldingQuoteModule.tsx');
const modal=read('src/components/PageFrameSettingsModal.tsx');
const home=read('src/screens/HomeScreen.tsx');
const portfolio=read('src/screens/PortfolioScreen.tsx');

assert.match(workbench,/HoldingQuoteCollection,type HoldingLayoutMode/,
  'layout preview must use the same HoldingQuoteCollection renderer as the live pages');
assert.match(workbench,/holdingLayoutMode=\(displayDraft\.holdingLayoutMode\?\?'list'\)/,
  'preview layout must follow the draft live layout mode');
assert.match(workbench,/holdingQuoteStyle=safeHoldingStyle\(holdingLayoutMode,rawQuoteStyle\)/,
  'preview quote style must use the same live safe-style policy');
assert.match(workbench,/holdingPreviewRows=previewRows\?\.length\?previewRows:/,
  'preview must receive the complete current holding collection, not only one fake/sample card');
assert.match(workbench,/<HoldingQuoteCollection rows=\{holdingPreviewRows\}/);
assert.match(workbench,/badgeConfig=\{displayDraft\.etfBadges\?\?DEFAULT_ETF_BADGES\}/);
assert.match(workbench,/layoutMode=\{holdingLayoutMode\}/);
assert.match(workbench,/layoutEditMode layoutSelectionId=\{selection\.id\} onLayoutSelect=\{selectHolding\}/);
assert.doesNotMatch(workbench,/layout="narrow"/,
  'hard-coded narrow preview is forbidden because it diverges from the actual screen');

assert.match(collection,/layoutEditMode\?:boolean/);
assert.match(collection,/layoutSelectionId\?:string\|null/);
assert.match(collection,/onLayoutSelect\?:\(\(id:string,label:string\)=>void\)/);
assert.match(collection,/layoutEditMode=\{layoutEditMode\} layoutSelectionId=\{layoutSelectionId\} onLayoutSelect=\{onLayoutSelect\}/,
  'selection overlay must flow through the real collection renderer to every real card');

assert.match(module,/event\.stopPropagation\(\);onLayoutSelect\?\.\('card','行情卡片'\)/,
  'tapping a card in the preview must not bubble and accidentally re-select the parent frame');

assert.match(modal,/previewRows\?:readonly HoldingQuote\[\]/);
assert.match(modal,/previewRows=\{previewRows\}/);
assert.match(home,/previewQuote=\{sorted\[0\]\} previewRows=\{sorted\}/,
  'home settings preview must use the same sorted live holding rows');
assert.match(portfolio,/previewQuote=\{sorted\[0\]\} previewRows=\{sorted\}/,
  'portfolio settings preview must use the same sorted live holding rows');

const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.2.6');
assert.equal(app.expo.version,'3.2.6');
assert.equal(app.expo.android.versionCode,30206);
assert.equal(app.expo.ios.buildNumber,'30206');
assert.match(read('src/settings/BackupService.ts'),/APP_VERSION='3\.2\.6'/);
assert.match(read('src/screens/SettingsScreen.tsx'),/VERSION='3\.2\.6'/);
assert.match(read('src/screens/SettingsScreen.tsx'),/BUILD='30206'/);

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'financial core remains untouched: '+core);

console.log('V3.2.6 WYSIWYG holding preview: full live collection + real mode + direct selection PASS');
