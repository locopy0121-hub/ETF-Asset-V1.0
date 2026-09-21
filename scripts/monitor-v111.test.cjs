const fs=require('fs');
const assert=require('assert');

const domain=fs.readFileSync('src/monitor/monitorDomain.ts','utf8');
const runtime=fs.readFileSync('src/monitor/MonitorSettingsRuntime.tsx','utf8');
const panel=fs.readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');
const native=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');
const app=fs.readFileSync('App.tsx','utf8');

assert.match(domain,/normalWall:\s*HoldingWallConfig/,'MonitorConfig must own normalWall');
assert.match(domain,/normalWall:DEFAULT_HOLDING_WALL_CONFIG/,'Normal wall must default to home holding-wall contract');
assert.match(runtime,/normalWall:normWall\(input\?\.normalWall\)/,'Persisted normal wall must be normalized');
assert.match(panel,/主體行情牆 A\/B 編輯/,'Normal market wall A/B editor missing');
assert.match(panel,/updateMonitorWall/,'Normal market wall editor must update monitor wall contract');

const market=native.slice(native.indexOf('"market-wall"->{'),native.indexOf('"heatmap"->{'));
assert.ok(!market.includes('chunked(2)'),'Legacy two-item text market wall must be removed');
assert.match(market,/optJSONObject\("normalWall"\)/,'Native market wall must consume normalWall config');
assert.match(market,/optJSONArray\("fields"\)/,'Native market wall must consume A/B field list');
assert.match(market,/miniValue\(row,key\)/,'Native market wall must render shared snapshot fields');
assert.match(market,/ScrollView/,'Normal market wall must scroll inside fixed overlay');

const mini=native.slice(native.indexOf('private fun renderMini'),native.indexOf('private fun weighted'));
assert.match(mini,/showBreathingLight/,'Mini breathing-light switch missing');
assert.match(mini,/AlphaAnimation/,'Mini breathing-light animation missing');
assert.match(mini,/總資產/,'Mini total-assets footer missing');
assert.match(mini,/市值/,'Mini market-value footer missing');
assert.match(mini,/總損益/,'Mini total-PnL footer missing');
assert.match(mini,/integer\(asset,"totalAssets"\)/,'Mini total assets must come from Shared Snapshot asset');
assert.match(mini,/integer\(asset,"marketValue"\)/,'Mini market value must come from Shared Snapshot asset');
assert.match(mini,/signedInteger\(asset,"totalReturn"\)/,'Mini total PnL must come from Shared Snapshot asset');
assert.ok(mini.indexOf('root.addView(scroller')<mini.indexOf('總資產'),'Mini summary must be fixed below scroll area');
assert.match(app,/syncNativeMonitor\(monitorSettings\.config,finance\.sharedSnapshot\)/,'Monitor must keep consuming shared snapshot');

console.log('V1.0.11 MONITOR UNIFIED WALL + MINI FOOTER: PASS');
