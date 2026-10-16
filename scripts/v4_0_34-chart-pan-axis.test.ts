import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {candleIndexAtX} from '../src/domain/chartCrosshair';

const chart=readFileSync('src/components/OfficialCandleChart.tsx','utf8');
const market=readFileSync('src/screens/MarketResearchScreen.tsx','utf8');
const stock=readFileSync('src/screens/StockChartScreen.tsx','utf8');
const settings=readFileSync('src/screens/SettingsScreen.tsx','utf8');
const finance=readFileSync('src/finance/FinanceRuntime.tsx','utf8');

assert.match(chart,/scrollEnabled=\{!\(crosshairEnabled&&cursorDragMode\)\}/,'crosshair ON must allow horizontal panning in normal mode');
assert.match(chart,/setCursorDragMode\(false\)/,'chart pan is the default even when crosshair turns ON');
assert.match(chart,/crosshairEnabled&&cursorDragMode\?<View style=\{\[styles\.touchOverlay/,'drag overlay intercepts only explicit cursor drag mode');
assert.match(chart,/onResponderMove=\{e=>chooseAt\(e\.nativeEvent\.locationX\)\}/,'cursor drag still works in its own mode');
assert.match(chart,/onPress=\{\(\)=>chooseCandle\(candle\)\}/,'tap any candle to select without intercepting panning');
assert.match(chart,/ref=\{scrollViewRef\} horizontal/,'shared historical chart scroll view');
assert.match(chart,/onContentSizeChange=\{\(\)=>\{/,'scroll to most recent chart data only on dataset change');
assert.match(chart,/autoScrollDataset\.current!==datasetId/,'do not yank chart back to latest on touch/selection re-render');
assert.match(chart,/scrollViewRef\.current\?\.scrollToEnd\(\{animated:false\}\)/);
assert.ok(chart.indexOf('<View style={[styles.axis,showThreeGates')<chart.indexOf('<View style={styles.viewport}'),'baseline axis must be left of K chart');
assert.ok(chart.indexOf('<View style={styles.actualAxis}>')>chart.indexOf('</ScrollView>'),'selected actual values must be right of chart');
assert.match(chart,/costAxisLabel/,'cost baseline label stays pinned on left while chart pans');
assert.match(chart,/styles\.crosshairPrice/,'selected close label remains pinned to actual-value side');
const baselineBlock=chart.slice(chart.indexOf('<View style={[styles.axis,showThreeGates'),chart.indexOf('<View style={styles.viewport}'));
assert.doesNotMatch(baselineBlock,/crosshairPrice/,'do not put actual value inside baseline axis');
assert.match(chart,/選取值/);
assert.match(chart,/左右滑動可查看全部歷史 K 棒/);
assert.match(market,/<OfficialCandleChart key=/,'market chart gets shared fix');
assert.match(stock,/<OfficialCandleChart candles=\{candles\}/,'stock and holding charts get shared fix');
// Scroll offsets must remain correct when choosing candles near either edge.
assert.equal(candleIndexAtX(12,0,82,18,3),0);
assert.equal(candleIndexAtX(60,1080,82,18,3),63);
assert.equal(candleIndexAtX(80,20000,82,18,3),81,'last candle clamped');
assert.equal(candleIndexAtX(2,0,82,18,3),0,'first candle clamped');
assert.doesNotMatch(settings,/cursorDragMode|costAxisLabel/,'protected settings page only gets the version identifier update');
assert.doesNotMatch(finance,/cursorDragMode|costAxisLabel/,'financial core untouched');
const version=JSON.parse(readFileSync('app.json','utf8')).expo;
const [vMajor34=0,vMinor34=0,vPatch34=0]=version.version.split('.').map(Number);assert.ok(vMajor34>4||(vMajor34===4&&(vMinor34>0||(vMinor34===0&&vPatch34>=34))));assert.ok(version.android.versionCode>=40034);
console.log('V4.0.34 baseline left / actual values right, historical horizontal pan, opt-in cursor dragging and safe SSOT: PASS');
