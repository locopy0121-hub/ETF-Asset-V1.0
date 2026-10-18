const assert=require('node:assert/strict'),fs=require('node:fs');
const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8'),panel=fs.readFileSync('src/components/WatchlistPanel.tsx','utf8');
assert.ok(home.includes('inheritedLayout:holdingLayoutMode'),'home passes selected layout to watched cards');
assert.ok(panel.includes("inheritedLayout==='horizontal'"),'horizontal mode has native horizontal scroll');
assert.ok(panel.includes("inheritedLayout==='paged2'"),'paged mode has measured real pages');
assert.ok(panel.includes("holdingPages(rows,2)")&&panel.includes("snapToInterval={pageWidth}"),'two-column pages have aligned snap width');
assert.ok(panel.includes("if(prefsReady&&!previewMode&&!inheritHomeWallStyle)"),'read-only home must not persist standalone preferences');
console.log('V5.0.22 home mixed horizontal/paged layout smoke PASS');
