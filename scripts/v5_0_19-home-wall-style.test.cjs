const assert=require('node:assert/strict'),fs=require('node:fs');
const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
const panel=fs.readFileSync('src/components/WatchlistPanel.tsx','utf8');
assert.ok(home.includes('inheritHomeWallStyle:true,sourceWallConfig:effectiveDisplay.holdingWall??DEFAULT_HOLDING_WALL_CONFIG'),'combined home uses the actual current editor appearance, not a separate saved preference');
assert.ok(panel.includes('const wallConfig=inheritHomeWallStyle?(sourceWallConfig??homeEditor.displayConfig.holdingWall??DEFAULT_HOLDING_WALL_CONFIG)'),'explicit home appearance overrides independent watchlist preference');
assert.ok(panel.includes('{!inheritHomeWallStyle?<View'),'combined view has no redundant apply button');
assert.ok(panel.includes('watchlistSnapshot(list.items.filter('),'watchlist continues to use independent market quote projection');
console.log('V5.0.19 home wall read-only visual inheritance wiring PASS');
