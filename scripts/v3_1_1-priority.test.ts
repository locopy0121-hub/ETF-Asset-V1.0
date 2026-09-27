import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {TOOLBOX_MAIN_CATEGORIES,AB_PROPERTY_GROUPS,AB_PROPERTY_TOOL_IDS,AB_PROPERTY_BASE_COUNT} from '../src/maintenance/abPropertyModel';
import {CHART_DATA_OPTIONS,CHART_LIBRARY,NATIVE_CHART_STYLES} from '../src/domain/chartEditor';

assert.deepEqual(TOOLBOX_MAIN_CATEGORIES.map(x=>x.label),['版面設置','外觀設置','插入','系統設置']);
assert.equal(new Set(TOOLBOX_MAIN_CATEGORIES.map(x=>x.id)).size,4);
assert.ok(AB_PROPERTY_GROUPS.some(x=>x.id==='size'&&x.mainCategory==='appearance'));
assert.ok(AB_PROPERTY_GROUPS.some(x=>x.id==='charts'&&x.mainCategory==='insert'));
assert.equal(AB_PROPERTY_BASE_COUNT,184);
assert.equal(new Set(AB_PROPERTY_TOOL_IDS).size,184);
assert.ok(CHART_LIBRARY.length>=36);
assert.ok(NATIVE_CHART_STYLES.some(x=>x.id==='candlestick'));
assert.ok(NATIVE_CHART_STYLES.some(x=>x.id==='ohlc'));
for(const key of ['open','high','low','close','volume'])assert.ok(CHART_DATA_OPTIONS.some(x=>x.key===key));
const detail=readFileSync('src/screens/HoldingDetailScreen.tsx','utf8');
assert.ok(detail.includes('資料數據（可複選）'));
assert.ok(detail.includes('Number.isFinite(holding.quoteSourceAt)'));
assert.ok(detail.includes('chartStyle={chartStyle}')&&detail.includes('dataKeys={chartData}'));
const wb=readFileSync('src/maintenance/MaintenanceWorkbench.tsx','utf8');
assert.ok(wb.includes('TOOLBOX_MAIN_CATEGORIES.map'));
assert.ok(wb.includes('<AbDimensionControl axis="width"')&&wb.includes('<AbDimensionControl axis="height"'));
const chart=readFileSync('src/components/OfficialCandleChart.tsx','utf8');
assert.ok(chart.includes("chartStyle='candlestick'")&&chart.includes("dataKeys=['open','high','low','close','volume']"));
for(const path of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])assert.ok(readFileSync(path,'utf8').length>0);
const releaseVersion=JSON.parse(readFileSync('package.json','utf8')).version as string;
mkdirSync('reports',{recursive:true});
writeFileSync(`reports/V${releaseVersion}-full-skill-matrix.json`,JSON.stringify({
 version:releaseVersion,generatedAt:new Date().toISOString(),
 toolbox:TOOLBOX_MAIN_CATEGORIES.map(main=>({id:main.id,label:main.label,
  groups:AB_PROPERTY_GROUPS.filter(group=>group.mainCategory===main.id).map(group=>({id:group.id,label:group.label,tools:group.tools.length}))})),
 centralToolCount:AB_PROPERTY_BASE_COUNT,indexedUniqueTools:new Set(AB_PROPERTY_TOOL_IDS).size,
 chartLibrary:{total:CHART_LIBRARY.length,native:CHART_LIBRARY.filter(x=>x.status==='native').length,pendingAdapter:CHART_LIBRARY.filter(x=>x.status==='pending-adapter').length},
},null,2)+'\n');
console.log(`V${releaseVersion} priority maintenance toolbox + chart data + holding detail safety: PASS`);
