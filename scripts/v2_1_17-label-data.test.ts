import assert from 'node:assert/strict';
import {badgePresentationText,normalizeEtfBadges,todayEtfReminderMap,DEFAULT_ETF_BADGES} from '../src/domain/etfBadges';
import {mergeEtfCatalog,parseOfficialEtfRow} from '../src/market/etfMetadata';
import type {DividendLedgerEntry} from '../src/finance/canonicalLedger';

// Official dataset documents these field names. All values below are contract fixtures,
// not claims that the live feed has been retrieved on an Android device.
const date=1_779_312_000_000;
const official=[
  {'基金代號':'0050','基金中文名稱':'元大台灣50','基金類型':'股票型','標的指數/追蹤指數名稱':'臺灣50指數'},
  {'基金代號':'0056','基金中文名稱':'元大高股息','基金類型':'股票型','標的指數/追蹤指數名稱':'臺灣高股息指數'},
  {'基金代號':'00878','基金中文名稱':'國泰永續高股息','基金類型':'股票型','標的指數/追蹤指數名稱':'MSCI臺灣ESG永續高股息精選30'},
  {'基金代號':'00713','基金中文名稱':'元大台灣高息低波','基金類型':'股票型','標的指數/追蹤指數名稱':'臺灣高股息低波動'},
  {'基金代號':'009816','基金中文名稱':'臺灣TOP50測試','基金類型':'股票型','標的指數/追蹤指數名稱':'臺灣TOP50'},
  {'基金代號':'00406A','基金中文名稱':'主動基金','基金類型':'主動式ETF'},
].map(x=>parseOfficialEtfRow(x,date));
assert(official.every(Boolean),'Recognized official categories and explicit index labels can populate taxonomy for multiple ETFs');
const catalog=mergeEtfCatalog([],[],[],official.filter((v):v is NonNullable<typeof v>=>v!=null));
assert.equal(catalog.find(x=>x.symbol==='0050')?.etfType,'市值型');
assert.equal(catalog.find(x=>x.symbol==='009816')?.etfType,'市值型');
for(const symbol of ['0056','00878','00713'])assert.equal(catalog.find(x=>x.symbol===symbol)?.etfType,'高股息型');
assert.equal(catalog.find(x=>x.symbol==='00406A')?.etfType,'主動式');
assert.equal(catalog.find(x=>x.symbol==='0050')?.dividendType,null,
  'A verified index name is NOT official evidence for a dividend schedule');
assert.equal(parseOfficialEtfRow({'基金代號':'00919','基金中文名稱':'高息產品','基金類型':'股票型'},date),null,
  'Fund names alone must never substitute for an explicit official index or category');
assert.equal(parseOfficialEtfRow({'基金代號':'00409A','基金類型':'主動式ETF','配息頻率':'每月評價／可能不分配'},date)?.dividendType,null);
assert.equal(badgePresentationText('etfType',null,null),'類別待確認');
assert.equal(badgePresentationText('dividendType',null,null),'配息待確認');
assert.equal(badgePresentationText('etfType','市值型',null),'市值','UI hides only the final 型; raw metadata stays 市值型');
assert.equal(badgePresentationText('dividendType',null,'半年配'),'半年配');
assert.equal(badgePresentationText('reminder',null,null),'','No spurious reminder badges');
const settings=normalizeEtfBadges({...DEFAULT_ETF_BADGES,badges:{...DEFAULT_ETF_BADGES.badges,reminder:{...DEFAULT_ETF_BADGES.badges.reminder,enabled:false}}});
assert.equal(settings.badges.reminder.enabled,false,'A reminder switch is independent from category switches');
assert.equal(todayEtfReminderMap([] as DividendLedgerEntry[],'2026-09-24').size,0,
  'Empty announced/recorded event feed must never fabricate a today alert');
console.log('V2.1.17 metadata + compact badge behavior PASS; Android dimensions, official live completeness and payout feeds still need verification');
