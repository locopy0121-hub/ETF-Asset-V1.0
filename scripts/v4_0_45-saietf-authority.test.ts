import assert from 'node:assert/strict';
import fs from 'node:fs';
import {saiEtfSnapshotHasAdvancedQuote} from '../src/market/saiEtfSnapshotContract';
import type {UnifiedMarketSnapshot,UnifiedMarketRow} from '../src/native/TfAssetNativeBridge';
import type {RuntimeQuote} from '../src/finance/financeSeed';

const at=Date.parse('2026-10-12T02:26:00Z');
const quote=(overrides:Partial<UnifiedMarketRow>={}):UnifiedMarketRow=>({
  symbol:'0050', name:'元大台灣50', currentPrice:114.05,
  previousClose:114.0, officialTradePrice:114.05,
  sourceQuoteAt:at,sessionDate:'2026-10-12',source:'FUGLE',
  quality:'trade',priceType:'REALTIME_TRADE',quoteStatus:'LIVE',
  isFallback:false,market:'TSE',statusMessage:'SaiETF',
  checkedAt:at,sequence:3, ...overrides,
});
const snap=(rows:UnifiedMarketRow[]):UnifiedMarketSnapshot=>({
  version:42, queriedAt:at,quotes:rows,missing:[],phase:'live',
});
const old={...quote({sourceQuoteAt:at-1_000,sequence:2})} as unknown as RuntimeQuote;
assert.equal(saiEtfSnapshotHasAdvancedQuote(snap([quote()]),[old]),true,
  'new SaiETF source clock is an update even when the price is unchanged');
assert.equal(saiEtfSnapshotHasAdvancedQuote(snap([quote()]),[quote() as unknown as RuntimeQuote]),false,
  'polling the same trade must not count as a successful new tick');
assert.equal(saiEtfSnapshotHasAdvancedQuote(snap([quote({sequence:4})]),[quote() as unknown as RuntimeQuote]),true,
  'a Fugle trade sequence can advance at an equal source timestamp');
assert.equal(saiEtfSnapshotHasAdvancedQuote(snap([quote({quoteStatus:'STALE'})]),[old]),false,
  'an older session/cached stale quote is not a new live trade');
assert.equal(saiEtfSnapshotHasAdvancedQuote(snap([quote({sourceQuoteAt:at-2_000})]),[old]),false,
  'a regressed source clock cannot be acknowledged as a new tick');
assert.equal(saiEtfSnapshotHasAdvancedQuote(snap([quote({quality:'backup_realtime',source:'YAHOO',priceType:'BACKUP_REALTIME'})]),[old]),true,
  'a valid newer fallback trade is acknowledged without overriding native arbitration');
const adapter=fs.readFileSync('src/market/unifiedMarketAdapter.ts','utf8');
assert.match(adapter,/previous\.filter\(old=>!incoming\.has\(old\.symbol\)\)/);
assert.doesNotMatch(adapter,/incoming\.get\(old\.symbol\)!\.sourceQuoteAt.*old\.sourceQuoteAt/,
  'React Native must not compete with SaiETF native price arbitration');
const native=fs.readFileSync('native/android/SaiEtfMarketRuntime.kt','utf8');
assert.match(native,/val live = center\.memoryQuotes\(symbols\)/);
assert.match(native,/val missing = if \(sessionActive\) symbols - currentSessionSymbols/);
assert.match(native,/now - sourceAt > 30_000L -> QuoteQuality\.DELAYED/);
const core=fs.readFileSync('native/android/SaiEtfMarketDataCenter.kt','utf8');
assert.match(core,/fun acceptStreamingQuote\(/);
assert.match(core,/hotStore\.publish\(accepted\.values\)/);
const packageJson=JSON.parse(fs.readFileSync('package.json','utf8'));
const appJson=JSON.parse(fs.readFileSync('app.json','utf8'));
assert.equal(packageJson.version,'4.0.45');
assert.equal(appJson.expo.version,'4.0.45');
assert.equal(appJson.expo.android.versionCode,40045);
console.log('V4.0.45 SaiETF 2.0.2 primary market authority and live tick acknowledgment PASS');
