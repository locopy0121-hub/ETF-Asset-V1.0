import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
const [major=0,minor=0,patch=0]=String(pkg.version).split('.').map(Number);
assert.ok(major>3||(major===3&&(minor>2||(minor===2&&patch>=43))),'settings information architecture requires V3.2.43 or any later version');
const expectedCode=major*10000+minor*100+patch;
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,expectedCode);

const frames=read('src/domain/frameRegistry.ts');
const settingsBlock=frames.slice(frames.indexOf("settings: ["),frames.indexOf("  ],",frames.indexOf("settings: ["))+4);
const expected=[
  ["system","系統設定"],
  ["accounting","帳務設定"],
  ["data","行情與資料中心"],
  ["backup","備份與資料安全"],
  ["monitor","Widget／即時監控器"],
  ["display","介面與主題"],
  ["notifications","通知與提醒"],
  ["ai","AI 與智慧功能"],
  ["app","App 管理"],
  ["legal","法律、資訊與關於"],
] as const;
for(const [key,title] of expected){
  assert.ok(settingsBlock.includes("key:'"+key+"'"),'top-level settings key missing: '+key);
  assert.ok(settingsBlock.includes("title:'"+title+"'"),'top-level settings title missing: '+title);
}
assert.equal((settingsBlock.match(/\{ key:/g)??[]).length,10,'settings center must contain exactly ten top-level categories');
assert.ok(!settingsBlock.includes("key:'page-header'"),'page header must not remain a standalone top-level category');

const screen=read('src/screens/SettingsScreen.tsx');
assert.ok(screen.includes("if(key==='notifications')return notificationSection();"),'notification category must have a dedicated panel');
assert.ok(!screen.includes("systemPanel==='market'"),'market data center must not be duplicated under system settings');
assert.ok(!screen.includes("systemPanel==='notifications'"),'notifications must not be duplicated under system settings');
assert.ok(!screen.includes("appPanel==='debug'"),'runtime diagnostics must not be duplicated under App management');
assert.ok(screen.includes("displayPanel==='titles'"),'page titles/header text must live under interface/theme');
assert.ok(screen.includes("displayPanel==='dividendCalendar'"),'dividend calendar display must live under interface/theme');
assert.ok(screen.includes("displayPanel==='swipe'"),'page swipe settings must live under interface/theme');
assert.ok(screen.includes('SaiETF Market Core｜唯一行情中心'),'SaiETF native Market Core must be the canonical single entry');
assert.ok(screen.includes('V4.0.1 行情網路入口只由 MarketDataCenter 管理'),'settings must declare one MarketDataCenter network entry');
assert.ok(screen.includes('ETF 分類與配息標籤'),'ETF data labels must not imply notification ownership');

const notificationStart=screen.indexOf('function NotificationPanel(){');
const notificationEnd=screen.indexOf('function ThemePanel(){',notificationStart);
const notificationBlock=screen.slice(notificationStart,notificationEnd);
assert.ok(notificationBlock.includes('除息提醒'));
assert.ok(notificationBlock.includes('配息提醒'));
assert.ok(notificationBlock.includes('行情異常提醒'));
assert.ok(notificationBlock.includes('更新失敗提醒'));
assert.ok(notificationBlock.includes('備份提醒'));
assert.ok(!notificationBlock.includes('顯示最後購買日'),'calendar display controls must not be mixed into notifications');
assert.ok(!notificationBlock.includes('顯示股權登記日'),'calendar display controls must not be mixed into notifications');

const displayStart=screen.indexOf('function displaySection(){');
const displayEnd=screen.indexOf('function aiSection(){',displayStart);
const displayBlock=screen.slice(displayStart,displayEnd);
for(const label of ['各頁標題／頂部表頭文字','股息月曆顯示','頁面左右滑動','主題、背景與 App Icon'])
  assert.ok(displayBlock.includes(label),'interface/theme entry missing: '+label);

const appStart=screen.indexOf('function appSection(){');
const appEnd=screen.indexOf('function legalSection(){',appStart);
const appBlock=screen.slice(appStart,appEnd);
for(const label of ['還原預設設定','版本資訊','更新資訊'])assert.ok(appBlock.includes(label),'App management entry missing: '+label);
for(const label of ['各頁標題設定','主頁左右滑動','開發／診斷資訊'])assert.ok(!appBlock.includes(label),'misplaced App management entry remains: '+label);

assert.ok(screen.includes("VERSION='"+pkg.version+"'"));
assert.ok(screen.includes("BUILD='"+expectedCode+"'"));
console.log('V3.2.43 settings information architecture / deduplication PASS');
