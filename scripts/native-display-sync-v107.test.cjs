const fs=require('fs');
const assert=require('assert');

const monitorPanel=fs.readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');
const widgetPanel=fs.readFileSync('src/components/widget/WidgetControlPanel.tsx','utf8');
const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');
const overlay=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');
const widget=fs.readFileSync('native/android/TfAssetWidgetProvider.kt','utf8');

assert.ok(!monitorPanel.includes('00878 國泰永續高股息'),'monitor preview must not contain fixed ETF demo data');
assert.ok(!monitorPanel.includes('22.68'),'monitor preview must not contain fixed price demo data');
assert.match(monitorPanel,/sortMonitorHoldings\(previewSnapshot,value\)/,'monitor preview must use same sorting contract');
assert.match(settings,/previewSnapshot=\{finance\.sharedSnapshot\}/,'settings must pass shared snapshot to native-consumer previews');

assert.ok(!widgetPanel.includes('NT$ 1,288,600'),'widget preview must not contain fixed asset demo data');
assert.match(widgetPanel,/sortWidgetHoldings\(previewSnapshot,value\)/,'widget preview must use widget sorting contract');

for(const source of [overlay,widget]){
  assert.match(source,/selectedSymbols/,'native consumer must honor selected symbols');
  assert.match(source,/manualSymbols/,'native consumer must honor manual ordering');
  assert.match(source,/changePercent/,'native consumer must support change-percent sorting');
  assert.match(source,/orderedHoldings/,'native consumer must derive displayed ETF through ordered holdings');
}
assert.match(overlay,/lastLayoutSignature/,'overlay must separate snapshot refresh from layout changes');
assert.match(overlay,/applyConfiguredLayoutIfChanged/,'overlay must apply reset\/resize when config layout changes');
assert.match(overlay,/monitor_"\+mode\+"_x/,'overlay must persist drag position by mode');
assert.match(widget,/setViewVisibility/,'native widget must consume field visibility');

console.log('V1.0.7 NATIVE DISPLAY SYNC: PASS');
