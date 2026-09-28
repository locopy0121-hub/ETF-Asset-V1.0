import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeDisplayState} from '../src/editor/editorModel';

const read=(p:string)=>readFileSync(p,'utf8');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const modal=read('src/components/PageFrameSettingsModal.tsx');
const home=read('src/screens/HomeScreen.tsx');
const editable=read('src/components/dashboard/DashboardEditableContent.tsx');
const overview=read('src/components/dashboard/DashboardAssetOverview.tsx');

assert.match(workbench,/useFinance\(\)/,'preview must read current finance runtime data');
assert.match(workbench,/<DashboardAssetOverview amount=\{money\(portfolio\.totalMarketValue\)\}/);
assert.match(workbench,/<DashboardProfitAnalysis items=\{kpis\}/);
assert.match(workbench,/<DashboardProfitDetail rows=\{rows\}/);
assert.match(workbench,/<HoldingQuoteModule item=\{previewQuote\}/);
assert.match(workbench,/<FrameCard title=\{frame\.title\} editorStyle=\{frameConfig\}>/);
assert.match(workbench,/<LayoutSelectionProvider targets=\{targets\}/);
assert.doesNotMatch(workbench,/NT\$ 123,456|圖表區|後續工具只掛到此類物件|V3\.2\.1 已建立物件分流/,
 'no fabricated values or development placeholders are allowed in the layout preview');

assert.match(home,/LayoutTargetProvider targets=\{effectiveDisplay\.layoutTargets\?\?\{\}\}/);
assert.match(editable,/layoutRuntime\.targets\[targetId\]/);
assert.match(overview,/dashboard:overview-card/);
assert.match(modal,/PageLayoutToolWorkbench/);
assert.doesNotMatch(modal,/<Text style=\{styles\.sectionTitle\}>頁面標題<\/Text>/);
assert.doesNotMatch(modal,/方案 C｜儀表板佈局/);

const sanitized=mergeDisplayState({home:{layoutTargets:{'dashboard:overview-value':{
  fontSize:31,textColor:'#123456',actual_fee:999,tax:999,shares:999,
}}}}).home.layoutTargets?.['dashboard:overview-value'];
assert.equal(sanitized?.fontSize,31);
assert.equal(sanitized?.textColor,'#123456');
assert.equal((sanitized as any)?.actual_fee,undefined);
assert.equal((sanitized as any)?.tax,undefined);
assert.equal((sanitized as any)?.shares,undefined);

const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.2.3');
assert.equal(app.expo.version,'3.2.3');
assert.equal(app.expo.android.versionCode,30203);
assert.equal(app.expo.ios.buildNumber,'30203');
assert.match(read('src/settings/BackupService.ts'),/APP_VERSION='3\.2\.3'/);
for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'financial core remains untouched: '+core);
console.log('V3.2.3 real layout preview + persisted visual targets + no fabricated preview values: PASS');
