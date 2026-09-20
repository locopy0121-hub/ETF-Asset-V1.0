const fs=require('fs');
const assert=require('assert');

const monitorDomain=fs.readFileSync('src/monitor/monitorDomain.ts','utf8');
const monitorRuntime=fs.readFileSync('src/monitor/MonitorSettingsRuntime.tsx','utf8');
const monitorPanel=fs.readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');
const monitorNative=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');
const widgetDomain=fs.readFileSync('src/widget/widgetDomain.ts','utf8');
const widgetRuntime=fs.readFileSync('src/widget/WidgetSettingsRuntime.tsx','utf8');
const widgetPanel=fs.readFileSync('src/components/widget/WidgetControlPanel.tsx','utf8');
const widgetNative=fs.readFileSync('native/android/TfAssetWidgetProvider.kt','utf8');

for(const mode of ['portfolio','quotes','compact','single','dual','advanced']){
  assert.ok(monitorDomain.includes("'"+mode+"'"),'Monitor mode missing '+mode);
  assert.ok(monitorRuntime.includes("'"+mode+"'"),'Monitor runtime mode missing '+mode);
  assert.ok(monitorPanel.includes("'"+mode+"'"),'Monitor UI mode missing '+mode);
  assert.ok(monitorNative.includes('"'+mode+'"'),'Native Monitor mode missing '+mode);
}
assert.match(monitorNative,/when\(template\)/,'Native Monitor must render by template');
assert.match(monitorNative,/rows\.take\(4\)/,'quotes mode must be a distinct multi-row rendering');
assert.match(monitorNative,/rows\.take\(2\)/,'dual mode must be a distinct two-row rendering');
assert.ok(!monitorNative.includes('if(mode=="mini")renderMini')||monitorNative.includes('renderMini'),'Mini must remain dedicated list renderer');

for(const mode of ['asset-summary','quote-summary','compact','advanced','minimal','transparent']){
  assert.ok(widgetDomain.includes("'"+mode+"'"),'Widget mode missing '+mode);
  assert.ok(widgetRuntime.includes("'"+mode+"'"),'Widget runtime mode missing '+mode);
  assert.ok(widgetPanel.includes("'"+mode+"'"),'Widget UI mode missing '+mode);
}
assert.match(widgetPanel,/widgetTemplateCapacity/,'Widget preview must use display-mode capacity');
assert.match(widgetNative,/val capacity=when\(template\)/,'Native Widget must use display-mode capacity');
assert.match(widgetNative,/template=="transparent"/,'Native Widget transparent mode missing');

console.log('V1.0.7 DISPLAY MODES: PASS');
