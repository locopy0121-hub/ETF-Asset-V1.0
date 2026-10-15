import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trendCenteredOffset,trendContentWidth} from '../src/domain/trendViewport';
const read=(path:string)=>readFileSync(path,'utf8');

assert.equal(trendContentWidth(300,2,1),300,'short trend fits viewport');
assert.ok(trendContentWidth(240,90,1)>1000,'90-day trend must be horizontally pannable');
assert.ok(trendContentWidth(240,90,2)>trendContentWidth(240,90,.65),'zoom increases graphical spacing');
assert.ok(trendContentWidth(240,90,Infinity)>0,'invalid zoom safe');
assert.ok(trendCenteredOffset(130,240,600,1200)>130,'keep historical focal bucket');
assert.equal(trendCenteredOffset(0,240,100,120),0,'cannot scroll beyond view');
assert.equal(trendCenteredOffset(9999,240,600,1200),960,'clamp far edge');

const viewport=read('src/components/TrendChartViewport.tsx');
const pnl=read('src/components/dashboard/DailyPnlHistoryModal.tsx');
const holdings=read('src/components/dashboard/HoldingMarketValueHistoryPanel.tsx');
assert.match(viewport,/scrollRef=useRef<ScrollView\|null>\(null\)/);
assert.match(viewport,/horizontal nestedScrollEnabled directionalLockEnabled/);
assert.match(viewport,/trendCenteredOffset\(previous\.offset,viewportWidth,previous\.width,width\)/);
assert.match(viewport,/>基準<\/Text>/);
assert.match(viewport,/>實際值<\/Text>/);
assert.match(viewport,/stepChartZoom\(zoom,1\)/);
assert.match(viewport,/stepChartZoom\(zoom,-1\)/);
assert.match(viewport,/scrollToEnd\(\{animated:false\}\)/);
for(const screen of [pnl,holdings]){
 assert.match(screen,/<TrendChartViewport pointCount=/);
 assert.match(screen,/\{chartWidth=>\{/,'plot width follows zoom/scroll viewport');
 assert.match(screen,/width:chartWidth/);
 assert.match(screen,/setSelectedDate\(point\.bucket\.endDate\)/,'date tapping preserved');
 assert.doesNotMatch(screen,/setPlotWidth\(/,'no recursive width measurements');
 assert.match(screen,/summarizePeriods\(chronological,period\)/,'finance source unchanged');
}
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json')).expo;
const [vMajor38=0,vMinor38=0,vPatch38=0]=pkg.version.split('.').map(Number);assert.ok(vMajor38>4||(vMajor38===4&&(vMinor38>0||(vMinor38===0&&vPatch38>=38))),'later releases must retain V4.0.38 chart behavior');
assert.equal(app.version,pkg.version);
assert.ok(app.android.versionCode>=40038);
assert.equal(Number(app.ios.buildNumber),app.android.versionCode);
assert.match(read('src/screens/SettingsScreen.tsx'),new RegExp("const BUILD='"+app.android.versionCode+"'"));
assert.doesNotMatch(read('src/finance/FinanceRuntime.tsx'),/TrendChartViewport|trendContentWidth/);
console.log('V4.0.38 global PnL/value chart pan, zoom, fixed axes, date selection, protected finance PASS');
