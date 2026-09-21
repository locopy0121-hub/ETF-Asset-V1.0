const fs=require('fs');
const assert=require('assert');

const native=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');
const home=fs.readFileSync('src/components/HoldingQuoteModule.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');

const market=native.slice(native.indexOf('"market-wall"->{'),native.indexOf('"heatmap"->{'));
assert.match(market,/optJSONObject\("normalWall"\)/,'Monitor market wall must consume normalWall');
assert.match(market,/headerFields=enabled\.filter/,'Monitor market wall must preserve header field group');
assert.match(market,/quoteFields=enabled\.filter/,'Monitor market wall must preserve quote field group');
assert.match(market,/footerFields=enabled\.filter/,'Monitor market wall must preserve footer field group');
assert.match(market,/wallHeader\.optBoolean\("visible",true\)/,'Monitor market wall must honor header visibility');
assert.match(market,/wallStyle\.optInt\("padding",12\)/,'Monitor market wall must honor shared padding');
assert.match(market,/wallStyle\.optInt\("rowGap",8\)/,'Monitor market wall must honor shared row gap');
assert.match(market,/wallStyle\.optInt\("cornerRadius",16\)/,'Monitor market wall must honor shared corner radius');
assert.match(market,/GradientDrawable/,'Monitor market wall must render card background/border contract');
assert.match(market,/miniValue\(row,key\)/,'Monitor market wall must render values from Shared Snapshot rows');
assert.ok(!/field\.optString\("label",key\)\+"  "\+miniValue/.test(market),'Monitor market wall must not regress to legacy label/value vertical dump');
assert.match(home,/header:cfg\.fields\.filter/,'Home holding wall header contract missing');
assert.match(home,/quote:cfg\.fields\.filter/,'Home holding wall quote contract missing');
assert.match(home,/footer:cfg\.fields\.filter/,'Home holding wall footer contract missing');
assert.match(app,/syncNativeMonitor\(monitorSettings\.config,finance\.sharedSnapshot\)/,'Monitor must stay wired to Shared Snapshot');

console.log('V1.0.12 MONITOR MARKET WALL LINKAGE: PASS');
