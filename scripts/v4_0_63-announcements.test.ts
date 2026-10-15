import assert from 'node:assert/strict';
import {parseExchangeDividendRows,parseEtfDividendHtml,mergeDividendAnnouncements,announcementCalendarEvents,mergeCalendarCoverage,fetchDividendAnnouncements} from '../src/dividend/dividendAnnouncements';
async function main(){
const raw=[{Date:'1151015',Code:'00401A',Name:'主動摩根台灣鑫收',Exdividend:'息',CashDividend:''},
 {Date:'1151015',Code:'1711',Name:'現增',Exdividend:'權',CashDividend:'0'},
 {Date:'1150230',Code:'0050',Name:'無效日期',Exdividend:'息',CashDividend:'1'}];
const rows=parseExchangeDividendRows(raw,1);
assert.equal(rows.length,1);assert.equal(rows[0]!.symbol,'00401A');assert.equal(rows[0]!.perShareAmount,null);
const html='<table><tr><td>00401A</td><td>主動摩根台灣鑫收</td><td>115年10月15日</td><td>115年10月21日</td><td>115年11月10日</td><td>0.131</td></tr></table>';
const etf=parseEtfDividendHtml(html,2);assert.equal(etf.length,1);
const slowerExchange=rows.map(row=>({...row,updatedAt:3}));
const race=mergeDividendAnnouncements(slowerExchange,etf);
assert.equal(race[0]!.paymentDate,'2026-11-10','older successful detailed source enriches newer incomplete exchange row');
const merged=mergeDividendAnnouncements(rows,etf);assert.equal(merged.length,1);
assert.equal(merged[0]!.paymentDate,'2026-11-10');assert.equal(merged[0]!.perShareAmount,.131);
assert.equal(mergeDividendAnnouncements(merged,rows)[0]!.perShareAmount,.131,'older/incomplete rows do not regress known values');
const revised=parseEtfDividendHtml(html.replace('0.131','0.15'),3);
assert.equal(mergeDividendAnnouncements(merged,revised)[0]!.perShareAmount,.15,'same announcement updates without duplicates');
const events=announcementCalendarEvents(merged,'2026-10-15');assert.equal(events.length,3);assert.ok(events.every(event=>event.status==='已公告'),'published amounts update forecast display without posting cash');assert.ok(!events.some(e=>e.type==='lastBuyDate'),'do not guess last purchase without official date');
const local={...events[0]!,id:'local',status:'已確定' as const};
assert.equal(mergeCalendarCoverage([local],events).length,3);assert.equal(mergeCalendarCoverage([local],events)[0]!.id,'local');
const before=JSON.stringify(merged);
let calls=0;
const all=await fetchDividendAnnouncements(async(url)=>{calls++;return {ok:true,status:200,json:async()=>raw,text:async()=>html} as Response;});
assert.equal(all.rows.length,1);assert.equal(all.warnings.length,0);assert.equal(calls,2,'no per-symbol queries or holdings restriction');
for(const slow of ['exchange','etf']){
 const ordered=await fetchDividendAnnouncements(async url=>{const ex=String(url).includes('TWT48');if((slow==='exchange')===ex)await new Promise(resolve=>setTimeout(resolve,5));
 return {ok:true,status:200,json:async()=>[{...raw[0],CashDividend:'0.1'}],text:async()=>html.replace('0.131','0.15')} as Response;});
 assert.equal(ordered.rows[0]!.perShareAmount,.15,'detailed ETF revision wins regardless of response order');
 assert.equal(ordered.rows[0]!.paymentDate,'2026-11-10');
}
const partial=await fetchDividendAnnouncements(async(url)=>{if(String(url).includes('TWT48'))throw Error('offline');return {ok:true,status:200,text:async()=>html} as Response;});
assert.equal(partial.rows.length,1);assert.equal(partial.warnings.length,1);
await assert.rejects(fetchDividendAnnouncements(async()=>{throw Error('offline');}),/無法取得/);
await assert.rejects(fetchDividendAnnouncements(async()=>({ok:true,status:200,json:async()=>({error:'blocked'}),text:async()=>'<html>captcha</html>'}) as Response),/無法取得/);
assert.equal(JSON.stringify(merged),before);
console.log('V4.0.63 announcement parsing, non-held coverage, strict dates, merge, correction, partial failure and cash isolation PASS');

}
main().catch(error=>{console.error(error);process.exitCode=1;});
