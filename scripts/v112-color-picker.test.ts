import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const picker=readFileSync('src/components/ColorPalettePicker.tsx','utf8');
const settings=readFileSync('src/screens/SettingsScreen.tsx','utf8');
const modal=readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
const wall=readFileSync('src/components/HoldingMarketWallEditor.tsx','utf8');
const widget=readFileSync('src/components/widget/WidgetControlPanel.tsx','utf8');
const monitor=readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');

assert.ok(!picker.includes('TextInput'),'Color picker must not require HEX/RGB/HSV text input');
assert.match(picker,/調色盤直接選色，不需輸入色碼/);
assert.match(picker,/expanded\?<Modal visible/,'palette modal and bars must mount only after explicit expansion');
assert.match(picker,/if\(!expanded\|\|mode!==['"]wheel['"]\)return \[\]/,'closed pickers must not allocate wheel cells');
assert.match(picker,/hardwareAccelerated/,'Android palette modal should use hardware acceleration');
assert.match(picker,/backgroundColor:safeValue/,'preview must normalize invalid persisted color values');

for(const [name,source,minPickers] of [
  ['settings',settings,3],
  ['page modal',modal,8],
  ['holding wall',wall,8],
  ['widget',widget,7],
  ['monitor',monitor,10],
] as const){
  const count=(source.match(/<ColorPalettePicker\b/g)??[]).length;
  assert.ok(count>=minPickers,`${name} must use shared ColorPalettePicker for color controls`);
  assert.ok(!/onChangeText=\{[^}]*color/i.test(source),`${name} must not mutate colors through text inputs`);
  assert.ok(!/placeholder=["'][^"']*(?:HEX|色碼)/i.test(source),`${name} must not expose manual color-code entry`);
}

console.log('v1.1.2 global Color Picker PASS');
