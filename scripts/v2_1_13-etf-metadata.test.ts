import assert from 'node:assert/strict';
import {
  mergeEtfCatalog,
  normalizeOfficialDividendType,
  normalizeOfficialEtfType,
  parseOfficialEtfRow,
  shouldRefreshEtfCatalog,
} from '../src/market/etfMetadata';

// Input/output behavior tests, not source-text smoke. Official live-feed and Android remain separate gates.
assert.equal(normalizeOfficialEtfType('大型權值'), '市值型');
assert.equal(normalizeOfficialEtfType('ESG 永續高股息'), '高股息型');
assert.equal(normalizeOfficialEtfType('高息低波動'), '高股息型');
assert.equal(normalizeOfficialEtfType('主動式 ETF'), '主動式');
assert.equal(normalizeOfficialEtfType('公司債'), '債券型');
assert.equal(normalizeOfficialDividendType('每季'), '季配');
assert.equal(normalizeOfficialDividendType('每兩個月'), '雙月配');
assert.equal(normalizeOfficialDividendType('每年兩次'), '半年配');
assert.equal(normalizeOfficialDividendType('每月配息'), '月配');
assert.equal(normalizeOfficialDividendType('每月評價／可能不分配'), null);
assert.equal(normalizeOfficialDividendType(''), null);
assert.equal(parseOfficialEtfRow({'基金代號':'0050','基金名稱':'高股息測試名稱','基金類型':'','配息頻率':''}, 100), null);

const official = [
  parseOfficialEtfRow({'基金代號':'0050','基金類型':'大型權值','收益分配頻率':'半年配'}, 1_000),
  parseOfficialEtfRow({'基金代號':'00878','基金類型':'ESG 永續高股息','配息頻率':'每季'}, 1_000),
  parseOfficialEtfRow({'基金代號':'00406A','基金類型':'主動式 ETF','收益分配頻率':'每月評價／可能不分配'}, 1_000),
].filter((row): row is NonNullable<typeof row> => row != null);

const initial = mergeEtfCatalog(
  [{symbol:'0050',name:'元大台灣50',market:'fallback'}],
  [],
  [{symbol:'0050',name:'元大台灣50',market:'TWSE'}],
  official,
);
assert.equal(initial.find(row=>row.symbol==='0050')?.etfType, '市值型');
assert.equal(initial.find(row=>row.symbol==='0050')?.dividendType, '半年配');
assert.equal(initial.find(row=>row.symbol==='00878')?.etfType, '高股息型', 'Metadata is retained even without any quote row');
assert.equal(initial.find(row=>row.symbol==='00878')?.dividendType, '季配');
assert.equal(initial.find(row=>row.symbol==='00406A')?.dividendType, null, 'Evaluation frequency is not payout policy');

const afterFailedFeed = mergeEtfCatalog(
  [],
  initial,
  [{symbol:'0050',name:'元大台灣50',market:'TWSE',etfType:null,dividendType:null}],
  [],
);
assert.equal(afterFailedFeed.find(row=>row.symbol==='0050')?.dividendType,'半年配','A partial refresh must retain last-known-good payout policy');
assert.equal(afterFailedFeed.find(row=>row.symbol==='00878')?.metadataVerifiedAt,1000,'Last-known-good provenance is retained');

assert.equal(shouldRefreshEtfCatalog(null,1000),true);
assert.equal(shouldRefreshEtfCatalog(1000,1000+100),false);
assert.equal(shouldRefreshEtfCatalog(1000,1000+86_400_000),true);
assert.equal(shouldRefreshEtfCatalog(1000,900),true);

console.log('V2.1.13 ETF official classification/merge/cache behavior tests PASS; live feed and Android pending.');
