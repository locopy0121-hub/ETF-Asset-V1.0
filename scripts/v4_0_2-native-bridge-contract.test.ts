import assert from 'node:assert/strict';
import fs from 'node:fs';
// A real TWSE z remains a trade when its last tick is older than 30 seconds.
// Age belongs in quoteStatus, not in the price provenance rejected by the App.
const runtime=fs.readFileSync('native/android/SaiEtfMarketRuntime.kt','utf8');
assert.doesNotMatch(runtime,/val trade = quote\.quality == QuoteQuality\.LIVE/,
  'Delayed TWSE z is incorrectly emitted as backup_realtime and rejected by the App');
const db=fs.readFileSync('native/android/TfAssetMarketDatabase.kt','utf8');
assert.match(db,/marketQuoteToRuntimeRow/,'cold and warm snapshots must share one complete bridge contract');
console.log('Native bridge contract smoke PASS; native behavior checked separately');
