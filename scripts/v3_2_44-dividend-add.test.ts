import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
const [major=0,minor=0,patch=0]=String(pkg.version).split('.').map(Number);
assert.ok(major>3||(major===3&&(minor>2||(minor===2&&patch>=44))),'V3.2.44 dividend regression must survive later versions');
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,major*10000+minor*100+patch);

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
  '股權登記日',
  '正式帳務淨入帳',
])assert.ok(screen.includes(token),'dividend add UI missing: '+token);

assert.ok(screen.includes('finance.addDividend({...addPreview'),'manual dividend must write through FinanceRuntime.addDividend');
assert.ok(screen.includes("setMonth(addPaymentDate.slice(0,7))"),'new dividend must focus its month');
assert.ok(screen.includes('setSelectedDate(addPaymentDate)'), 'new dividend must focus its calendar date');
assert.ok(screen.includes("row.symbol===addPreview.symbol"),'duplicate dividend protection missing');
assert.ok(screen.includes("row.date===addPreview.date"),'duplicate payment-date protection missing');
assert.ok(screen.includes("if(addPaymentDate>today)"),'future dividend must not be posted early into cash ledger');
assert.ok(screen.includes("'手動股息建檔'"),'manual source marker missing');
assert.ok(screen.includes("'最後購買日 '+addLastBuyDate.trim()"),'last-buy date calendar mapping missing');
assert.ok(screen.includes("'除息日 '+addExDate.trim()"),'ex-date calendar mapping missing');
assert.ok(screen.includes("'股權登記日 '+addRecordDate.trim()"),'record date calendar mapping missing');
assert.ok(screen.includes("'配發日 '+addPaymentDate"),'payment date calendar mapping missing');
assert.ok(screen.includes("finance.holdings.find(row=>row.symbol===symbol)"),'holding auto-fill missing');
assert.ok(screen.includes("setAddShares(String(holding.shares))"),'eligible-share auto-fill missing');

const finance=read('src/finance/FinanceRuntime.tsx');
assert.ok(finance.includes('addDividend:entry=>setEntries(current=>[...current,entry])'),'canonical dividend write path changed unexpectedly');

const calendar=read('src/dividend/dividendCalendar.ts');
for(const label of ['最後購買日','除息日','股權登記日','配發日'])
  assert.ok(calendar.includes(label),'calendar parser contract missing: '+label);

const settings=read('src/screens/SettingsScreen.tsx');
assert.ok(settings.includes("VERSION='3.2.44'"));
assert.ok(settings.includes("BUILD='30244'"));

console.log('V3.2.44 Dividend page manual add / ledger-calendar synchronization PASS');
