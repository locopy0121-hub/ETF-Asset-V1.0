const fs=require('fs');
const assert=require('assert');

const picker=fs.readFileSync('src/components/ColorPalettePicker.tsx','utf8');
const monitorPanel=fs.readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');
const monitorRuntime=fs.readFileSync('src/monitor/MonitorSettingsRuntime.tsx','utf8');

assert.match(picker,/const \[expanded,setExpanded\]=useState\(false\)/,'palette must stay collapsed on initial mount');
assert.match(picker,/expanded\?<[^]*PaletteBar/,'palette bars must mount only after explicit expansion');
assert.match(picker,/開啟調色盤/,'palette picker must expose an explicit open control');
assert.match(picker,/調色盤直接選色，不需輸入色碼/,'palette picker must remain direct-palette based');

assert.match(monitorPanel,/ColorPalettePicker/,'Monitor editor must continue using palette pickers');
assert.ok(!/const\s+palette\s*=/.test(monitorPanel),'Monitor fixed swatches must remain removed');
for(const token of ['normMiniHeader','normMiniColumns','normMiniStatusBar','normMiniStatusItems','normWall','normWallLayout']) {
  assert.ok(monitorRuntime.includes(token),'Monitor persisted config normalization missing '+token);
}

console.log('V1.0.15 Monitor settings crash guard: PASS');
