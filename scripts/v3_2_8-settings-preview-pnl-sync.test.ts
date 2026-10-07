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
  'yesterdayPnl={null}',
  'todayPnl={previewPnl?.todayPnl??null}',
  'totalPnl={portfolio.totalPriceUnrealizedProfit}',
  'pnlComplete={valuationComplete}',
  'paddingHorizontal:dashboard.contentPadding',
]) assert.ok(workbench.includes(token),'settings real preview missing '+token);

for(const token of [
  'yesterdayPnl={pnlHistory.previousTradingDay?.todayPnl??null}',
  'todayPnl={currentPnl?.todayPnl??null}',
  'totalPnl={portfolio.totalPriceUnrealizedProfit}',
  'pnlComplete={valuationComplete}',
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

for(const label of ['昨日單日損益','今日單日損益','持股總損益'])
  assert.ok(overview.includes(label),'asset overview missing '+label);

const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.match(pkg.version,/^\d+\.\d+\.\d+$/);
assert.equal(app.expo.version,pkg.version);
assert.ok(Number.isInteger(app.expo.android.versionCode)&&app.expo.android.versionCode>0);
assert.equal(String(app.expo.ios.buildNumber),String(app.expo.android.versionCode));
assert.ok(read('src/settings/BackupService.ts').includes("APP_VERSION='"+pkg.version+"'"));
assert.ok(read('src/screens/SettingsScreen.tsx').includes("VERSION='"+pkg.version+"'"));
assert.ok(read('src/screens/SettingsScreen.tsx').includes("BUILD='"+String(app.expo.android.versionCode)+"'"));

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.11 Page Settings dashboard preview PnL / spacing / direct-target parity PASS');
