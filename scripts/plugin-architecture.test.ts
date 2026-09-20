import assert from 'node:assert/strict';
import fs from 'node:fs';

import { assertAdjacentRelationship, canControlAdjacentLayer } from '../src/domain/relationshipContracts';
import { DEFAULT_MONITOR_CONFIG, activeMonitorFields, createMonitorRuntimeState, restoreNormalMonitor, setMonitorMode, updateActiveMonitorLayout, updateMonitorFields } from '../src/monitor/monitorDomain';

for (const path of [
  'src/domain/snapshot.ts',
  'src/domain/relationshipContracts.ts',
  'src/widget/widgetDomain.ts',
  'src/monitor/monitorDomain.ts',
  'src/components/widget/WidgetControlPanel.tsx',
  'src/components/monitor/MonitorControlPanel.tsx',
]) assert.ok(fs.existsSync(path), `missing Phase 5 architecture file: ${path}`);

assert.equal(canControlAdjacentLayer('A', 'B'), true);
assert.equal(canControlAdjacentLayer('B', 'C'), true);
assert.equal(canControlAdjacentLayer('C', 'D'), true);
assert.equal(canControlAdjacentLayer('D', 'E'), true);
assert.equal(canControlAdjacentLayer('A', 'C'), false);
assert.equal(canControlAdjacentLayer('B', 'D'), false);
assert.equal(canControlAdjacentLayer('E', 'A'), false);
assert.throws(() => assertAdjacentRelationship('A', 'D'));

const normalChanged = updateActiveMonitorLayout(DEFAULT_MONITOR_CONFIG, { width: 360 });
assert.equal(normalChanged.normalLayout.width, 360);
assert.equal(normalChanged.miniLayout.width, DEFAULT_MONITOR_CONFIG.miniLayout.width);

const miniMode = setMonitorMode(normalChanged, 'mini');
const miniChanged = updateActiveMonitorLayout(miniMode, { width: 200 });
assert.equal(miniChanged.miniLayout.width, 200);
assert.equal(miniChanged.normalLayout.width, 360);
assert.deepEqual(activeMonitorFields(miniChanged), DEFAULT_MONITOR_CONFIG.miniFields);
const miniFields=updateMonitorFields(miniChanged,['symbol','price']);
assert.deepEqual(miniFields.miniFields,['symbol','price']);
assert.deepEqual(miniFields.fields,DEFAULT_MONITOR_CONFIG.fields);
assert.equal(restoreNormalMonitor(miniFields).mode,'normal');
const runtime=createMonitorRuntimeState(null,{marketState:'afterHours',refreshing:true},miniFields);
assert.equal(runtime.marketState,'afterHours');
assert.equal(runtime.breathing,true);

const widgetDomain = fs.readFileSync('src/widget/widgetDomain.ts', 'utf8');
const monitorDomain = fs.readFileSync('src/monitor/monitorDomain.ts', 'utf8');
assert.match(widgetDomain, /SharedSnapshot/, 'Widget must consume Shared Snapshot');
assert.match(monitorDomain, /SharedSnapshot/, 'Monitor must consume Shared Snapshot');
assert.ok(!widgetDomain.includes('monitorDomain'), 'Widget product domain must not import Monitor domain');
assert.ok(!monitorDomain.includes('widgetDomain'), 'Monitor product domain must not import Widget domain');

for (const source of [widgetDomain, monitorDomain]) {
  assert.ok(!source.includes('etfCalculators'), 'Plugin domains must not import finance calculators');
  assert.ok(!source.includes('calculatePortfolioSummary'), 'Plugin domains must not recreate finance calculations');
}

const settings = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');
assert.match(settings, /WidgetControlPanel/, 'Settings must expose isolated Widget control UI');
assert.match(settings, /MonitorControlPanel/, 'Settings must expose isolated Monitor control UI');

console.log('TF_ASSET_PLUGIN_ARCHITECTURE: PASS');
