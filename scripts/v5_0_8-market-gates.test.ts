import assert from 'node:assert/strict';
import {indexThreeGates,parseTaiexDailyOhlc,taiexStatusLabel,taipeiIndexDate} from '../src/market/taiexIndex';
const official={stat:'OK',fields:['日期','開盤指數','最高指數','最低指數','收盤指數'],
 data:[['115/10/14','48,382.64','49,059.12','48,382.64','48,625.83'],
       ['115/10/15','48,600.00','48,900.00','47,900.00','48,100.00'],
       ['115/10/16','47,400.00','47,516.26','47,111.26','47,111.26']]};
const rows=parseTaiexDailyOhlc(official);
assert.equal(rows.length,3);
const levels=indexThreeGates(rows,'2026-10-16');
assert.ok(levels);
assert.equal(levels.referenceDate,'2026-10-15');
assert.equal(levels.upper,49282);
assert.equal(levels.middle,48400);
assert.equal(levels.lower,47518);
assert.notEqual(levels.upper,indexThreeGates(rows,'2026-10-15')?.upper,'never use same day');
assert.equal(indexThreeGates(rows,'2026-10-14'),null,'do not invent yesterday OHLC');
assert.equal(indexThreeGates(rows,'invalid'),null);
assert.deepEqual(parseTaiexDailyOhlc({...official,fields:['日期','收盤指數']}),[]);
assert.equal(parseTaiexDailyOhlc({...official,data:[['115/10/16','100','90','95','96']]}).length,0);
const at=new Date('2026-10-16T13:30:00+08:00').getTime();
assert.equal(taipeiIndexDate(new Date(at)),'2026-10-16');
const status=taiexStatusLabel('官方最後收盤',{date:'2026-10-16',sourceAt:at,source:'TWSE FMTQIK',live:false});
assert.equal((status.match(/2026-10-16/g)||[]).length,1,'date should appear once');
assert.match(status,/收盤 13:30:00/);
assert.match(taiexStatusLabel('官方最後收盤',{date:'2026-10-15',sourceAt:at,source:'TWSE',live:false}),/時間待核實/);
console.log('V5.0.8 TAIEX three-gate official OHLC/parser and single trade-date label PASS');

// Index UI controls, explanations, preview and persistence remain connected without touching system settings.
import {readFileSync} from 'node:fs';
const card=readFileSync('src/components/TaiexIndexCard.tsx','utf8');
const workbench=readFileSync('src/components/PageLayoutToolWorkbench.tsx','utf8');
const info=readFileSync('src/components/taiexExplanations.ts','utf8');
const profile=readFileSync('src/editor/layoutToolModel.ts','utf8');
for(const item of ['refresh','three-gates','range:d1','range:d5','range:m1','range:m6','range:ytd','range:y1']){
  const needle=item.startsWith('range:')?"market:index:range:'":"market:index:"+item+":button";
  assert.ok(card.includes(needle),'editor target missing '+item);
}
for(const id of ['note:live','note:history','note:gates','note:source']){
  assert.ok(info.includes("market:index:"+id),'explanation catalog missing '+id);
}
assert.match(card,/editableContent&&override\?\.labelText/);
assert.match(card,/intraday&&sample.at/);
assert.match(card,/expectedPreviousDate===calculated.referenceDate/);
assert.match(workbench,/TAIEX_EXPLANATIONS\[selection.id\]/);
assert.match(workbench,/frame.key==='market-index'&&kind==='button'/);
assert.match(profile,/market:market-index/);
assert.match(readFileSync('src/screens/MarketResearchScreen.tsx','utf8'),/id="market:chart:ohlc-note"/);

// Static button captions are individually editable, never the price source or action.
import {TAIEX_EXPLANATIONS} from '../src/components/taiexExplanations';
for(const key of ['refresh','three-gates','range:d1','range:d5','range:m1','range:m6','range:ytd','range:y1']){
  assert.equal(typeof TAIEX_EXPLANATIONS['market:index:'+key+':button:label'],'string',key+' caption missing');
}
assert.ok(card.includes("kind=\"text\" editableContent"),'button caption must honor saved text overrides');
assert.ok(card.includes('官方行情來源：TWSE MIS／FMTQIK'),'TWSE verified source must appear');
