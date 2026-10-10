import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchTaiwanSecurities,aggregateMarketCandles,marketIndicators,premiumDiscount} from '../src/market/marketResearchModel';
import type {TaiwanSecurityInfo} from '../src/market/TaiwanSecurityCatalog';
import type {DailyCandle} from '../src/market/twseDailyHistory';
const sec=(symbol:string,name:string):TaiwanSecurityInfo=>({
 symbol,name,companyName:null,industry:null,market:'TWSE',paidInCapitalTwd:null,issuedCommonShares:null,englishShortName:null,
 phone:null,website:null,listingDate:null,parValueText:null,chairman:null,generalManager:null,address:null,source:'test'});
const catalog=[sec('00985A','主動野村台灣50'),sec('00985D','主動貝萊德優投等'),sec('00985B','群益ESG投等債0-5'),sec('2330','台積電')];
const before=JSON.stringify(catalog);
assert.deepEqual(searchTaiwanSecurities(catalog,'00985').map(x=>x.symbol),['00985A','00985B','00985D']);
assert.equal(searchTaiwanSecurities(catalog,'台積電')[0]?.symbol,'2330');
assert.equal(searchTaiwanSecurities(catalog,'2330')[0]?.symbol,'2330');
assert.deepEqual(searchTaiwanSecurities(catalog,'未知'),[]);
assert.equal(JSON.stringify(catalog),before);
const candles:DailyCandle[]=[
 {date:'2026-09-30',open:10,high:12,low:9,close:11,volume:100,source:'TWSE'},
 {date:'2026-10-01',open:11,high:13,low:10,close:12,volume:200,source:'TWSE'},
 {date:'2026-10-02',open:12,high:14,low:11,close:13,volume:300,source:'TWSE'}];
const immutable=JSON.stringify(candles);
assert.deepEqual(aggregateMarketCandles(candles,'month').map(x=>[x.open,x.high,x.low,x.close,x.volume]),[[10,12,9,11,100],[11,14,10,13,500]]);
assert.equal(aggregateMarketCandles(candles,'day').length,3);
assert.equal(aggregateMarketCandles(candles,'week').length,1,'three dates in the same ISO week aggregate together');
assert.equal(marketIndicators(candles).ma20,null);
assert.equal(premiumDiscount(24.32,24.21)?.toFixed(2),'0.45');
assert.equal(premiumDiscount(24.32,null),null);
assert.equal(JSON.stringify(candles),immutable);
const source=readFileSync('src/screens/MarketResearchScreen.tsx','utf8');
const app=readFileSync('App.tsx','utf8');
const market=readFileSync('src/market/MarketRuntime.tsx','utf8');
const settings=readFileSync('src/screens/SettingsScreen.tsx','utf8');
assert.match(app,/case 'market': return <MarketResearchScreen\/>/);
assert.match(source,/searchTaiwanSecurities\(market\.catalog,query\)/);
assert.match(source,/fetchOfficialDailyHistory\(symbol/);
assert.match(source,/setResearchSymbols\(symbol\?\[symbol\]:\[\]\)/);
assert.match(source,/OfficialCandleChart/);
assert.match(source,/EtfConstituentsContent/);
assert.match(source,/PageEditorStack pageKey="market"/);
assert.match(market,/combinedSymbols\(\)/);
assert.doesNotMatch(settings,/MarketResearchScreen|PageEditorStack pageKey="market"/);
const identity=JSON.parse(readFileSync('app.json','utf8')).expo;
assert.equal(identity.version,'4.0.28');
assert.equal(identity.android.versionCode,40028);
console.log('V4.0.28 market query, official OHLC aggregation, read-only subscriptions, protected settings: PASS');
