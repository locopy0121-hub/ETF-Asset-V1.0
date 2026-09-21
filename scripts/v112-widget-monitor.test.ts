import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync('App.tsx','utf8');
const widgetDomain=readFileSync('src/widget/widgetDomain.ts','utf8');
const widgetPanel=readFileSync('src/components/widget/WidgetControlPanel.tsx','utf8');
const widgetNative=readFileSync('native/android/TfAssetWidgetProvider.kt','utf8');
const widgetXml=readFileSync('native/android/res/layout/tf_asset_widget.xml','utf8');
const monitorDomain=readFileSync('src/monitor/monitorDomain.ts','utf8');
const monitorPanel=readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');
const overlay=readFileSync('native/android/TfAssetOverlayService.kt','utf8');

assert.match(widgetDomain,/size:\s*'2x2'/);
assert.match(widgetDomain,/quote-wall/);
assert.match(widgetPanel,/點擊 Widget 強制更新/);
assert.match(widgetPanel,/最多可顯示 32 檔/);
assert.match(app,/consumeNativeWidgetForceRefreshRequest/);
assert.match(app,/setInterval\(poll,1000\)/);
assert.match(widgetNative,/ACTION_FORCE_REFRESH/);
assert.match(widgetNative,/coerceIn\(1,8\)/);
assert.match(widgetNative,/coerceIn\(1,32\)/);
assert.match(widgetNative,/R\.id\.widget_wall_32/);
assert.match(widgetXml,/widget_wall_32/);

assert.match(monitorDomain,/DEFAULT_MINI_STATUS_ITEMS/);
assert.match(monitorDomain,/normalWall:DEFAULT_HOLDING_WALL_CONFIG/);
assert.match(monitorPanel,/Mini 下方狀態列/);
assert.match(monitorPanel,/主體行情牆框架/);
assert.match(monitorPanel,/主體行情牆 A\/B 編輯/);
assert.match(overlay,/now-lastTap<320/);
assert.match(overlay,/↻ 更新行情/);
assert.match(overlay,/□ 放大/);
assert.match(overlay,/— 縮小/);
assert.match(overlay,/× 關閉/);
assert.match(overlay,/rows\.forEach\{holding->/);
assert.match(overlay,/miniStatusItems/);

console.log('v1.1.2 widget monitor completeness PASS');
