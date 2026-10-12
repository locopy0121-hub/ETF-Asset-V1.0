import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeFrameEffects,DEFAULT_FRAME_EFFECTS} from '../src/maintenance/frameEffects';
import {normalizeEditorDimension} from '../src/editor/dimensionPolicy';
const read=(p:string)=>readFileSync(p,'utf8');
const ledger=read('src/screens/LedgerScreen.tsx');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const settings=read('src/screens/SettingsScreen.tsx');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json')).expo;
assert.equal(pkg.version,'4.0.43');
assert.equal(app.version,pkg.version);
assert.equal(app.android.versionCode,40043);
assert.equal(app.ios.buildNumber,'40043');
assert.ok(settings.includes("const BUILD='40043'"));
assert.ok(read('src/settings/BackupService.ts').includes("APP_VERSION='4.0.43'"));
// Ledger editor must render real controlled transaction form and rows, never a stock screenshot.
assert.match(ledger,/const ledgerFrameData=\[/);
assert.match(ledger,/<PageEditorStack pageKey="ledger" frames=\{ledgerFrameData\}\/>/);
assert.match(ledger,/previewElements=\{ledgerFrameData\}/);
assert.match(workbench,/actualLedgerPreviewKeys=new Set/);
assert.match(workbench,/page==='ledger'\?actualLedgerPreviewKeys\.has\(key\)/);
assert.match(workbench,/if\(pageKey==='ledger'\)\{/);
assert.match(workbench,/return actual\?<View pointerEvents="none">\{actual\.props\.children\}<\/View>:null/);
assert.match(workbench,/pageKey==='market'\|\|pageKey==='ledger'\|\|/);
// Manual dimensions have only a positive, physical minimum; inactive bounds must display 0.
assert.equal(normalizeEditorDimension(1,320),1);
assert.equal(normalizeEditorDimension(0,320,true),0);
assert.equal(normalizeFrameEffects({maxWidth:0},DEFAULT_FRAME_EFFECTS).maxWidth,0);
assert.match(workbench,/const actualMinHeight=Math\.round\(frame\.minHeight\?\?0\)/);
assert.match(workbench,/const actualMaxWidth=Math\.round\(fx\.maxWidth\)/);
assert.match(workbench,/actualMinHeight>height\?\{minHeight:height\}/);
assert.match(workbench,/fx\.maxWidth>0&&width>fx\.maxWidth/);
assert.match(workbench,/0 = 不限制，並非元件實際尺寸/);
assert.match(workbench,/effects:normalizeFrameEffects\(\{\.\.\.fx,maxWidth:width\},DEFAULT_FRAME_EFFECTS\)/);
// Protected system page UI and single-source-of-truth accounting remain unchanged.
assert.match(settings,/駐點維護工程師｜全局總開關/);
assert.doesNotMatch(read('src/finance/FinanceRuntime.tsx'),/ledgerFrameData|actualLedgerPreviewKeys/);
console.log('V4.0.43 actual ledger preview, protected actions and honest unconstrained frame geometry PASS');
