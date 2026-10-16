import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {indexThreeGates,indexFiveGateLevels,parseTaiexIntraday,taiexSessionX} from '../src/market/taiexIndex';
import type {TaiexDailyOhlc} from '../src/market/taiexIndex';
import {NATIVE_CHART_STYLES,MARKET_CHART_DATA_OPTIONS,normalizeHoldingChart} from '../src/domain/chartEditor';

const official:TaiexDailyOhlc[]=[
  {date:'2026-10-15',open:48600,high:48900,low:47900,close:48100,source:'TWSE MI_5MINS_HIST'},
  {date:'2026-10-16',open:47000,high:47516.26,low:46969.87,close:47111.26,source:'TWSE MI_5MINS_HIST'},
];
const levels=indexThreeGates(official,'2026-10-16');
assert.ok(levels);
assert.deepEqual(indexFiveGateLevels(levels!).map(x=>x.name),
  ['上關價2','上關價1','中關價','下關價1','下關價2']);
assert.deepEqual(indexFiveGateLevels(levels!).map(x=>x.value),
  [49282,48900,48400,47900,47518]);
assert.equal(levels!.referenceDate,'2026-10-15','gates use previous official date');
assert.equal(indexThreeGates(official,'2026-10-15'),null,'no future or same-day references');
const data={
  stat:'OK',fields:['未含電子股指數','發行量加權股價指數','時間'],
  data:[['x','46,969.87','09:00:00'],['x','47,520.60','10:12:35'],
    ['x','47,111.26','13:30:00'],['x','99,999','13:30:05'],
    ['x','47,444','08:59:55'],['x','0','11:00:00'],['x','-','11:01:00'],
    ['x','47,520.60','10:12:35']],
};
const tape=parseTaiexIntraday(data,'2026-10-16');
assert.ok(tape);
assert.equal(tape!.source,'TWSE MI_5MINS_INDEX');
assert.equal(tape!.points.length,3,'ignore off-hours, invalid and duplicate rows');
assert.deepEqual(tape!.points.map(p=>p.value),[46969.87,47520.60,47111.26]);
const first=Date.parse('2026-10-16T09:00:00+08:00');
const last=Date.parse('2026-10-16T13:30:00+08:00');
assert.equal(tape!.points[0]!.at,first);
assert.equal(tape!.points[2]!.at,last);
assert.equal(taiexSessionX(first,'2026-10-16',5,310),5);
assert.equal(taiexSessionX(last,'2026-10-16',5,310),315);
assert.equal(taiexSessionX(first-60000,'2026-10-16',5,310),5);
assert.equal(parseTaiexIntraday({...data,stat:'NOT OK'},'2026-10-16'),null);
assert.equal(parseTaiexIntraday({...data,fields:['時間','漲幅']},'2026-10-16'),null);
assert.equal(parseTaiexIntraday(data,'2026-02-30'),null,'invalid date must be rejected');
assert.ok(NATIVE_CHART_STYLES.some(x=>x.id==='three-gates'));
assert.ok(MARKET_CHART_DATA_OPTIONS.some(x=>x.key==='threeGates'));
assert.equal(normalizeHoldingChart({style:'three-gates'}).style,'three-gates');
const chart=readFileSync('src/components/TaiexIndexCard.tsx','utf8');
const candles=readFileSync('src/components/OfficialCandleChart.tsx','utf8');
const picker=readFileSync('src/components/ChartStyleDropdown.tsx','utf8');
assert.match(chart,/fetchTaiexIntraday\(display.date/);
assert.match(chart,/officialTape\.points/);
assert.match(chart,/indexFiveGateLevels\(gates\)/);
assert.match(chart,/taiexSessionX\(at,date/);
assert.match(chart,/market:index:gates:'\+gate.id\+':left/,'left axis values stay individually editable');
assert.match(chart,/\{format\(gate.value\)\}/,'left axis shows only the numeric value');
assert.doesNotMatch(chart,/g.name\+'\\n'\+format\(g.value\)/,'hide labels from left axis only');
assert.match(chart,/top:position-height\/2/,'numeric value center stays on the price-line Y coordinate');
assert.match(chart,/preserveAspectRatio="none"/,'chart Y projection must not shift with aspect ratio');
assert.match(chart,/x1=\{0\} x2=\{320\} y1=\{y\(g.value\)\}/,'gate lines start at numeric-axis origin');
assert.match(candles,/showThreeGates/);
assert.match(candles,/gateLevels\.map\(g=><View/);
assert.match(picker,/NATIVE_CHART_STYLES\.filter/);
assert.match(readFileSync('src/screens/StockChartScreen.tsx','utf8'),/ChartStyleDropdown value=\{style\}/);
const packageFile=JSON.parse(readFileSync('package.json','utf8'));
const app=JSON.parse(readFileSync('app.json','utf8')).expo;
assert.equal(packageFile.version,'5.0.9');
assert.equal(app.version,'5.0.9');
assert.equal(app.android.versionCode,50009);
assert.doesNotMatch(readFileSync('src/finance/FinanceRuntime.tsx','utf8'),/MI_5MINS_INDEX/);
console.log('V5.0.9 official complete-session tape parser + five gate levels + stock chart selector PASS');
