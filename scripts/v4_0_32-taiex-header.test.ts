import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseTwseTaiexHistory,parseYahooTaiexIntraday,taiexSnapshot} from '../src/market/taiexIndex';
const fields=['收盤指數','日期','開盤指數','最低指數','最高指數'];
const raw={stat:'OK',fields,data:[
 ['49,100.20','115/10/08','49,000.00','48,980.20','49,200.40'],
 ['49,350.60','115/10/09','49,200.00','49,190.00','49,410.00'],
]};
const parsed=parseTwseTaiexHistory(raw);
assert.equal(parsed.length,2);
assert.equal(parsed[0]?.date,'2026-10-08');
assert.deepEqual([parsed[1]?.open,parsed[1]?.high,parsed[1]?.low,parsed[1]?.close],[49200,49410,49190,49350.60]);
assert.equal(parseTwseTaiexHistory({...raw,stat:'休市'}).length,0);
assert.equal(parseTwseTaiexHistory({...raw,fields:fields.slice(0,4)}).length,0);
assert.equal(parseTwseTaiexHistory({...raw,data:[['49,350.60','115/02/30','49,200','49,190','49,410']]}).length,0);
assert.equal(parseTwseTaiexHistory({...raw,data:[['49,350.60','115/10/09','49,600','49,190','49,410']]}).length,0);
const official=taiexSnapshot(parsed,null,new Date('2026-10-11T01:00:00Z').getTime());
assert.equal(official?.value,49350.60);assert.equal(official?.previousClose,49100.20);
assert.equal(official?.change?.toFixed(2),'250.40');
assert.equal(official?.date,'2026-10-09');
const tick=(t:string)=>Math.floor(new Date(t).getTime()/1000);
const yahoo={chart:{result:[{meta:{symbol:'^TWII'},timestamp:[
 tick('2026-10-12T01:00:00Z'),tick('2026-10-12T01:05:00Z')],
 indicators:{quote:[{close:[49400.1,49500.2]}]}}]}};
const intraday=parseYahooTaiexIntraday(yahoo);
assert.equal(intraday?.date,'2026-10-12');
assert.equal(intraday?.points.length,2);
assert.equal(taiexSnapshot(parsed,intraday,new Date('2026-10-12T01:06:00Z').getTime())?.value,49500.2);
assert.equal(taiexSnapshot(parsed,intraday,new Date('2026-10-12T04:10:00Z').getTime())?.source,'TWSE 官方日資料','stale Yahoo intraday cannot replace official EOD');
assert.equal(taiexSnapshot(parsed,intraday,new Date('2026-10-13T01:06:00Z').getTime())?.value,49350.60,'yesterday Yahoo data cannot be called live');
assert.equal(parseYahooTaiexIntraday({chart:{result:[{...yahoo.chart.result[0],meta:{symbol:'9999'}}]}}),null);
const screen=readFileSync('src/screens/MarketResearchScreen.tsx','utf8');
const frames=readFileSync('src/domain/frameRegistry.ts','utf8');
assert.match(screen,/market-taiex.*TaiexOverviewCard/);
assert.match(frames,/market-taiex/);
assert.ok(screen.indexOf("key:'market-taiex'")<screen.indexOf("key:'market-search'"));
assert.doesNotMatch(readFileSync('src/screens/SettingsScreen.tsx','utf8'),/TaiexOverviewCard/);
assert.doesNotMatch(readFileSync('src/finance/FinanceRuntime.tsx','utf8'),/fetchOfficialTaiexHistory/);
const id=JSON.parse(readFileSync('app.json','utf8')).expo;
assert.equal(id.version,'4.0.32');assert.equal(id.android.versionCode,40032);
console.log('V4.0.32 official TAIEX historical validation, Yahoo intraday date/freshness, protected settings and index header: PASS');
