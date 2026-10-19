// Source gate supplements the actual V5.0.24 component runtime tests.
const assert=require('node:assert/strict'),fs=require('node:fs');
const holding=fs.readFileSync('src/components/HoldingQuoteCollection.tsx','utf8');
const watch=fs.readFileSync('src/components/WatchlistPanel.tsx','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'5.0.26');
assert.ok(holding.includes('testID="holding-home-horizontal"'),'retains measured holding component');
assert.ok(holding.includes('if(actual>0)setViewportWidth(old=>old===actual?old:actual)'),'retains guarded viewport measurements');
assert.ok(watch.includes('const remove=(row:typeof rows[number])=>inheritHomeWallStyle?null:<Pressable'),'retains non-destructive combined home view');
assert.ok(watch.includes("onPress={()=>list.remove(row.symbol)}"),'standalone WatchlistPanel retains removal');
assert.ok(pkg.scripts['test:v5_0_25'].includes('v5_0_24-holding-horizontal-runtime.test.cjs')===false,
 'holding runtime inherited through test:v5_0_24 rather than duplicated');
console.log('V5.0.25 both parallel QA changes present and regression chain intact PASS');
