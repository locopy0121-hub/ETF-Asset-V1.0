import assert from 'node:assert/strict';
import fs from 'node:fs';
const providers=fs.readFileSync('native/android/SaiEtfAndroidMarketProviders.kt','utf8');
assert.match(providers,/parseMisSourceTimestamp\(row/,'MIS source clock must use validated d/t, never receipt time');
assert.doesNotMatch(providers,/val epochMillis = if \(epochSeconds > 0L\)[\s\S]*?else \{\s*System.currentTimeMillis/,
  'Missing Yahoo timestamps must not become fresh ticks');
