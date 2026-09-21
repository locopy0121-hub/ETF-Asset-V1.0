const fs=require('fs');
const assert=require('assert');

const picker=fs.readFileSync('src/components/ColorPalettePicker.tsx','utf8');
const widget=fs.readFileSync('src/components/widget/WidgetControlPanel.tsx','utf8');
const monitor=fs.readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');
const wall=fs.readFileSync('src/components/HoldingMarketWallEditor.tsx','utf8');
const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');

assert.match(picker,/調色盤直接選色/,'shared palette picker missing');
assert.match(picker,/色相/,'palette picker must expose hue');
assert.match(picker,/飽和/,'palette picker must expose saturation');
assert.match(picker,/明度/,'palette picker must expose lightness');
for(const source of [widget,monitor,wall,settings]) assert.match(source,/ColorPalettePicker/,'color setting must use shared palette picker');
for(const source of [widget,monitor,wall]){
  assert.ok(!/autoCapitalize="characters"/.test(source),'manual HEX input must not remain');
  assert.ok(!/const\s+palette\s*=/.test(source),'fixed swatch palette must not remain');
}
assert.match(widget,/profitColorFields/,'Widget must expose per-field profit color support');
assert.match(monitor,/套用損益色/,'Monitor field color settings must retain profit color mode');
assert.match(wall,/套用損益色/,'Holding wall fields must retain profit color mode');
assert.match(settings,/gainColor/,'Global settings must persist gain color');
assert.match(settings,/lossColor/,'Global settings must persist loss color');
assert.match(settings,/neutralColor/,'Global settings must persist neutral color');

console.log('GLOBAL PALETTE + PROFIT COLOR CONTRACT: PASS');
