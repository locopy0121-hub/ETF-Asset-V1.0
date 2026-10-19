const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('src/components/WatchlistPanel.tsx','utf8');
const home=fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
assert.ok(source.includes('const remove=(row:typeof rows[number])=>inheritHomeWallStyle?null:<Pressable'),
 'mixed home mode must never render destructive watchlist buttons');
assert.ok(source.includes("onPress={()=>list.remove(row.symbol)}"),
 'standalone watchlist management keeps direct remove action');
assert.ok(source.includes("onPress={()=>onSelect?.(row.symbol,row.name)}"),
 'home watch-only cards keep non-destructive navigation');
assert.ok(home.includes('inheritHomeWallStyle:true')&&home.includes('hideWhenEmpty:true'),
 'the guard is applied only to read-only home mixed mode');
console.log('V5.0.24 mixed home wall read-only action guard smoke PASS');
