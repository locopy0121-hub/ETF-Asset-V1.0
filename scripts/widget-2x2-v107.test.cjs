const fs=require('fs');
const assert=require('assert');

const domain=fs.readFileSync('src/widget/widgetDomain.ts','utf8');
const runtime=fs.readFileSync('src/widget/WidgetSettingsRuntime.tsx','utf8');
const panel=fs.readFileSync('src/components/widget/WidgetControlPanel.tsx','utf8');
const native=fs.readFileSync('native/android/TfAssetWidgetProvider.kt','utf8');
const layout=fs.readFileSync('native/android/res/layout/tf_asset_widget.xml','utf8');
const info=fs.readFileSync('native/android/res/xml/tf_asset_widget_info.xml','utf8');

assert.match(domain,/WidgetSize = '2x2'/,'Widget 2x2 size contract missing');
for(const field of ['appName','totalAssets','marketValue','cash','unrealizedPnl','realizedPnl','dividendIncome','totalReturn','symbol','name','price','change','changePercent','shares','avgCost','holdingMarketValue','pnl','roi','comprehensivePnl','marketStatus','updatedAt']){
  assert.ok(domain.includes("'"+field+"'"),'Widget field pool missing '+field);
  assert.ok(runtime.includes("'"+field+"'"),'Widget persistence missing '+field);
  assert.ok(panel.includes(field),'Widget picker missing '+field);
}
assert.match(panel,/2×2 所有項目皆可選/,'2x2 all-item hint missing');
assert.match(panel,/widgetTemplateCapacity\(value\.template\)/,'Widget preview capacity must follow display mode');
assert.match(native,/val capacity=when\(template\)/,'Native widget must derive capacity from display mode');
assert.match(panel,/value\.fields\.slice\(0,widgetTemplateCapacity\(value\.template\)\)/,'Widget preview must preserve selected order within mode capacity');
assert.match(native,/selectedFields=.*take\(capacity\)/,'Native widget must honor selected item order within mode capacity');
for(const id of ['widget_line1','widget_line2','widget_line3','widget_line4','widget_line5','widget_line6']) assert.ok(layout.includes(id),'2x2 layout missing '+id);
assert.match(info,/android:minWidth="110dp"/,'2x2 minWidth missing');
assert.match(info,/android:minHeight="110dp"/,'2x2 minHeight missing');
assert.ok(!native.includes('widget_total'),'legacy fixed total row must be removed');
assert.ok(!native.includes('widget_quote'),'legacy fixed quote row must be removed');

console.log('V1.0.7 WIDGET 2x2 ITEM POOL: PASS');
