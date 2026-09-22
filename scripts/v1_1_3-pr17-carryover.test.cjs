const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8');

const native=read('native/android/TfAssetNativeModule.kt');
const widget=read('native/android/TfAssetWidgetProvider.kt');
const module=read('src/components/HoldingQuoteModule.tsx');
const collection=read('src/components/HoldingQuoteCollection.tsx');
const home=read('src/screens/HomeScreen.tsx');
const portfolio=read('src/screens/PortfolioScreen.tsx');

// PR #17 item 1: launcher icon changes update existing Android widgets.
const icon=native.slice(native.indexOf('@ReactMethod fun setAppIcon'),native.indexOf('private fun refreshWidget'));
assert.match(icon,/app_icon_key[^\n]*\n\s*refreshWidget\(\)/,'App Icon must trigger a Widget refresh');

// PR #17 item 2: header bounce has the requested visible vertical motion.
const headerEffect=module.slice(module.indexOf('function EffectView('),module.indexOf('function effectActive('));
assert.match(headerEffect,/effect\.kind==='bounce'/,'header must handle bounce kind');
assert.match(headerEffect,/Animated\.timing\(translate/,'header bounce must drive translation');
assert.match(headerEffect,/translateY:translate/,'header Animated.View must render translation');

// PR #17 item 3: refresh-triggered effects track market generation on both pages.
assert.match(module,/triggerToken=effect\.trigger==='refresh'\?refreshToken:numeric/);
assert.match(headerEffect,/triggerToken=effect\.trigger==='refresh'\?refreshToken:numeric/);
assert.match(collection,/refreshToken=\{refreshToken\}/);
for(const [name,source] of [['Home',home],['Portfolio',portfolio]]){
  assert.match(source,/refreshToken=\{finance\.sharedSnapshot\.generatedAt\}/,name+' must forward generation');
}

// PR #17 item 4: Widget quote-wall filters the entire configured field set
// before applying its separate four-field capacity.
assert.match(widget,/val configuredFields=jsonStrings[^\n]+\n\s*val selectedFields=configuredFields\.take\(capacity\)/);
assert.match(widget,/val wallFields=configuredFields\.filter\{supported\.contains\(it\)\}\.take\(4\)/);
assert.equal(widget.includes('}\\n    val selectedFields'),false,'Kotlin must not contain a literal escaped newline');

// PR #17 item 5: vertical padding must reach the native quote-wall spans.
const wallCard=widget.slice(widget.indexOf('private fun buildWallCard('),widget.indexOf('private fun staticEffectActive('));
assert.match(wallCard,/val paddingY=visual\.optInt\("paddingY",0\)/);
assert.match(wallCard,/val topPadStart=out\.length/);
assert.match(wallCard,/val spacerHeight=\(gap\+paddingY\)\.coerceIn\(0,48\)/);
assert.match(wallCard,/val bottomPadStart=out\.length/);

console.log('V1.1.3 PR #17 carryover source gate: PASS (five fixes)');
