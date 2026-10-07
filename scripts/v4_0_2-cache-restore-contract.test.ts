import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync('native/android/SaiEtfMarketRuntime.kt','utf8');
assert.match(runtime,/center\.restorePersistedQuotes\(persistence\.persistedQuotes\(\)\.values/,
  'Persisted quotes must hydrate the same memory SSOT before partial provider updates');
console.log('Cache restore wiring smoke PASS; native behavior checked separately');
