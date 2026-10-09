const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const read=path=>readFileSync(path,'utf8');
const dividend=read('src/screens/DividendScreen.tsx');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const modal=read('src/components/PageFrameSettingsModal.tsx');
const selector=read('src/components/DividendPreviewSelector.tsx');
const catalog=read('src/editor/dividendEditorCatalog.ts');
const native=read('src/components/EditableNative.tsx');
const stack=read('src/components/PageEditorStack.tsx');
const settings=read('src/screens/SettingsScreen.tsx');

assert.match(dividend,/const dividendPreviewElements\s*=\s*\[/);
assert.match(dividend,/<PageEditorStack pageKey="dividend" frames=\{dividendPreviewElements\}/);
assert.match(dividend,/<PageFrameSettingsModal previewElements=\{dividendPreviewElements\}/);
assert.match(modal,/previewElements=\{previewElements\}/);
assert.match(workbench,/actualDividendPreviewKeys=new Set\(\['dividend-summary','dividend-ai','dividend-calendar','dividend-list','annual-trend'\]\)/);
assert.match(dividend,/\{key:'dividend-ai',element:/,'AI must be a separately registered visual frame');
assert.match(workbench,/selectDividendPreview\(actual\.props\.children/);
assert.match(workbench,/selectDividendPreview\(dividendAction/);
assert.match(workbench,/DIVIDEND_EDITOR_CATALOG\[frame\.key\]/);
assert.match(workbench,/selection\.id\.startsWith\('dividend:'\)/);
assert.match(workbench,/id\.startsWith\('dividend:metric:'\)/);
assert.match(workbench,/<FrameCard title=\{item\.title\} editorStyle=\{itemConfig\}[\s\S]*?onMeasuredSize=/);

for(const key of ['dividend-summary','dividend-calendar','dividend-list','annual-trend'])
  assert.match(catalog,new RegExp("'"+key+"':\\["));
const nativeItems=Array.from(catalog.matchAll(/node\('([^']+)'/g),match=>match[1]);
for(const item of nativeItems)assert.ok(dividend.includes('editorId="native:DividendScreen:'+item+'"'),
  'editor list points to a missing live native node: '+item);
for(const label of ['本月淨入帳','年度淨股息','月平均股息'])
  assert.ok(dividend.includes('label="'+label+'"'),'metric must come from real finance snapshot');
assert.match(dividend,/editorId="native:DividendScreen:holidayRemark:96"/);

assert.match(selector,/onPress:\(\)=>onSelect/);
assert.match(selector,/onLongPress:\(\)=>onSelect/);
assert.doesNotMatch(selector,/finance\.addDividend|finance\.applyDividendPlan|writeLedger/);
assert.match(native,/frame\?\.page==='dividend'/);
assert.match(native,/dividendTextVisual\(dividendOverride\)/);
assert.match(native,/dividendControlVisual\(dividendOverride\)/);
assert.match(stack,/dividendTargetId\('metric:'\+props\.label\)/);
assert.doesNotMatch(settings,/PageEditorStack|PageLayoutToolWorkbench|EditableNative/);
console.log('V4.0.19 dividend real preview, '+nativeItems.length+' native item identifiers, business-action isolation, protected settings: PASS');
