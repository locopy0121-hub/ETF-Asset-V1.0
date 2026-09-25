import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');
const inspector=read('src/maintenance/InspectableTarget.tsx');
const metric=read('src/components/MetricTile.tsx');
const home=read('src/screens/HomeScreen.tsx');
const portfolio=read('src/screens/PortfolioScreen.tsx');
const ledger=read('src/screens/LedgerScreen.tsx');
const ai=read('src/components/AiQuestionBox.tsx');
const frame=read('src/components/FrameCard.tsx');
// Both engineer ON and OFF must share a single minimum-width grid layout.
assert.ok(inspector.includes("const placement=flex?styles.metricPlacement:undefined"));
assert.ok(inspector.includes("<View style={placement}>{children(appearance,customized,override)}</View>"),'OFF must use the exact same card grid');
assert.ok(inspector.includes('return <View style={[placement,'),'ON must use the exact same card grid');
assert.ok(inspector.includes("flexBasis:'46%'")&&inspector.includes('minWidth:136')&&inspector.includes('flexShrink:0'));
assert.ok(!inspector.includes('flex:1,minWidth:0'),'old wrapper forced KPI tiles to shrink below their minimum');
assert.ok(inspector.includes('StyleSheet.absoluteFill,styles.selectionOutline'),'outline must not consume layout dimensions');
assert.ok(!inspector.includes("top:-13"),'negative mini-wrench offset caused adjacent-card overlap');
assert.ok(frame.includes('StyleSheet.absoluteFill')&&frame.includes('pointerEvents="none"'),'outer frame border must be an overlay, too');
assert.ok(!frame.includes("workActive&&{borderStyle:'dashed'"),'outer frame selection may not consume layout width');
assert.ok(inspector.includes("right:2,top:2")&&inspector.includes("minWidth:28"));
// Preserve number content; no ellipsis or mutated financial source values.
assert.ok(metric.includes('numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}'));
assert.ok(home.includes("dashboardSummary:{width:'100%'"));
assert.ok(home.includes('minimumFontScale={0.52}'));
for(const [name,screen] of [['home',home],['portfolio',portfolio],['ledger',ledger]] as const){
  assert.ok(screen.includes('<MetricTile'),name+' must still use the same fixed KPI component');
  assert.ok(screen.includes("flexWrap:'wrap'"),name+' must allow card wrapping');
}
assert.ok(inspector.includes('children(appearance,customized,override)'), 'existing live targets must remain editable');
for(const id of ['ai:prompt-title','ai:quick-action:','ai:conversation','ai:composer'])
  assert.ok(ai.includes(id),'V3.0.3 native AI target lost: '+id);
const pkg=JSON.parse(read('package.json'));assert.equal(pkg.version,'3.0.3','layout repair is a V3.0.3 QA revision, NOT a V3.0.4 feature');
console.log('V3.0.3 layout regression gate: stable ON/OFF metric grid, overlay-only selection, no finance rewrite and AI preservation PASS');
