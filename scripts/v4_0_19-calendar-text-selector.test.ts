import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DIVIDEND_EDITOR_CATALOG,dividendCatalogTarget,dividendPreviewInteractionTarget,dividendTargetForKind} from '../src/editor/dividendEditorCatalog';
import {dividendTargetId,dividendTextVisual} from '../src/editor/dividendPageLayout';
import {mergeDisplayState} from '../src/editor/editorModel';

const dayId=dividendTargetId('native:DividendScreen:dayText:12');
const cellId=dividendTargetId('native:DividendScreen:day:11');

assert.deepEqual(dividendTargetForKind('dividend-calendar','text'),{
  id:dayId,label:'日期數字',kind:'text',
},'tapping the calendar 文字 option must select day numerals (not a dashboard target)');
assert.equal(dividendTargetForKind('dividend-calendar','card')?.id,cellId);
assert.equal(dividendTargetForKind('dividend-calendar','value')?.label,'本月事件計數');
assert.equal(dividendCatalogTarget(dayId)?.kind,'text',
  'tapping the real numeral must select text tools even though the underlying date is read-only');
assert.notEqual(dayId,cellId);
assert.equal(dividendPreviewInteractionTarget('native:DividendScreen:day:11','tap')?.id,dayId,
  'tap on a date should edit the number even when the outer date cell receives the gesture');
assert.equal(dividendPreviewInteractionTarget('native:DividendScreen:day:11','long-press')?.id,cellId,
  'long press must still allow date-cell border and background editing');

const display=mergeDisplayState({dividend:{layoutTargets:{
  [dayId]:{fontSize:23,fontWeight:'700',textColor:'#123456',letterSpacing:1,actualDividend:99999},
  [cellId]:{borderWidth:2,borderColor:'#654321'},
}}}).dividend;
const day=display.layoutTargets?.[dayId];
const cell=display.layoutTargets?.[cellId];
assert.equal(day?.fontSize,23);
assert.equal(day?.fontWeight,'700');
assert.equal(day?.textColor,'#123456');
assert.equal(day?.letterSpacing,1);
assert.equal((day as any)?.actualDividend,undefined,'business data must not be editable');
assert.equal(cell?.borderWidth,2);
assert.equal(cell?.borderColor,'#654321');
assert.equal(day?.borderColor,undefined,'cell and numeral styles must be isolated');

const visual=dividendTextVisual(day);
assert.equal(visual?.fontSize,23);
assert.equal(visual?.fontWeight,'700');
assert.equal(visual?.color,'rgba(18,52,86,1.000)', 'visual adapter uses the canonical alpha color format');

const workbench=readFileSync('src/components/PageLayoutToolWorkbench.tsx','utf8');
const selector=readFileSync('src/components/DividendPreviewSelector.tsx','utf8');
const screen=readFileSync('src/screens/DividendScreen.tsx','utf8');
assert.match(workbench,/pageKey==='dividend'&&\(kind==='card'\|\|kind==='text'\|\|kind==='value'\)/);
assert.match(workbench,/dividendTargetForKind\(frame\.key,kind\)/);
assert.match(workbench,/pageKey==='dividend'\s*\?<View>\{frameContent\}<\/View>/,
  'dividend frame must not intercept nested numeral presses');
assert.match(workbench,/id\.endsWith\(':dayText:12'\)[\s\S]*fontSize:12/,
  'date number text tools must use the live default font size');
assert.match(selector,/dividendCatalogTarget\(id\)/);
assert.match(screen,/editorId="native:DividendScreen:dayText:12" editorReadOnly=\{true\}/);
assert.ok(DIVIDEND_EDITOR_CATALOG['dividend-calendar']?.some(item=>item.id===dayId));
console.log('V4.0.19 calendar day numeral picker, style persistence and read-only ledger isolation: PASS');
