const fs=require('fs');
const assert=require('assert');

const palettes=fs.readFileSync('src/theme/displayPalettes.ts','utf8');
const widget=fs.readFileSync('src/components/widget/WidgetControlPanel.tsx','utf8');
const monitor=fs.readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');

for(const key of ['light','dark','glass','blue','warm']) assert.ok(palettes.includes("key:'"+key+"'"),'palette missing '+key);
for(const token of ['backgroundColor','textColor','secondaryTextColor','gainColor','lossColor','neutralColor','borderColor','backgroundOpacity']) assert.ok(palettes.includes(token),'palette token missing '+token);
assert.match(widget,/全局調色盤/,'Widget global palette UI missing');
assert.match(widget,/DISPLAY_PALETTES\.map/,'Widget palette selector missing');
assert.match(monitor,/全局調色盤/,'Monitor global palette UI missing');
assert.match(monitor,/DISPLAY_PALETTES\.map/,'Monitor palette selector missing');
assert.match(monitor,/normalStyle:/,'Monitor palette must update Normal');
assert.match(monitor,/miniStyle:/,'Monitor palette must update Mini');
assert.match(monitor,/miniHeader:/,'Monitor palette must update Mini header');
assert.match(monitor,/B 欄位結構與位置不受影響/,'Palette must not mutate B layout');

console.log('V1.0.7 GLOBAL PALETTE: PASS');
