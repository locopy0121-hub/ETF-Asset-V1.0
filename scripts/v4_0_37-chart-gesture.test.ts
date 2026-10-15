import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {anchoredChartOffset,chartCandleMetrics,stepChartZoom} from '../src/domain/chartZoom';

// V4.0.37: fast pinch events must not be silently discarded during pending layout.
const chart=readFileSync('src/components/OfficialCandleChart.tsx','utf8');
const legacy=readFileSync('scripts/v4_0_36-chart-dropdown-zoom.test.ts','utf8');
assert.match(chart,/const queuedZoom=useRef<number\|null>\(null\)/);
assert.match(chart,/if\(pendingZoom\.current\)\{\s*queuedZoom\.current=target===before\?null:target;/);
assert.match(chart,/if\(queuedZoom\.current!==null\)\{\s*const requested=queuedZoom\.current;\s*queuedZoom\.current=null;\s*applyZoom\(requested\);/);
assert.match(chart,/pendingZoom\.current=null;\s*queuedZoom\.current=null;\s*autoScrollDataset\.current=datasetId/);
assert.doesNotMatch(chart,/if\(target===before\|\|pendingZoom\.current\)return/,'must not drop pinch requests');
assert.match(chart,/onTouchMove=\{event=>\{/);
assert.match(chart,/onTouchCancel=\{\(\)=>\{pinch\.current=null;\}\}/);
assert.match(chart,/anchoredChartOffset\(anchor\.oldOffset,viewportWidth\.current/);
assert.ok(anchoredChartOffset(240,240,18,36,3000,3)>240,'replayed zoom retains a historical focal point');
assert.equal(stepChartZoom(1,1),1.25);
assert.ok(chartCandleMetrics(2.5).step>chartCandleMetrics(1).step);
assert.match(legacy,/id\.android\.versionCode>=40036/,'previous acceptance test must be forward-compatible');
const app=JSON.parse(readFileSync('app.json','utf8')).expo;
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(app.version,pkg.version);
assert.ok(app.android.versionCode>=40037);
const [vMajor37=0,vMinor37=0,vPatch37=0]=pkg.version.split('.').map(Number);assert.ok(vMajor37>4||(vMajor37===4&&(vMinor37>0||(vMinor37===0&&vPatch37>=37))));
assert.doesNotMatch(readFileSync('src/screens/SettingsScreen.tsx','utf8'),/queuedZoom|pendingZoom/);
assert.doesNotMatch(readFileSync('src/finance/FinanceRuntime.tsx','utf8'),/queuedZoom|pendingZoom/);
console.log('V4.0.37 pinch final intent, queued layout replay, anchored history, protected Settings/Finance PASS');
