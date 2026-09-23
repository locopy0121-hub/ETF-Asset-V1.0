const fs=require('node:fs');const assert=require('node:assert/strict');const read=p=>fs.readFileSync(p,'utf8');
const app=read('App.tsx'),settings=read('src/settings/SettingsRuntime.tsx'),screen=read('src/screens/SettingsScreen.tsx'),panel=read('src/components/widget/WidgetControlPanel.tsx'),native=read('native/android/TfAssetWidgetProvider.kt');
assert.match(app,/onTouchStart=\{onSwipeStart\}/);assert.match(app,/onTouchEnd=\{onSwipeEnd\}/);assert.match(app,/swipeToAdjacent\(dx<0\?1:-1\)/);assert.match(app,/Math\.abs\(dx\)<settings\.prefs\.navigation\.swipeThreshold/);
assert.match(settings,/patchNavigation/);assert.match(settings,/swipeEnabled:true/);assert.match(screen,/主頁左右滑動/);
assert.match(panel,/點擊更新行情/);assert.match(panel,/await onRefresh\(\)/);assert.match(screen,/await market\.refresh\(\{force:true\}\)/);
assert.match(native,/ACTION_FORCE_REFRESH/);assert.doesNotMatch(native,/startActivity\(launch\)/);assert.match(native,/goAsync\(\)/);assert.match(native,/wall_market_overrides/);assert.match(native,/views\.setOnClickPendingIntent\(R\.id\.widget_root,refreshPending\)/);assert.match(native,/View\.INVISIBLE/);assert.match(native,/widget_refresh,refreshPending/);
console.log('V2.1.6 navigation / Widget refresh source-contract smoke: PASS; device gesture, refresh data flow and Android click require physical validation.');
