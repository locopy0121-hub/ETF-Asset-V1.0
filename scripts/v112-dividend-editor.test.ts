import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePageDisplayConfig} from '../src/editor/editorModel';

const display=normalizePageDisplayConfig('dividend',{
  dividendAiVisible:false,
  dividendCalendarCellHeight:72,
  dividendCalendarDayFontSize:16,
  dividendCalendarDotSize:9,
  dividendCalendarWeekdayVisible:false,
  dividendCalendarEventDotsVisible:false,
  dividendCalendarLegendVisible:false,
  dividendListRowPadding:18,
  dividendTrendHeight:180,
  dividendTrendBarWidthPct:90,
});
assert.equal(display.dividendAiVisible,false);
assert.equal(display.dividendCalendarCellHeight,72);
assert.equal(display.dividendCalendarDayFontSize,16);
assert.equal(display.dividendCalendarDotSize,9);
assert.equal(display.dividendCalendarWeekdayVisible,false);
assert.equal(display.dividendCalendarEventDotsVisible,false);
assert.equal(display.dividendCalendarLegendVisible,false);
assert.equal(display.dividendListRowPadding,18);
assert.equal(display.dividendTrendHeight,180);
assert.equal(display.dividendTrendBarWidthPct,90);

const screen=readFileSync('src/screens/DividendScreen.tsx','utf8');
const modal=readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
assert.match(screen,/calendarCellHeight/);
assert.match(screen,/calendarDayFontSize/);
assert.match(screen,/calendarDotSize/);
assert.match(screen,/calendarWeekdayVisible/);
assert.match(screen,/calendarEventDotsVisible/);
assert.match(screen,/calendarLegendVisible/);
assert.match(screen,/dividendListRowPadding/);
assert.match(screen,/dividendTrendHeight/);
assert.match(screen,/dividendTrendBarWidthPct/);
assert.match(modal,/DividendToolsEditor/);
assert.match(modal,/日期格高度/);
assert.match(modal,/事件標記大小/);
assert.match(modal,/年度趨勢/);

console.log('v1.1.2 dividend editor completeness PASS');
