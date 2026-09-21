const fs=require('fs');
const assert=require('assert');

const service=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');
const panel=fs.readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');

assert.ok(!service.includes('fitMiniHeightToContent'),'Mini overlay must not auto-shrink configured height');
assert.match(service,/layout\.optInt\("height",if\(mode=="mini"\)330 else 420\)/,'initial native LayoutParams must use configured height');
assert.match(service,/p\.height=nextLayout\.optInt\("height",if\(mode=="mini"\)330 else 420\)/,'runtime layout updates must apply configured height');
assert.match(service,/ScrollView\(this\)[\s\S]*LinearLayoutParams\(android\.view\.ViewGroup\.LayoutParams\.MATCH_PARENT,0,1f\)/,'Mini overflow must scroll inside fixed overlay height');
assert.match(panel,/Step label="高度" value=\{layout\.height\}/,'Monitor editor must expose the active layout height');
assert.match(panel,/max=\{value\.mode==='mini'\?800:1600\}/,'Mini height editor must remain user-controlled and not be capped to content height');

console.log('V1.0.10 MONITOR FIXED SIZE: PASS');
