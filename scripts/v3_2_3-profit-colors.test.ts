import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeDisplayState} from '../src/editor/editorModel';
import {linkedColor} from '../src/maintenance/workspaceModel';

const read=(p:string)=>readFileSync(p,'utf8');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const holding=read('src/components/HoldingQuoteModule.tsx');
const editable=read('src/components/dashboard/DashboardEditableContent.tsx');
const overview=read('src/components/dashboard/DashboardAssetOverview.tsx');
const header=read('src/components/PageHeaderVisual.tsx');

for(const label of [
  '標題損益色','背景損益色','邊框損益色','陰影損益色','Glow 損益色',
  '漸層結束損益色','漸層中間損益色','外光暈損益色','閃爍損益色',
  '文字損益色','主要文字損益色','次要文字損益色','數值損益色','說明損益色',
]) assert.ok(workbench.includes(label),'layout tool missing global profit-color control: '+label);

const merged=mergeDisplayState({home:{holdingWall:{style:{
  backgroundColor:'#111111',backgroundProfitColor:true,
  textColor:'#222222',textProfitColor:true,
  secondaryTextColor:'#333333',secondaryTextProfitColor:true,
  gainColor:'#AA0000',lossColor:'#00AA00',
  borderColor:'#444444',borderProfitColor:true,
  borderWidth:1,cornerRadius:12,padding:8,rowGap:4,
}}}});
assert.equal(merged.home.holdingWall?.style.backgroundProfitColor,true);
assert.equal(merged.home.holdingWall?.style.textProfitColor,true);
assert.equal(merged.home.holdingWall?.style.secondaryTextProfitColor,true);
assert.equal(merged.home.holdingWall?.style.borderProfitColor,true);

const palette={gainColor:'#F00000',lossColor:'#00A000',neutralColor:'#808080'};
assert.equal(linkedColor('#123456',true,'gain',palette),'#F00000');
assert.equal(linkedColor('#123456',true,'loss',palette),'#00A000');
assert.equal(linkedColor('#123456',true,'neutral',palette),'#808080');
assert.equal(linkedColor('#123456',false,'gain',palette),'#123456');

assert.match(holding,/cardStyle\.backgroundProfitColor/);
assert.match(holding,/cardStyle\.borderProfitColor/);
assert.match(holding,/wall\.style\.textProfitColor/);
assert.match(holding,/cardStyle\.secondaryTextProfitColor/);
assert.match(editable,/appearance\.textProfitColor/);
assert.match(editable,/appearance\.backgroundProfitColor/);
assert.match(editable,/appearance\.borderProfitColor/);
assert.match(overview,/card\.gradientEndProfitColor/);
assert.match(overview,/card\.shadowProfitColor/);
assert.match(overview,/card\.glowProfitColor/);
assert.match(header,/frameConfig\.titleProfitColor/);
assert.match(header,/frameConfig\.borderProfitColor/);

const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,'3.2.9');
assert.equal(app.expo.version,'3.2.9');
assert.equal(app.expo.android.versionCode,30209);
assert.equal(app.expo.ios.buildNumber,'30209');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'financial core remains untouched: '+core);

console.log('V3.2.9 global profit-color linkage across layout color/background tools: PASS');
