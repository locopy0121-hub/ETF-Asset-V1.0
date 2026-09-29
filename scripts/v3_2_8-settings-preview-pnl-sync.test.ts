import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p:string)=>readFileSync(p,'utf8');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const home=read('src/screens/HomeScreen.tsx');
const overview=read('src/components/dashboard/DashboardAssetOverview.tsx');

assert.match(workbench,/deriveDailyPnlRecord/,'settings preview must derive current daily PnL from the canonical daily-PnL derivation');
assert.match(workbench,/useMarketRuntime/,'settings preview must use the same marketDataVersion provenance');
assert.doesNotMatch(workbench,/useDailyPnlHistory/,'settings preview must not mount a second persistent daily-history writer');
for(const token of [
  'initialCash:finance.initialCash',
  'entries:finance.entries',
  'rawQuotes:finance.quotes',
  'currentSnapshot:finance.snapshot',
  'valuationComplete:finance.valuationComplete',
  'marketDataVersion:market.marketDataVersion',
  'previousPnl={previewPnl?.previousTotalPnl??0}',
  'todayPnl={previewPnl?.todayPnl??0}',
  'totalPnl={portfolio.totalPnl}',
  'pnlComplete={valuationComplete&&previewPnl!==null}',
  'paddingHorizontal:dashboard.contentPadding',
]) assert.ok(workbench.includes(token),'settings real preview missing '+token);

for(const token of [
  'previousPnl={currentPnl?.previousTotalPnl??0}',
  'todayPnl={currentPnl?.todayPnl??0}',
  'totalPnl={portfolio.totalPnl}',
  'pnlComplete={valuationComplete&&currentPnl!==null}',
]) assert.ok(home.includes(token),'live Home dashboard contract missing '+token);

for(const id of [
  'dashboard:overview-previous-pnl-label',
  'dashboard:overview-today-pnl-label',
  'dashboard:overview-total-pnl-label',
  'dashboard:overview-previous-pnl',
  'dashboard:overview-today-pnl',
  'dashboard:overview-total-pnl',
  'dashboard:overview-pnl-pending',
]) assert.ok(workbench.includes(id),'new PnL preview target lacks tool baseline '+id);

for(const label of ['前日總損益','今日市值變動','總損益'])
  assert.ok(overview.includes(label),'asset overview missing '+label);

const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.2.10');
assert.equal(app.expo.version,'3.2.10');
assert.equal(app.expo.android.versionCode,30210);
assert.equal(app.expo.ios.buildNumber,'30210');
assert.match(read('src/settings/BackupService.ts'),/APP_VERSION='3\.2\.10'/);
assert.match(read('src/screens/SettingsScreen.tsx'),/VERSION='3\.2\.10'/);
assert.match(read('src/screens/SettingsScreen.tsx'),/BUILD='30210'/);

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.10 Page Settings dashboard preview PnL / spacing / direct-target parity PASS');
