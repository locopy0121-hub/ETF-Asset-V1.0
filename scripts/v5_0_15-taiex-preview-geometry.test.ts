import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TAIEX_AXIS_DEFAULT,taiexAxisWidth,taiexPlotLeftInset,taiexTimeAxisLeft,TAIEX_INDEX_EDITOR_ITEMS} from '../src/editor/taiexIndexChartLayout';

assert.equal(TAIEX_AXIS_DEFAULT,93);
assert.equal(taiexAxisWidth(undefined),93);
assert.equal(taiexAxisWidth(65),65);
assert.equal(taiexAxisWidth(-30),56);
assert.equal(taiexAxisWidth(400),150);
assert.equal(taiexAxisWidth(NaN),93);
assert.equal(taiexPlotLeftInset(undefined),0);
assert.equal(taiexPlotLeftInset(12),12);
assert.equal(taiexPlotLeftInset(90),40);
assert.equal(taiexTimeAxisLeft(93,0),95);
assert.equal(taiexTimeAxisLeft(65,12),79);
const ids=TAIEX_INDEX_EDITOR_ITEMS.map(x=>x.id);
assert.equal(ids.length,new Set(ids).size,'duplicate saved editor IDs');
assert.ok(ids.length>=40,'TAIEX content editor must show actual internal targets');
for(const id of ['market:index:axis:left','market:index:plot:left-inset',
  'market:index:chart','market:index:time-axis','market:index:gates:upper2:left',
  'market:index:gates:lower2:left','market:index:range:d1:button',
  'market:index:range:y1:button','market:index:three-gates:button',
  'market:index:note:gates','market:index:gates:reference']){
  assert.ok(ids.includes(id),'target missing: '+id);
}
const card=readFileSync('src/components/TaiexIndexCard.tsx','utf8');
const editor=readFileSync('src/components/PageLayoutToolWorkbench.tsx','utf8');
const market=readFileSync('src/screens/MarketResearchScreen.tsx','utf8');
assert.ok(card.includes('runtime.active?runtime.targets:editor.displayConfig.layoutTargets'),
  'preview/live must share persisted overrides');
assert.ok(card.includes("taiexAxisWidth(targetOverrides?.['market:index:axis:left']?.width)"));
assert.ok(card.includes("taiexPlotLeftInset(targetOverrides?.['market:index:plot:left-inset']?.width)"));
assert.ok(card.includes('width:axisWidth,height:chartHeight'));
assert.ok(card.includes('paddingLeft:plotInset'));
assert.ok(card.includes('taiexTimeAxisLeft(axisWidth,plotInset)'));
assert.ok(card.includes('top:position-height/2'),'gate number must sit on its y-coordinate');
assert.ok(!card.includes('width:93,height:300'),'no fixed left-axis width');
assert.ok(!card.includes('marginLeft:95'),'no independently fixed X axis');
assert.ok(editor.includes("pageKey==='market'&&frame.key==='market-index'?TAIEX_INDEX_EDITOR_ITEMS"));
assert.ok(editor.includes("onChange={width=>patchTarget('market:index:axis:left',{width})}"));
assert.ok(editor.includes("onChange={width=>patchTarget('market:index:plot:left-inset',{width})}"));
assert.ok(editor.includes("const actualPageWidth=Math.max(1,Math.round(windowWidth-spacing.lg*2))"),
  'preview uses the actual app content width for re-layout');
assert.ok(editor.includes('transform:[{scale:previewScale}]'),
  'only finished preview layout is visually scaled');
assert.ok(editor.includes("{actual.props.children}"),
  'preview renders real MarketResearchScreen JSX');
assert.ok(market.includes('<TaiexIndexCard marketVersion={market.marketDataVersion} phase={market.phase}/>'));
assert.ok(!readFileSync('src/finance/FinanceRuntime.tsx','utf8').includes('market:index:axis:left'));
const pkg=JSON.parse(readFileSync('package.json','utf8')),app=JSON.parse(readFileSync('app.json','utf8')).expo;
assert.match(pkg.version,/^5\.0\.\d+$/);
assert.ok(Number(pkg.version.split('.')[2])>=15);
assert.equal(app.version,pkg.version);
assert.equal(app.android.versionCode,50000+Number(pkg.version.split('.')[2]));
assert.equal(app.ios.buildNumber,String(app.android.versionCode));
console.log('V5.0.15 TAIEX shared geometry, genuine content-target catalog, market preview parity PASS');
