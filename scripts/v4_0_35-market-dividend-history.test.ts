import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseStockDividendHistory,stockDividendByFiscalYear} from '../src/market/stockDividendHistory';
const a={stock_id:'2330',date:'2026-09-18',year:'115年第2季',
 CashEarningsDistribution:2.5,CashStatutorySurplus:0,
 StockEarningsDistribution:1,StockStatutorySurplus:0.2,
 CashExDividendTradingDate:'2026-09-14',StockExDividendTradingDate:'2026-09-14',
 CashDividendPaymentDate:'2026-10-15',AnnouncementDate:'2026-08-05'};
const b={...a,date:'2026-06-18',year:'115年第1季',CashEarningsDistribution:3,StockEarningsDistribution:0,StockStatutorySurplus:0};
const other={...a,stock_id:'2317',CashEarningsDistribution:999999};
const history=parseStockDividendHistory({status:200,data:[a,b,a,other]},'2330');
assert.equal(history.length,2,'dedupe identical declarations and block cross ticker');
assert.equal(history[0]?.cashTwdPerShare,2.5);
assert.equal(history[0]?.stockTwdPerShare,1.2);
assert.equal(history[0]?.fiscalYear,2026);
assert.equal(history[0]?.paymentDate,'2026-10-15');
const yearly=stockDividendByFiscalYear(history);
assert.deepEqual(yearly.map(x=>[x.year,x.cashTwdPerShare,x.stockTwdPerShare]),[[2026,5.5,1.2]]);
const missing=parseStockDividendHistory({status:200,data:[{...a,CashStatutorySurplus:null,StockStatutorySurplus:''}]},'2330');
assert.equal(missing[0]?.cashTwdPerShare,null,'missing field must not equal zero');
assert.equal(missing[0]?.stockTwdPerShare,null);
assert.equal(stockDividendByFiscalYear([...missing,...history])[0]?.cashTwdPerShare,null,'yearly partial total is unknown');
const badDate=parseStockDividendHistory({status:200,data:[{...a,date:'2026-02-30'}]},'2330');
assert.equal(badDate.length,0);
assert.equal(parseStockDividendHistory({status:200,data:[{...a,year:'不適用'}]},'2330')[0]?.fiscalYear,null);
assert.equal(stockDividendByFiscalYear(parseStockDividendHistory({status:200,data:[{...a,year:'不適用'}]},'2330')).length,0);
assert.throws(()=>parseStockDividendHistory({status:429,msg:'quota'},'2330'),/quota/);
assert.throws(()=>parseStockDividendHistory({status:200,data:null},'2330'));
const s=readFileSync('src/screens/MarketResearchScreen.tsx','utf8');
const model=readFileSync('src/market/marketResearchModel.ts','utf8');
const component=readFileSync('src/components/StockDividendHistoryContent.tsx','utf8');
const api=readFileSync('src/market/stockDividendHistory.ts','utf8');
assert.match(model,/'dividend'/);
assert.match(s,/key:'dividend',label:'歷史股利'/);
assert.match(s,/tab==='dividend'\?<StockDividendHistoryContent/);
assert.match(component,/fetchStockDividendHistory/);
assert.match(component,/isEtf.*return/,'ETF must not pretend to have individual stock policy data');
assert.match(api,/dataset:'TaiwanStockDividend'/);
assert.match(api,/data_id:symbol/);
assert.doesNotMatch(readFileSync('src/finance/FinanceRuntime.tsx','utf8'),/StockDividendHistoryContent|stockDividendHistory/);
assert.doesNotMatch(readFileSync('src/screens/DividendScreen.tsx','utf8'),/StockDividendHistoryContent|stockDividendHistory/);
assert.doesNotMatch(readFileSync('src/screens/SettingsScreen.tsx','utf8'),/StockDividendHistoryContent/);
console.log('V4.0.35 market historical dividend, official reference links, fiscal summaries, missing data, SSOT isolation PASS');
