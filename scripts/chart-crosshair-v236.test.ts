import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {candleIndexAtX} from '../src/domain/chartCrosshair';

assert.equal(candleIndexAtX(12,0,18),0);
assert.equal(candleIndexAtX(35,0,18),1);
assert.equal(candleIndexAtX(35,36,18),3,'offset remains aligned after horizontal scroll');
assert.equal(candleIndexAtX(-50,0,18),0,'left edge clamps');
assert.equal(candleIndexAtX(10000,0,18),17,'right edge clamps');
assert.equal(candleIndexAtX(10,0,0),-1,'empty history cannot select a fictitious candle');
const view=readFileSync('src/components/OfficialCandleChart.tsx','utf8');
for(const token of ['crosshairEnabled','onResponderMove','verticalCrosshair','horizontalCrosshair','volumeCrosshair','crosshairPrice','crosshairDateTag','selected.close','selected.date','setSelectedDate'])assert.ok(view.includes(token),token);
assert.ok(view.includes('scrollEnabled={!crosshairEnabled}'),'crosshair mode must not fight horizontal scrolling');
assert.ok(view.includes('index%Math.max'),'date ticks must be sparse');
console.log('V2.3.6 K-line crosshair coordinate and source view contract: PASS');
