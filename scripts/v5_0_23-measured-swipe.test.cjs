const fs=require('node:fs'),assert=require('node:assert/strict');
const panel=fs.readFileSync('src/components/WatchlistPanel.tsx','utf8');
const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
assert.ok(home.includes('inheritedLayout:holdingLayoutMode'),'source mode remains connected to homepage');
assert.ok(panel.includes('testID="watchlist-home-horizontal" horizontal'),'real native scrolling preserved');
assert.ok(panel.includes('onLayout={event=>{')&&panel.includes('const measured=Math.round(event.nativeEvent.layout.width);'),'horizontal scroll measures its actual viewport');
assert.ok(panel.includes('snapToInterval={itemWidth+spacing.sm}'),'snap includes existing card gap');
assert.ok(panel.includes('const pageWidth=holdingPageWidth(viewportWidth,windowWidth)'),'shared layout geometry derives from measured width');
console.log('V5.0.23 native horizontal viewport measurements and existing snap policy smoke PASS');
