import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen=fs.readFileSync('src/screens/DividendScreen.tsx','utf8');
const calendar=fs.readFileSync('src/dividend/dividendCalendar.ts','utf8');

for(const token of [
  'calendarCount','arrowButton','monthCaption','todayNumberWrap','selectedNumberWrap',
  'moreEvents','eventDetailHeader','eventTypeBadge','noEventText'
]) assert.ok(screen.includes(token),'missing redesigned calendar token: '+token);

assert.match(screen,/dayEvents\.slice\(0,3\)/,'calendar must cap visible dots before +N');
assert.match(screen,/dayEvents\.length>3/,'calendar must expose multi-event overflow count');
assert.match(screen,/disabled=\{!valid\}/,'all valid days should remain selectable');
assert.match(screen,/selectedDate===today\?'今天':'日期事件'/,'today and selected-date semantics must remain distinct');
assert.match(screen,/setSelectedDate\(next===today\.slice\(0,7\)\?today:next\+'-01'\)/,'month navigation must keep selected date inside visible month');
assert.match(screen,/flexWrap:'wrap'.*gap:6.*justifyContent:'center'/s,'legend should wrap compactly instead of forcing one long row');

for(const label of ['最後購買日','除息日','股權登記日','股息配發日'])
  assert.ok(calendar.includes(label),'dividend calendar domain labels must remain intact: '+label);
assert.match(calendar,/Never infer this from ex-date minus a calendar day/,'last-buy date safety rule must remain intact');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(fs.existsSync(core),'immutable finance core missing: '+core);

console.log('V3.2.22 dividend calendar visual hierarchy + event density regression PASS');
