import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layoutToolProfile,layoutKindLabel} from '../src/editor/layoutToolModel';

const read=(path:string)=>readFileSync(path,'utf8');
const home=layoutToolProfile('home','holding-quotes');
assert.equal(home.label,'持股行情牆');
assert.ok(home.kinds.includes('frame')&&home.kinds.includes('card')&&home.kinds.includes('text')&&home.kinds.includes('value')&&home.kinds.includes('chart')&&home.kinds.includes('data'));
assert.deepEqual(layoutToolProfile('ledger','ledger-list').kinds.includes('table'),true);
assert.deepEqual(layoutToolProfile('dividend','dividend-calendar').kinds.includes('calendar'),true);
assert.equal(layoutKindLabel('frame'),'框架');

const wb=read('src/components/PageLayoutToolWorkbench.tsx');
assert.match(wb,/預覽直接使用 App 真實元件與目前資料/);
assert.match(wb,/寬度、高度、最小高度、最大寬度/);
assert.match(wb,/layoutEditMode/);
assert.match(wb,/selection\.kind==='frame'/);
assert.match(wb,/selection\.kind==='card'/);
assert.match(wb,/selection\.kind==='text'\|\|selection\.kind==='value'/);

const quote=read('src/components/HoldingQuoteModule.tsx');
assert.match(quote,/layoutSelectionId/);
assert.match(quote,/borderStyle:'dashed'/);
assert.match(quote,/onLayoutSelect\?\.\('card','行情卡片'\)/);
assert.match(quote,/field:'\+field\.field/);

const modal=read('src/components/PageFrameSettingsModal.tsx');
assert.match(modal,/頁面設定 · 排版工具／統一能力模型/);
assert.match(modal,/PageLayoutToolWorkbench/);
assert.doesNotMatch(modal,/駐點維護工程師｜本頁常駐/);

const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.match(pkg.version,/^3\.2\.[1-9]\d*$/);
assert.equal(app.expo.version,pkg.version);
assert.ok(Number.isInteger(app.expo.android.versionCode)&&app.expo.android.versionCode>0);
assert.equal(String(app.expo.ios.buildNumber),String(app.expo.android.versionCode));
assert.ok(read('src/settings/BackupService.ts').includes("APP_VERSION='"+pkg.version+"'"));
console.log('V3.2.1+ layout tool foundation: real preview selection, dashed scope, contextual frame/card/text/value tools PASS');
