import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync('native/android/SaiEtfMarketRuntime.kt','utf8');
const adapter=fs.readFileSync('native/android/SaiEtfMarketRestoreAdapter.kt','utf8');
const center=fs.readFileSync('native/android/SaiEtfMarketDataCenter.kt','utf8');
assert.match(runtime,/MemoryMarketStore\([\s\S]*cachedSaiEtfMarketReferences\(persistence\.persistedQuotes\(\)\.values,clockMillis\(\)\)/,
  'Persisted references hydrate the SaiETF memory SSOT through a constructor adapter');
assert.match(runtime,/hotStore = warmStore/,'The frozen market center consumes the same hydrated memory store');
assert.doesNotMatch(runtime,/center\.restorePersistedQuotes/,'The frozen SaiETF MarketDataCenter must not gain TF-only mutations');
assert.match(adapter,/7L \* 24L \* 60L \* 60L \* 1_000L/,
  'Startup references must respect SaiETF seven-day cache bound');
assert.match(adapter,/QuoteQuality\.STALE/,'Previous-session cache remains a stale reference');
assert.doesNotMatch(center,/fun restorePersistedQuotes/,'Never modify SaiETF locked core to pass a legacy smoke test');
console.log('SaiETF immutable core + warm-store persistence adapter source contracts PASS');
