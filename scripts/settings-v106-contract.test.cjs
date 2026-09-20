const fs=require('fs');
const assert=require('assert');

const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');
const registry=fs.readFileSync('src/domain/frameRegistry.ts','utf8');
const settingsRuntime=fs.readFileSync('src/settings/SettingsRuntime.tsx','utf8');
const monitorRuntime=fs.readFileSync('src/monitor/MonitorSettingsRuntime.tsx','utf8');
const widgetRuntime=fs.readFileSync('src/widget/WidgetSettingsRuntime.tsx','utf8');
const backup=fs.readFileSync('src/settings/BackupService.ts','utf8');
const financeRuntime=fs.readFileSync('src/finance/FinanceRuntime.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');

for(const label of ['系統設定','帳務系統','資料系統','備份與還原','即時監控器','顯示與格式','App 管理','法律與資訊']){
  assert.ok(registry.includes(label),'missing settings top section: '+label);
}
for(const label of ['市場更新','背景執行與權限','效能與診斷','通知與提醒','帳務運算公式','券商與費率','交易預設值','帳務核心狀態','ETF 基礎資料','資料概況','資料完整性檢查','資料修復','立即備份','匯出資料','匯入資料','還原備份','清除帳務資料','Widget（mobile 桌面）','監控器總設定','Mini 模式','共用模板','損益顏色','呼吸燈與刷新','字體與顯示大小','金額格式','百分比格式','日期格式','還原預設設定','版本資訊','更新資訊','開發／診斷資訊','免責聲明','行情資料聲明','試算聲明','關於 TF Asset']){
  assert.ok(settings.includes(label),'missing control center item: '+label);
}

assert.match(settingsRuntime,/AsyncStorage/,'Settings runtime must persist');
assert.match(settingsRuntime,/@tf-asset\/settings-runtime/,'Settings storage key missing');
assert.match(monitorRuntime,/@tf-asset\/monitor-settings/,'Monitor storage key missing');
assert.match(widgetRuntime,/@tf-asset\/widget-settings/,'Widget storage key missing');
assert.match(app,/SettingsRuntimeProvider/,'Settings provider missing');
assert.match(app,/MonitorSettingsRuntimeProvider/,'Monitor provider missing');
assert.match(app,/WidgetSettingsRuntimeProvider/,'Widget provider missing');
assert.match(settings,/WidgetControlPanel/,'Widget control must remain exposed');
assert.match(settings,/MonitorControlPanel/,'Monitor control must remain exposed');

assert.match(backup,/createLocalBackup/,'local backup missing');
assert.match(backup,/restoreLocalBackup/,'restore missing');
assert.match(backup,/await createLocalBackup\(\)/,'restore\/import must safety-backup first');
assert.match(backup,/parsed\.product!=='TF Asset'/,'import product validation missing');
assert.match(backup,/parsed\.version!==1/,'import schema validation missing');
assert.match(financeRuntime,/clearFinance:\(\)=>\{/,'safe clearFinance runtime missing');
assert.match(financeRuntime,/setInitialCash\(0\)/,'clearFinance must zero initial cash');
assert.match(financeRuntime,/setEntries\(\[\]\)/,'clearFinance must empty ledger');

assert.match(settings,/const VERSION='1\.0\.6'/,'Settings version display must be 1.0.6');
assert.match(settings,/const BUILD='10006'/,'Settings build display must be 10006');

console.log('TF_ASSET_SETTINGS_V106_CONTRACT: PASS');
