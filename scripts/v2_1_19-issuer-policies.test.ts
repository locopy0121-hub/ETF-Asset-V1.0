import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeEtfCatalog,normalizeOfficialDividendType,parseOfficialEtfRow} from '../src/market/etfMetadata';
import {VERIFIED_ISSUER_DIVIDEND_POLICIES} from '../src/market/issuerDividendPolicies';
import {badgePresentationText} from '../src/domain/etfBadges';

// Issuer-attributed source snapshots, not an inference from ETF names or distribution history.
const expected:Record<string,string>={
  '0050':'半年配','0056':'季配','006208':'半年配','00713':'季配',
  '00878':'季配','00919':'季配','00929':'月配','00406A':'月配',
  '009816':'不配息','0052':'年配','00949':'年配',
};
assert.equal(VERIFIED_ISSUER_DIVIDEND_POLICIES.length,Object.keys(expected).length);
assert.equal(new Set(VERIFIED_ISSUER_DIVIDEND_POLICIES.map(item=>item.symbol)).size,VERIFIED_ISSUER_DIVIDEND_POLICIES.length);
const builtIn=mergeEtfCatalog([],[],[],[],VERIFIED_ISSUER_DIVIDEND_POLICIES);
for(const [symbol,dividendType] of Object.entries(expected)){
  const row=builtIn.find(item=>item.symbol===symbol);
  assert.ok(row,symbol+' should be available without quote/network');
  assert.equal(row.dividendType,dividendType);
  assert.ok(row.etfType,symbol+' should have known category');
  assert.ok(row.dividendSource?.includes('投信'));
  assert.ok(row.dividendSourceUrl?.startsWith('https://'));
  assert.equal(badgePresentationText('dividendType',row.etfType,row.dividendType),dividendType);
}
const legacy=[
  {symbol:'0050',name:'元大台灣50',market:'TWSE' as const,dividendType:null,etfType:'市值型'},
  {symbol:'00406A',name:'主動中信台灣收益',market:'TWSE' as const,dividendType:'季配',etfType:'主動式'},
  {symbol:'00888',name:'尚未核實',market:'TWSE' as const},
];
const upgraded=mergeEtfCatalog([],legacy,[],[],VERIFIED_ISSUER_DIVIDEND_POLICIES);
assert.equal(upgraded.find(item=>item.symbol==='0050')?.dividendType,'半年配','Old cache null upgraded');
assert.equal(upgraded.find(item=>item.symbol==='00406A')?.dividendType,'月配','Old unsourced cache overridden');
assert.equal(upgraded.find(item=>item.symbol==='00888')?.dividendType,null,'Unknown remains unknown');
assert.equal(badgePresentationText('dividendType',null,upgraded.find(item=>item.symbol==='00888')?.dividendType),'配息待確認');
const taxonomy=parseOfficialEtfRow({'基金代號':'0050','基金類型':'股票型','追蹤指數名稱':'臺灣50指數'},Date.now())!;
assert.equal(mergeEtfCatalog([],upgraded,[],[taxonomy],VERIFIED_ISSUER_DIVIDEND_POLICIES).find(item=>item.symbol==='0050')?.dividendType,'半年配','Missing official payout must preserve issuer policy');
// HYPOTHETICAL future official update, not a factual claim about 0050.
const checkedAt=VERIFIED_ISSUER_DIVIDEND_POLICIES[0]!.verifiedAt;
const newer=parseOfficialEtfRow({'基金代號':'0050','基金類型':'大型權值','收益分配頻率':'每月配息'},checkedAt+86_400_000)!;
const newerRow=mergeEtfCatalog([],upgraded,[],[newer],VERIFIED_ISSUER_DIVIDEND_POLICIES).find(item=>item.symbol==='0050')!;
assert.equal(newerRow.dividendType,'月配','Genuine newer explicit field supersedes older issuer snapshot');
assert.equal(newerRow.dividendVerifiedAt,checkedAt+86_400_000);
assert.equal(normalizeOfficialDividendType('每月評價／可能不分配'),null,'Do not convert an evaluation into a payout');
const runtime=readFileSync('src/market/MarketRuntime.tsx','utf8');
assert.ok(runtime.includes('mergeEtfCatalog(FALLBACK_CATALOG,parsed.catalog,[],[],VERIFIED_ISSUER_DIVIDEND_POLICIES)'));
assert.ok(runtime.includes('return mergeEtfCatalog(FALLBACK_CATALOG,previous,rows,official,VERIFIED_ISSUER_DIVIDEND_POLICIES)'));
const editor=readFileSync('src/components/EtfBadgeEditor.tsx','utf8');
assert.ok(editor.includes('VERIFIED_ISSUER_DIVIDEND_POLICIES'));
assert.ok(editor.includes('Linking.openURL(policy.sourceUrl)'));
console.log('V2.1.19 issuer policy 11 labels, stale-cache hydration, newer official precedence and source links PASS; Android UI/live policies remain unverified');
