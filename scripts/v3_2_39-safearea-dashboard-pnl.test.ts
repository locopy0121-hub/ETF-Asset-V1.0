import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

function main(){
  const pkg=JSON.parse(read('package.json')) as {version:string};
  const app=JSON.parse(read('app.json')) as {expo:{version:string;android:{versionCode:number};ios:{buildNumber:string}}};
  assert.match(pkg.version,/^3\.2\.(?:39|[4-9]\d|\d{3,})$/);
  assert.equal(app.expo.version,pkg.version);
  assert.ok(app.expo.android.versionCode>=30239);
  assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode));

  const hook=read('src/finance/useDailyPnlHistory.ts');
  assert.match(hook,/const currentDate=taipeiClock\(Date\.now\(\)\)\.date/);
  assert.match(hook,/visibleRecords\.find\(row=>row\.date===currentDate\)\?\?null/);
  assert.match(hook,/const previousTradingDay=useMemo/);
  assert.match(hook,/visibleRecords\.filter\(row=>row\.date<currentDate\)/);
  assert.doesNotMatch(hook,/return visibleRecords\.find\(row=>row\.date===currentDate\)\?\?stats\.latest/,
    'today must never silently fall back to an older trading record');

  const home=read('src/screens/HomeScreen.tsx');
  assert.match(home,/yesterdayPnl=\{pnlHistory\.previousTradingDay\?\.todayPnl\?\?null\}/);
  assert.match(home,/todayPnl=\{currentPnl\?\.todayPnl\?\?null\}/);
  assert.match(home,/totalPnl=\{portfolio\.totalPriceUnrealizedProfit\}/);
  assert.doesNotMatch(home,/previousPnl=\{currentPnl\?\.previousTotalPnl/,
    'cumulative previousTotalPnl must never be shown as yesterday single-day PnL');

  const overview=read('src/components/dashboard/DashboardAssetOverview.tsx');
  for(const label of ['昨日損益','今日損益','持股總損益'])assert.ok(overview.includes(label),'missing dashboard label '+label);
  assert.match(overview,/displayPnl\(yesterdayPnl\)/);
  assert.match(overview,/displayPnl\(todayPnl\)/);

  const shell=read('src/components/PageShell.tsx');
  assert.match(shell,/SafeAreaView/);
  assert.match(shell,/edges=\{includeBottomInset\?\['top','bottom'\]:\['top'\]\}/);
  assert.match(shell,/paddingTop:spacing\.xs/);

  const settings=read('src/screens/SettingsScreen.tsx');
  assert.match(settings,/SafeAreaView/);
  assert.match(settings,/return <SafeAreaView edges=\{\['top'\]\}/);

  const chart=read('src/screens/StockChartScreen.tsx');
  assert.match(chart,/SafeAreaView edges=\{\['top','bottom'\]\}/);
  assert.match(chart,/safe:\{flex:1,backgroundColor:colors\.background,paddingTop:spacing\.xs\}/);

  assert.ok(read('src/settings/BackupService.ts').includes("APP_VERSION='"+pkg.version+"'"));
  assert.ok(settings.includes("VERSION='"+pkg.version+"'"));
  assert.ok(settings.includes("BUILD='"+String(app.expo.android.versionCode)+"'"));

  for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
    assert.ok(read(core).length>0,'immutable finance core missing: '+core);

  console.log('V3.2.39 global safe-area + independent dashboard PnL contract PASS');
}
main();
