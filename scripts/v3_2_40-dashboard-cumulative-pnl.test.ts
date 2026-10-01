import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.2.40');
assert.equal(app.expo.version,'3.2.40');
assert.equal(app.expo.android.versionCode,30240);
assert.equal(String(app.expo.ios.buildNumber),'30240');

const home=read('src/screens/HomeScreen.tsx');
assert.ok(home.includes('yesterdayPnl={pnlHistory.previousTradingDay?.todayPnl??null}'));
assert.ok(home.includes('todayPnl={currentPnl?.todayPnl??null}'));
assert.ok(home.includes('totalPnl={portfolio.totalUnrealizedProfit}'));
assert.ok(!home.includes('totalPnl={portfolio.totalPnl}'),
  'dashboard cumulative total must not show realized/dividend-inclusive Finance Core totalPnl');

const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
assert.ok(workbench.includes('totalPnl={portfolio.totalUnrealizedProfit}'),
  'settings preview must match live dashboard cumulative holdings PnL');

const overview=read('src/components/dashboard/DashboardAssetOverview.tsx');
for(const label of ['昨日損益','今日損益','累計總損益'])assert.ok(overview.includes(label));

assert.ok(read('src/settings/BackupService.ts').includes("APP_VERSION='3.2.40'"));
const settings=read('src/screens/SettingsScreen.tsx');
assert.ok(settings.includes("VERSION='3.2.40'"));
assert.ok(settings.includes("BUILD='30240'"));

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.40 dashboard cumulative holdings PnL binding PASS');
