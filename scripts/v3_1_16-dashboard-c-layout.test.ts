import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const gitBlob=(path:string)=>{
  const body=readFileSync(path);
  return createHash('sha1').update('blob '+body.length+'\0').update(body).digest('hex');
};

const app=JSON.parse(read('app.json'));
const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.version,'3.2.3');
assert.equal(app.expo.version,'3.2.3');
assert.equal(app.expo.android.versionCode,30203);
assert.equal(app.expo.ios.buildNumber,'30203');

const layout=read('src/domain/dashboardLayout.ts');
assert.match(layout,/export type DashboardLayoutConfig/);
for(const key of ['sectionGap','contentPadding','overview','profitAnalysis','profitDetail','quickActions'])
  assert.ok(layout.includes(key),'dashboard layout missing '+key);
for(const forbidden of ['holdingWall','quoteStyle','holdingLayoutMode'])
  assert.ok(!layout.includes(forbidden),'dashboard layout must not own holding-wall field '+forbidden);

const home=read('src/screens/HomeScreen.tsx');
for(const token of ['DashboardAssetOverview','DashboardProfitAnalysis','DashboardProfitDetail','DashboardQuickActions'])
  assert.ok(home.includes(token),'home missing C module '+token);
for(const frame of ["key:'asset-dashboard'","key:'profit-analysis'","key:'pnl-detail'","key:'dashboard-quick-actions'"])
  assert.ok(home.includes(frame),'home missing C frame '+frame);
assert.match(home,/gap=\{dashboardLayout\.sectionGap\}/);
assert.match(home,/wallConfig=\{effectiveDisplay\.holdingWall\?\?DEFAULT_HOLDING_WALL_CONFIG\}/,
  'holding wall must continue to read its original independent config');

const overview=read('src/components/dashboard/DashboardAssetOverview.tsx');
assert.match(overview,/moneyRow:\{flexDirection:'row',alignItems:'flex-end'/);
assert.match(overview,/minimumFontScale=\{0\.42\}/);
assert.doesNotMatch(overview,/position:'absolute'.*prefix/);

const profit=read('src/components/dashboard/DashboardProfitAnalysis.tsx');
assert.match(profit,/flexWrap:'wrap'/);
assert.match(profit,/flexBasis:'46%'/);
assert.match(profit,/ordered\.slice\(0,4\)/);

const modal=read('src/components/PageFrameSettingsModal.tsx');
const layoutTool=read('src/components/PageLayoutToolWorkbench.tsx');
assert.match(modal,/PageLayoutToolWorkbench/,'page settings must use the unified layout workbench');
assert.doesNotMatch(modal,/方案 C｜儀表板佈局/,'legacy duplicate dashboard settings block must stay removed');
for(const token of ['DashboardAssetOverview','DashboardProfitAnalysis','DashboardProfitDetail','DashboardQuickActions','DashboardLayoutTools'])
  assert.ok(layoutTool.includes(token),'real layout workbench missing dashboard module '+token);
assert.match(layoutTool,/wallConfig=\{wall\}/,'holding wall keeps its independent live draft config');

// Frozen renderer gate: the original holding-wall renderer/editor sources remain byte-for-byte unchanged.
// uiModels is intentionally allowed to evolve only for presentation metadata; assert that contract semantically below.
assert.equal(gitBlob('src/components/HoldingMarketWallEditor.tsx'),'e8f4d4ba19bec21e79d6b8e0ca8e3ca0241a8466');
assert.equal(gitBlob('src/components/HoldingQuoteCollection.tsx'),'cf816b03b4a606a121ba8b041e2fe360688c47f9');
assert.equal(gitBlob('src/components/FloatingHoldingCardPreview.tsx'),'951e2ab7f04fb1b000aef7377d4df5327187a488');
const uiModels=read('src/domain/uiModels.ts');
for(const visualFlag of ['backgroundProfitColor','textProfitColor','secondaryTextProfitColor','borderProfitColor','useProfitColor','useProfitBackground'])
  assert.ok(uiModels.includes(visualFlag),'holding-wall presentation contract missing '+visualFlag);
assert.doesNotMatch(uiModels,/actual_fee|actual_tax|Math\.floor/,'holding-wall UI model must not own immutable accounting calculations');

assert.equal(gitBlob('src/finance/canonicalLedger.ts'),'84324138ec2e56a655e0ceacaed3ee541ba7f5c6');
assert.equal(gitBlob('src/finance/FinanceRuntime.tsx'),'3bb641bfb2dc64b944ef34c856a5e3ca04417c14');
assert.equal(gitBlob('src/finance/cashAudit.ts'),'a691f54b89c421df64b4fe0d5e5ecd74d530c2d5');

console.log('V3.2.3 dashboard C carry-forward PASS — original holding-wall renderers remain frozen; presentation-only profit-color model extension verified');
