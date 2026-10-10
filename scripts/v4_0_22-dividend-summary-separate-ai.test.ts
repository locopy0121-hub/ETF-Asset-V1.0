import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGE_FRAMES} from '../src/domain/frameRegistry';
import {mergeEditorState,normalizeEditorConfig} from '../src/editor/editorModel';
import {readableDividendSummaryMetric,dividendSummaryMetricMinHeight,
  DIVIDEND_SUMMARY_METRIC_MIN_WIDTH,DIVIDEND_SUMMARY_METRIC_MIN_HEIGHT} from '../src/dividend/dividendSummaryVisual';

const read=(file:string)=>readFileSync(file,'utf8');
const dividend=read('src/screens/DividendScreen.tsx');
const editor=read('src/components/PageLayoutToolWorkbench.tsx');
const stack=read('src/components/PageEditorStack.tsx');
const preview=read('src/components/DividendPreviewSelector.tsx');
const registry=PAGE_FRAMES.dividend.map(item=>item.key);
assert.deepEqual(registry.slice(0,4),['page-header','dividend-summary','dividend-ai','dividend-calendar']);
assert.equal(registry.filter(key=>key==='dividend-ai').length,1);
const config=normalizeEditorConfig('dividend',{});
assert.ok(config['dividend-summary']);
assert.ok(config['dividend-ai']);
assert.notEqual(config['dividend-summary']?.order,config['dividend-ai']?.order);
assert.notEqual(config['dividend-ai']?.order,config['dividend-calendar']?.order);
const legacy=mergeEditorState({dividend:{'dividend-summary':{...config['dividend-summary'],visible:false,order:1}}});
assert.equal(legacy.dividend['dividend-summary']?.visible,false,'saved summary frame visibility persists');
assert.ok(legacy.dividend['dividend-ai'],'older saves gain the independent frame');
assert.equal(legacy.dividend['dividend-ai']?.visible,true,'AI appearance remains independently available in editor');

assert.match(dividend,/key:'dividend-summary',element:/);
assert.match(dividend,/key:'dividend-ai',element:/);
const summary=dividend.slice(dividend.indexOf("{key:'dividend-summary',element:"),dividend.indexOf("{key:'dividend-ai',element:"));
assert.equal((summary.match(/<MetricTile /g)||[]).length,3);
assert.doesNotMatch(summary,/AiQuestionBox|askDividend|runAiAction/,'summary frame must not embed AI');
assert.equal((summary.match(/style={styles.summaryMetricCell}/g)||[]).length,3);
assert.match(dividend,/key:'dividend-ai',element:[\s\S]*<FrameCard title="股息 AI 問答" showTitle={false}>/);
assert.match(dividend,/onAsk={askDividend} onAction={runAiAction}/,'existing AI business actions remain unchanged');
assert.match(dividend,/aiSettings.prefs.ai.enabled\?\[/,'disabled AI should not show an empty card in production');
assert.match(dividend,/summaryMetricCell:\{flexGrow:1,flexBasis:'46%',minWidth:0,minHeight:0/);
assert.match(dividend,/<EqualGrid pageKey="dividend" frameKey="dividend-summary">/);
assert.match(editor,/actualDividendPreviewKeys=new Set\(\['dividend-summary','dividend-ai'/);
assert.match(editor,/showTitle={!?\(pageKey==='dividend'&&item.key==='dividend-ai'\)}/);
assert.doesNotMatch(editor,/minCardWidth={dividendSummaryCard/,'user sizes must not be clamped by card tools');
assert.doesNotMatch(editor,/minCardHeight={dividendSummaryCard/,'user heights must not be clamped by card tools');
assert.match(stack,/readableDividendSummaryMetric\(customizedStyle\)/);
assert.match(preview,/readableDividendSummaryMetric\(overrides\[id\]\?\?p.editorStyle\)/);

const ancient={width:68,height:24,fontSize:17,labelFontSize:11,captionFontSize:10};
const safe=readableDividendSummaryMetric(ancient);
assert.equal(safe.width,68,'previous saved width must remain selectable');
assert.equal(safe.height,24,'previous saved height must remain selectable');
assert.deepEqual(ancient,{width:68,height:24,fontSize:17,labelFontSize:11,captionFontSize:10},
  'old persisted data must never be mutated');
const huge=readableDividendSummaryMetric({...ancient,fontSize:38,labelFontSize:25,captionFontSize:24,padding:22});
assert.equal(huge.height,24,'typography cannot silently enlarge a user-set card height');
assert.equal(readableDividendSummaryMetric({backgroundColor:'#00AABB'}).width,undefined,
  'natural responsive width must not become a forced width');

const settings=read('src/screens/SettingsScreen.tsx');
assert.doesNotMatch(settings,/dividendSummaryMetric|dividend-ai|PageLayoutToolWorkbench/);
console.log('V4.0.22 dividend 3-card readability + AI independent frame / migration + preview parity: PASS');
