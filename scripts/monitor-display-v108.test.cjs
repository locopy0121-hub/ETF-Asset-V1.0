const fs=require('fs');
const assert=require('assert');

const domain=fs.readFileSync('src/monitor/monitorDomain.ts','utf8');
const runtime=fs.readFileSync('src/monitor/MonitorSettingsRuntime.tsx','utf8');
const panel=fs.readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');
const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');
const native=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');

const themes=['market-wall','heatmap','pnl-wall','weight-wall','ticker','terminal'];
for(const theme of themes){
  assert.ok(domain.includes("'"+theme+"'"),'domain theme missing '+theme);
  assert.ok(runtime.includes("'"+theme+"'"),'runtime theme missing '+theme);
  assert.ok(panel.includes("'"+theme+"'"),'editor theme missing '+theme);
  assert.ok(settings.includes("key:'"+theme+"'"),'settings theme missing '+theme);
  assert.ok(native.includes('"'+theme+'"'),'native renderer missing '+theme);
}
assert.match(settings,/label:'行情牆'/,'行情牆 label missing');
assert.match(settings,/label:'漲跌熱圖'/,'漲跌熱圖 label missing');
assert.match(settings,/label:'損益牆'/,'損益牆 label missing');
assert.match(settings,/label:'資產權重牆'/,'資產權重牆 label missing');
assert.match(settings,/label:'跑馬行情'/,'跑馬行情 label missing');
assert.match(settings,/label:'純文字終端'/,'純文字終端 label missing');

assert.ok(!native.includes('fitMiniHeightToContent'),'Mini must honor user-configured fixed height and must not auto-shrink to content');
const mini=native.slice(native.indexOf('private fun renderMini'),native.indexOf('private fun weighted'));
assert.match(mini,/ScrollView/,'Mini scrolling container missing');
assert.ok(!mini.includes('ScrollView.LayoutParams'),'Mini ScrollView child must not use unresolved ScrollView.LayoutParams');
assert.match(mini,/addView\(body\)/,'Mini ScrollView must attach its body with supported default child layout params');
assert.match(mini,/rows\.forEach\{holding->/,'Mini must iterate all holdings');
assert.ok(!/rows\.(take|slice|subList)\(/.test(mini),'Mini must never truncate holdings');
assert.match(settings,/列數不設上限/,'Mini unlimited-row UI contract missing');
assert.match(panel,/列數不設限/,'Mini unlimited-row editor contract missing');

console.log('V1.0.8 MONITOR DISPLAY: PASS');
