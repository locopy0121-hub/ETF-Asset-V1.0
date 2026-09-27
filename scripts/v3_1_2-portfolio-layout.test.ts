import assert from 'node:assert/strict';
import {safeHoldingStyle,holdingCardLayout,holdingPageWidth,holdingPages} from '../src/domain/holdingLayoutPolicy';
import {holdingPreviewLayout} from '../src/editor/holdingPreviewModel';
import {readFileSync} from 'node:fs';

// Behavioral tests: all graph-capable modes collapse safely in three columns.
for(const style of ['chart','advanced'] as const){
  assert.equal(safeHoldingStyle('grid3',style),'quote');
  assert.equal(safeHoldingStyle('grid2',style),style);
  assert.equal(safeHoldingStyle('list',style),style);
}
assert.equal(safeHoldingStyle('grid3','compact'),'compact');
assert.equal(safeHoldingStyle('grid3','quote'),'quote');
assert.equal(holdingCardLayout('grid3'),'micro');
for(const mode of ['grid2','paged2'])assert.equal(holdingCardLayout(mode),'narrow');
for(const mode of ['list','horizontal'])assert.equal(holdingCardLayout(mode),'full');
assert.equal(holdingPreviewLayout('grid3'),holdingCardLayout('grid3'));

// Measured pager width and snap size must stay equal; odd rows never repeat.
assert.equal(holdingPageWidth(301.6,390),302);
assert.equal(holdingPageWidth(0,390),294);
assert.equal(holdingPageWidth(Number.NaN,280),220);
for(const rowCount of [0,1,2,3,7,21]){
  const rows=Array.from({length:rowCount},(_,i)=>'ETF-'+i);
  const pages=holdingPages(rows,2);
  assert.deepEqual(pages.flat(),rows);
  assert.ok(pages.every(page=>page.length>=1&&page.length<=2));
}
// Smoke guards for the actual React Native wiring; simulator/device remains separate.
const collection=readFileSync('src/components/HoldingQuoteCollection.tsx','utf8');
const home=readFileSync('src/screens/HomeScreen.tsx','utf8');
const portfolio=readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const inspect=readFileSync('src/maintenance/InspectableTarget.tsx','utf8');
const detail=readFileSync('App.tsx','utf8');
assert.match(collection,/snapToInterval=\{pageWidth\}/);
assert.match(collection,/pagedContent:\{gap:0\}/);
assert.match(collection,/holdingPageWidth\(viewportWidth,width\)/);
assert.match(collection,/holdingPages\(rows,2\)/);
assert.match(home,/safeHoldingStyle\(holdingLayoutMode,rawQuoteStyle\)/);
assert.match(portfolio,/safeHoldingStyle\(holdingLayoutMode,rawQuoteStyle\)/);
assert.match(inspect,/engineer\.session!==null/,'no transparent hitbox before the workbench is active');
assert.match(detail,/HoldingDetailBoundary/,'holdings detail needs a recoverable rendering error boundary');
console.log('V3.1.2 quote layouts, pager data integrity and detail recovery: PASS; Android tap still requires device verification');
