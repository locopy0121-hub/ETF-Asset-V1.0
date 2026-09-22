const fs=require('fs');const assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');

const widget=read('src/components/widget/WidgetControlPanel.tsx');
const widgetDomain=read('src/widget/widgetDomain.ts');
const widgetRuntime=read('src/widget/WidgetSettingsRuntime.tsx');
const widgetNative=read('native/android/TfAssetWidgetProvider.kt');
const widgetXml=read('native/android/res/layout/tf_asset_widget.xml');
const monitor=read('src/components/monitor/MonitorControlPanel.tsx');
const monitorDomain=read('src/monitor/monitorDomain.ts');
const monitorRuntime=read('src/monitor/MonitorSettingsRuntime.tsx');
const monitorNative=read('native/android/TfAssetOverlayService.kt');
const settings=read('src/screens/SettingsScreen.tsx');
const theme=read('src/theme/ThemeRuntime.tsx');
const bridge=read('src/native/TfAssetNativeBridge.ts');
const native=read('native/android/TfAssetNativeModule.kt');
const releaseWorkflow=read('.github/workflows/release-v1.yml');
const snapshot=read('src/finance/sharedSnapshotAdapter.ts');

for(const token of ['A 顯示項目（母）','B 單項細部','單項行距','單項特效','ITEM_EFFECT_TRIGGERS'])assert(widget.includes(token),'Widget A-B UI missing '+token);
for(const token of ['fieldStyles','WidgetFieldStyle','updateWidgetFieldVisual'])assert(widgetDomain.includes(token),'Widget domain missing '+token);
assert(widgetRuntime.includes('normFieldStyles'),'Widget persisted B normalization missing');
for(const token of ['fieldStyles(config)','widget_wall_row_1','wallColumns','buildWallCard','setViewPadding'])assert(widgetNative.includes(token),'Widget native A-B/runtime missing '+token);
for(let i=1;i<=4;i++)assert(widgetXml.includes('widget_wall_row_'+i),'Widget XML missing dynamic row '+i);

for(const token of ['Normal A 顯示項目（母）','Mini A 項目列（母）','Mini B 欄位（子）','Mini 下方狀態列 A/B','主體行情牆 A/B 編輯','單項行距','單項特效'])assert(monitor.includes(token),'Monitor A-B UI missing '+token);
for(const token of ['normalItems','MonitorItemConfig','textColor:string|null','lineGap:number|null','effect:ItemEffectConfig'])assert(monitorDomain.includes(token),'Monitor domain missing '+token);
for(const token of ['normNormalItems','normMiniColumns','normMiniStatusItems','normWall'])assert(monitorRuntime.includes(token),'Monitor persistence missing '+token);
for(const token of ['normalItems','miniColumns','miniStatusItems','applyItemEffect','TranslateAnimation','monitor_runtime_mode_override'])assert(monitorNative.includes(token),'Monitor native A-B/effect path missing '+token);
assert(monitorNative.includes('private fun jsonRawStrings'),'Monitor must preserve case-sensitive field identifiers');
assert.match(monitorNative,/selectedFields=jsonRawStrings\(cfg\.optJSONArray\("fields"\)\)/,'Normal monitor field keys must not be uppercased');
assert.match(monitorNative,/jsonRawStrings[\s\S]*?\.trim\(\)\.takeIf\(String::isNotEmpty\)/,'Raw monitor field reader must preserve original key casing');
assert.match(monitorNative,/selected=jsonStrings\(cfg\.optJSONArray\("selectedSymbols"\)\)/,'Symbol matching should retain uppercase normalization');

assert(settings.includes('主題與背景'),'Theme settings entry missing');
const backgroundBlock=theme.slice(theme.indexOf('const BACKGROUNDS:'),theme.indexOf('export const THEME_PRESETS'));
assert.equal(backgroundBlock.split('data:image/png;base64').length-1,10,'Theme runtime must contain 10 built-in backgrounds');
for(const key of ['sky','midnight','sand','forest','violet','rose','aqua','amber','ocean','slate'])assert(theme.includes("key:'"+key+"'"),'Theme preset missing '+key);
assert(theme.includes('Array.from({length:5}'),'Theme runtime must maintain five custom slots');
for(const token of ['pickNativeThemeBackground','setNativeAppIcon'])assert(bridge.includes(token),'Native theme bridge missing '+token);
for(const token of ['pickThemeBackground','setAppIcon','val selected="Icon"+suffix','val aliases=(1..10).map','setComponentEnabledSetting'])assert(native.includes(token),'Native theme action missing '+token);
for(const token of ['for i in range(1,11)','activity-alias','android:name=\".Icon01\"','android:name=\".Icon10\"','grep -c \'activity-alias\''])assert(releaseWorkflow.includes(token),'Release launcher alias injection missing '+token);
for(let i=1;i<=10;i++)assert(fs.existsSync('native/android/res/drawable/tf_icon_'+String(i).padStart(2,'0')+'.xml'),'Launcher icon '+i+' missing');

assert.match(snapshot,/totalAssets:portfolio\.totalMarketValue/,'Shared totalAssets must stay market-value only');

console.log('V1.1.2 A-B/theme/native source contract: PASS');
