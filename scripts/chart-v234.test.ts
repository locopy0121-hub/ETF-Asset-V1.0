import assert from 'node:assert/strict';
import {parseTwseDailyRow,parseTwseMonthly,fetchOfficialDailyHistory} from '../src/market/twseDailyHistory';

const valid=['115/09/22','1,250,100','2,500,000','51.25','52.15','50.90','51.85','+0.1','3,000'];
assert.deepEqual(parseTwseDailyRow(valid),{
 date:'2026-09-22',open:51.25,high:52.15,low:50.9,close:51.85,volume:1250100,source:'TWSE'
});
assert.equal(parseTwseDailyRow(['115/02/30',...valid.slice(1)]),null,'reject invalid dates');
assert.equal(parseTwseDailyRow(['115/09/22','-','0','52','50','51','52']),null,'reject inconsistent OHLC');
assert.equal(parseTwseDailyRow(['115/09/22','100','0','52','53','51','--']),null,'never invent missing close');
assert.deepEqual(parseTwseMonthly({stat:'沒有符合條件的資料',data:[valid]}),[],'non-OK must not pass');
async function main(){
const oldFetch=globalThis.fetch;
let calls=0;
try{
 globalThis.fetch=async(input:RequestInfo|URL)=>{
   calls++;
   assert.match(String(input),/twse\.com\.tw\/exchangeReport\/STOCK_DAY/);
   return {ok:true,json:async()=>({stat:'OK',data:[valid]})} as Response;
 };
 const rows=await fetchOfficialDailyHistory('0050',2,new Date('2026-09-25T00:00:00Z'));
 assert.equal(calls,2);
 assert.equal(rows.length,1,'dedupe matching dates');
 assert.equal(rows[0]?.date,'2026-09-22');
}finally{globalThis.fetch=oldFetch;}
await assert.rejects(()=>fetchOfficialDailyHistory('0050',13),/無效/);
console.log('V2.3.4 item 7 official OHLCV parser, source, missing-data, request tests: PASS');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
