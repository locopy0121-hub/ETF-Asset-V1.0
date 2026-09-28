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
assert.match(wb,/預覽直接點選/);
assert.match(wb,/框架第一層就是寬度與高度/);
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
assert.equal(pkg.version,'3.2.1');
assert.equal(app.expo.version,'3.2.1');
assert.equal(app.expo.android.versionCode,30201);
assert.equal(app.expo.ios.buildNumber,'30201');
assert.match(read('src/settings/BackupService.ts'),/APP_VERSION='3\.2\.1'/);
console.log('V3.2.1 layout tool foundation: direct preview selection, dashed scope, contextual frame/card/text/value tools PASS');
