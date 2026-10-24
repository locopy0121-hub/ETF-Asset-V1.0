const fs=require('fs');
const assert=require('assert');

const market=fs.readFileSync('src/market/MarketRuntime.tsx','utf8');
const widgetDomain=fs.readFileSync('src/widget/widgetDomain.ts','utf8');
const widgetRuntime=fs.readFileSync('src/widget/WidgetSettingsRuntime.tsx','utf8');
const widgetPanel=fs.readFileSync('src/components/widget/WidgetControlPanel.tsx','utf8');
const monitorPanel=fs.readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');
const wallEditor=fs.readFileSync('src/components/HoldingMarketWallEditor.tsx','utf8');
const settingsRuntime=fs.readFileSync('src/settings/SettingsRuntime.tsx','utf8');
const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');
const picker=fs.readFileSync('src/components/ColorPalettePicker.tsx','utf8');
const nativeWidget=fs.readFileSync('native/android/TfAssetWidgetProvider.kt','utf8');
const nativeModule=fs.readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const bridge=fs.readFileSync('src/native/TfAssetNativeBridge.ts','utf8');
const app=fs.readFileSync('App.tsx','utf8');
const layout=fs.readFileSync('native/android/res/layout/tf_asset_widget.xml','utf8');

for(const token of ['updatedCount','unresolved','refreshPromiseRef','force:true','部分行情暫用上次資料']) assert.ok(market.includes(token),'market refresh contract missing '+token);

for(const token of ['quote-wall','profitColorFields','wallColumns','forceRefreshOnTap']) assert.ok(widgetDomain.includes(token),'Widget domain missing '+token);
for(const token of ['profitColorFields','wallColumns','forceRefreshOnTap']) assert.ok(widgetRuntime.includes(token),'Widget runtime persistence missing '+token);
assert.match(widgetPanel,/行情牆並排欄數/,'Widget editor missing wall columns');
assert.match(widgetPanel,/點擊 Widget 強制更新/,'Widget editor missing force refresh toggle');
assert.match(widgetPanel,/ColorPalettePicker/,'Widget editor must use palette picker');
assert.match(widgetPanel,/損益色/,'Widget editor must expose profit color');
assert.ok(!/autoCapitalize="characters"/.test(widgetPanel),'Widget manual HEX input must be removed');

assert.match(monitorPanel,/ColorPalettePicker/,'Monitor editor must use palette picker');
assert.ok(!/const\s+palette\s*=/.test(monitorPanel),'Monitor fixed color swatches must be removed');
assert.match(wallEditor,/ColorPalettePicker/,'Holding wall editor must use palette picker');
assert.ok(!/const\s+palette\s*=/.test(wallEditor),'Holding wall fixed color swatches must be removed');

for(const token of ['gainColor','lossColor','neutralColor']) assert.ok(settingsRuntime.includes(token),'Global settings color missing '+token);
assert.match(settings,/ColorPalettePicker/,'Global profit colors must use palette picker');
assert.match(picker,/調色盤直接選色/,'Reusable palette picker UX text missing');

for(const id of ['widget_refresh','widget_wall','widget_wall_1','widget_wall_16']) assert.ok(layout.includes(id),'Widget layout missing '+id);
for(const token of ['ACTION_FORCE_REFRESH','onAppWidgetOptionsChanged','OPTION_APPWIDGET_MIN_WIDTH','OPTION_APPWIDGET_MIN_HEIGHT','wallCapacity','forceRefreshEnabled']) assert.ok(nativeWidget.includes(token),'Native Widget missing '+token);
assert.match(nativeModule,/consumeWidgetForceRefreshRequest/,'Native module missing force refresh consume bridge');
assert.match(bridge,/consumeNativeWidgetForceRefreshRequest/,'JS native bridge missing force refresh consume method');
assert.match(app,/market\.refresh\(\{force:true\}\)/,'App must force market refresh after Widget request');

for(const locked of ['src/utils/etfCalculators.ts','src/finance/canonicalLedger.ts','docs/finance/CORE_LOCK.md']) assert.ok(fs.existsSync(locked),locked+' must remain present');

console.log('V1.0.14 refresh + palette + Widget quote wall contract PASS');
