import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
const [major,minor,patch]=String(pkg.version).split('.').map(Number);
assert.equal(major,3);assert.equal(minor,2);assert.ok(patch>=45);
const expectedCode=major*10000+minor*100+patch;
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,expectedCode);

const screen=read('src/screens/DividendScreen.tsx');
for(const token of [
  'accessibilityLabel="新增股息"',
  '<Text style={styles.modalTitle}>新增股息</Text>',
  '確認新增股息紀錄',
  'ETF 代號',
  'ETF 名稱',
  '股息配發／入帳日',
  '每股股息',
  '符合配息股數',
  '最後購買日',
  '除息日',
  '收益分配基準日',
  '正式帳務淨入帳',
  'CalendarDatePickerModal',
  "setDatePickerTarget('payment')",
  "setDatePickerTarget('lastBuy')",
  "setDatePickerTarget('ex')",
  "setDatePickerTarget('record')",
])assert.ok(screen.includes(token),'V3.2.45 dividend UI missing: '+token);

assert.ok(!screen.includes('<TextInput value={addPaymentDate}'),'payment date must not summon the keyboard');
assert.ok(!screen.includes('<TextInput value={addLastBuyDate}'),'last-buy date must use the calendar');
assert.ok(!screen.includes('<TextInput value={addExDate}'),'ex-date must use the calendar');
assert.ok(!screen.includes('<TextInput value={addRecordDate}'),'record date must use the calendar');
assert.ok(screen.includes("finance.addDividend({...addPreview"),'manual dividend must still write through FinanceRuntime.addDividend');
assert.ok(screen.includes("'收益分配基準日 '+addRecordDate.trim()"),'record date must be stored with official ETF terminology');
assert.ok(screen.includes("noteDate(row.note,['收益分配基準日','股權登記日'])"),'legacy record-date notes must remain readable');

const picker=read('src/components/CalendarDatePickerModal.tsx');
for(const token of ['選擇日期','上個月','下個月','今天','清除日期','onRequestClose'])
  assert.ok(picker.includes(token),'calendar date picker missing: '+token);
assert.ok(picker.includes("onChange(formatIsoDate(year,month,day))"),'calendar must emit canonical YYYY-MM-DD');

const calendar=read('src/dividend/dividendCalendar.ts');
assert.ok(calendar.includes("dateFromNote(entry.note,'收益分配基準日')||dateFromNote(entry.note,'股權登記日')"),'calendar must parse current and legacy record-date labels');
assert.ok(calendar.includes("if(type==='recordDate')return '收益分配基準日'"),'calendar label must use ETF official terminology');

const assistant=read('src/ai/dividendAssistant.ts');
for(const token of [
  'TWT48U_ALL',
  'exchangeReport/TWT48U?response=html',
  'ETFortune/dividendList',
  'holidaySchedule/holidaySchedule',
  'fetchTwseClosedDates',
  'previousTradingDay',
  '收益分配基準日',
  "amountKnown?'NT$ '+money(event.perShareAmount):'尚未公告'",
])assert.ok(assistant.includes(token),'official dividend pipeline missing: '+token);
assert.ok(!assistant.includes('fetchLastTradingDay('),'future last-buy date must not depend on incomplete current-month trade history');
assert.ok(assistant.includes("if(/開始交易|最後交易/.test(name+' '+description))continue;"),'official holiday schedule must preserve explicit trading days');

const settings=read('src/screens/SettingsScreen.tsx');
assert.ok(settings.includes("VERSION='"+pkg.version+"'"));
assert.ok(settings.includes("BUILD='"+expectedCode+"'"));
assert.ok(settings.includes('顯示收益分配基準日'));

console.log('V3.2.45 dividend calendar picker / TWSE official-date pipeline PASS');
