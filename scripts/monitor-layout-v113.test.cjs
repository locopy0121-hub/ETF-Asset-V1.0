const fs=require('fs');
const assert=require('assert');

const domain=fs.readFileSync('src/monitor/monitorDomain.ts','utf8');
const runtime=fs.readFileSync('src/monitor/MonitorSettingsRuntime.tsx','utf8');
const panel=fs.readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');
const native=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');

for(const token of ['normalWallLayout','DEFAULT_MONITOR_WALL_LAYOUT','miniStatusBar','miniStatusItems','DEFAULT_MINI_STATUS_BAR','DEFAULT_MINI_STATUS_ITEMS']){
  assert(domain.includes(token), 'monitor domain missing '+token);
  assert(runtime.includes(token), 'monitor runtime missing '+token);
}
assert(panel.includes('主體行情牆框架'),'Monitor editor missing wall framework section');
assert(panel.includes('Mini 下方狀態列'),'Monitor editor missing Mini status section');
assert(panel.includes('並排欄數'),'Monitor editor missing wall columns setting');
assert(panel.includes('每列欄數'),'Mini status editor missing columns setting');
assert(native.includes('wallColumns'),'Native Monitor missing wall grid columns');
assert(native.includes('rows.forEachIndexed'),'Native wall must group cards into rows');
assert(native.includes('statusItems.chunked(statusColumns)'),'Native Mini status bar must support editable grid');
assert(native.includes('miniStatusBar'),'Native Mini status bar config missing');
assert(native.includes('miniStatusItems'),'Native Mini status items config missing');

for(const locked of ['src/utils/etfCalculators.ts','src/finance/canonicalLedger.ts']){
  assert(fs.existsSync(locked), locked+' must remain present');
}

console.log('V1.0.13 monitor wall framework + Mini status editor contract PASS');
