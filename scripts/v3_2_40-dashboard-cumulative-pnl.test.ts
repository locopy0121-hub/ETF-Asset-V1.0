import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
const versionParts=String(pkg.version).split('.').map(Number);
assert.equal(versionParts.length,3);
const [major=0,minor=0,patch=0]=versionParts;
assert.equal(major,3);
assert.equal(minor,2);
assert.ok(patch>=40,'dashboard cumulative PnL contract requires V3.2.40+');
const expectedCode=major*10000+minor*100+patch;
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,expectedCode);
assert.equal(String(app.expo.ios.buildNumber),String(expectedCode));

const home=read('src/screens/HomeScreen.tsx');
assert.ok(home.includes('yesterdayPnl={pnlHistory.previousTradingDay?.todayPnl??null}'));
assert.ok(home.includes('todayPnl={currentPnl?.todayPnl??null}'));
assert.ok(home.includes('totalPnl={portfolio.totalPriceUnrealizedProfit}'));
assert.ok(!home.includes('totalPnl={portfolio.totalPnl}'),
  'dashboard holding total must not show realized/dividend-inclusive Finance Core totalPnl');
assert.ok(!home.includes('totalPnl={portfolio.totalUnrealizedProfit}'),
  'dashboard holding total must not include estimated liquidation fee/tax');

const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
assert.ok(workbench.includes('totalPnl={portfolio.totalPriceUnrealizedProfit}'),
  'settings preview must match live dashboard holding market-value-minus-trade-cost P/L');

const overview=read('src/components/dashboard/DashboardAssetOverview.tsx');
for(const label of ['昨日損益','今日損益','持股總損益'])assert.ok(overview.includes(label));

assert.ok(read('src/settings/BackupService.ts').includes("APP_VERSION='"+pkg.version+"'"));
const settings=read('src/screens/SettingsScreen.tsx');
assert.ok(settings.includes("VERSION='"+pkg.version+"'"));
assert.ok(settings.includes("BUILD='"+expectedCode+"'"));

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.40 dashboard cumulative holdings PnL binding PASS');
