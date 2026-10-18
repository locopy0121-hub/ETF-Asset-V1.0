const assert=require('node:assert/strict');const fs=require('node:fs');
const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
const panel=fs.readFileSync('src/components/WatchlistPanel.tsx','utf8');
assert.ok(home.includes("inheritedMode:quoteStyle==='chart'?'chart':quoteStyle==='compact'?'compact':'wall'"),'home passes effective quote style, not saved standalone mode');
assert.ok(home.includes("inheritedColumns:holdingLayoutMode==='grid3'?3:holdingLayoutMode==='grid2'?2:1"),'home passes selected columns');
assert.ok(panel.includes("const displayMode=inheritHomeWallStyle?(inheritedMode??'wall'):presentation.mode"),'combined view uses effective home mode');
assert.ok(panel.includes("const cardWidth=displayColumns===3?'31.2%':displayColumns===2?'48.5%':'100%'"),'no forced two-card layout in combined mode');
assert.ok(panel.includes("!inheritHomeWallStyle?<View accessibilityLabel=\"自選顯示模式\""),'standalone mode controls retained and combined mode controls hidden');
console.log('V5.0.20 home mixed wall effective mode/columns source smoke PASS');
