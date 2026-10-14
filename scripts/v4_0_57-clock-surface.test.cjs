const assert=require('node:assert/strict'),fs=require('node:fs');
const overlay=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');
const controls=overlay.slice(overlay.indexOf('private fun renderWindowControls'),overlay.indexOf('private fun renderNormal'));
assert.match(controls,/root\.addView\(clockView,LinearLayoutParams\(android\.view\.ViewGroup\.LayoutParams\.MATCH_PARENT/,'Clock needs its own full-width row so controls cannot consume its width on a narrow/high-density overlay');
const widget=fs.readFileSync('native/android/TfAssetWidgetProvider.kt','utf8'),xml=fs.readFileSync('native/android/res/layout/tf_asset_widget.xml','utf8');
assert.match(widget,/setTextViewText\(R\.id\.widget_quote_time,TfAssetMarketPresentation\.sourceClockLabel\(holdings\)\)/);
assert.match(xml,/@\+id\/widget_quote_time/);
assert.match(overlay,/renderWindowControls\(r,style,TfAssetMarketPresentation\.sourceClockLabel\(orderedHoldings\(snap,cfg\)\)\)/,'Both floating modes use selected source holdings');
console.log('V4.0.57 external source clock wiring and independent-width overlay clock contract PASS');
