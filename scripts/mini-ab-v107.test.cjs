const fs=require('fs');
const assert=require('assert');

const domain=fs.readFileSync('src/monitor/monitorDomain.ts','utf8');
const runtime=fs.readFileSync('src/monitor/MonitorSettingsRuntime.tsx','utf8');
const panel=fs.readFileSync('src/components/monitor/MonitorControlPanel.tsx','utf8');
const native=fs.readFileSync('native/android/TfAssetOverlayService.kt','utf8');
const snapshot=fs.readFileSync('src/domain/snapshot.ts','utf8');
const adapter=fs.readFileSync('src/finance/sharedSnapshotAdapter.ts','utf8');

for(const token of ['MiniHeaderStyle','MiniColumnConfig','miniHeader','miniColumns','updateMiniHeader','updateMiniColumn','moveMiniColumn']){
  assert.ok(domain.includes(token),'missing Mini A-B contract: '+token);
}
for(const field of ['symbol','name','price','change','changePercent','shares','avgCost','marketValue','pnl','roi','comprehensivePnl','marketStatus','updatedAt']){
  assert.ok(domain.includes("'"+field+"'"),'Mini field pool missing '+field);
}
for(const token of ['DEFAULT_MINI_COLUMNS.map','map.get(defaultColumn.field)','field:defaultColumn.field','label:typeof column?.label','effect:normItemEffect(column?.effect)']){
  assert.ok(runtime.includes(token),'Mini persistence normalization missing '+token);
}
assert.match(panel,/Mini A 項目列（母）/,'Mini A editor missing');
assert.match(panel,/Mini B 欄位（子）/,'Mini B editor missing');
assert.match(panel,/第 \{index\+1\} 欄/,'Mini B position hint missing');
assert.match(panel,/previewRows\.map/,'Mini preview must render every row');
assert.ok(!/previewRows\.(slice|filter\([^)]*index|splice)/.test(panel),'Mini preview must not truncate holdings');
assert.match(native,/rows\.forEach\{holding->/,'Native Mini must render every holding row');
assert.ok(!/orderedHoldings\([^)]*\)\.(take|slice|subList)/.test(native),'Native Mini must not truncate holdings');
assert.match(native,/miniColumns/,'Native Mini must consume B columns');
assert.match(native,/miniHeader/,'Native Mini must consume A header');
assert.match(native,/renderMini/,'Native Mini list renderer missing');

for(const metric of ['shares','avgCost','marketValue','pnl','roi','comprehensivePnl']){
  assert.ok(snapshot.includes(metric),'Shared Snapshot missing '+metric);
  assert.ok(adapter.includes(metric+':row.'+metric),'Snapshot adapter must forward '+metric);
}

console.log('V1.0.7 MINI A-B LIST: PASS');
