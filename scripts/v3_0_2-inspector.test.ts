import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeTargetMap,normalizeTargetOverride,mergeTargetAppearance,targetToolSupported,TARGET_APPEARANCE} from '../src/maintenance/inspectionModel';
import {ENGINEER_SKILLS} from '../src/maintenance/skillTree';
import {CENTRAL_COMPONENT_LIBRARY} from '../src/maintenance/componentLibrary';

const style=normalizeTargetOverride({
  fontSize:400,labelFontSize:16,captionFontSize:0,textColor:'#aabbcc',backgroundColor:'red',
  opacity:3,visible:false,labelText:'獨立外觀',evil:'not-allowed',
});
assert.deepEqual(style,{fontSize:48,labelFontSize:16,captionFontSize:8,textColor:'#AABBCC',
  opacity:1,visible:false,labelText:'獨立外觀'});
assert.equal(mergeTargetAppearance(TARGET_APPEARANCE,style).fontSize,48);
const restored=normalizeTargetMap({'home:pnl-detail':{'metric:純價差未實現':style,'metric:invalid-id!':{fontSize:-3}}});
assert.equal(restored['home:pnl-detail']?.['metric:純價差未實現']?.visible,false);
assert.equal(restored['home:pnl-detail']?.['metric:invalid-id!']?.fontSize,8);
assert.deepEqual(normalizeTargetMap({'../../ledger':{'hack':style}}),{});
assert.equal(targetToolSupported('metric','target:captionText'),true);
assert.equal(targetToolSupported('quote-card','target:captionText'),false);
assert.equal(targetToolSupported('quote-card','page:wall'),false,'shared page tools cannot implicitly modify whole page from a single card');
assert.equal(targetToolSupported('wall','page:wall'),true);
assert.equal(targetToolSupported('portfolio-list','page:list'),true);
assert.equal(targetToolSupported('control','target:fontSize'),false);
assert.equal(ENGINEER_SKILLS.length,16,'full skill tree remains unified');
for(const field of ['target:fontSize','target:padding','target:visible','page:wall','page:badges','page:list','page:quoteStyle','page:holdingLayoutMode'])
  assert.ok(ENGINEER_SKILLS.some(skill=>skill.tools.some(tool=>tool.field===field&&tool.status==='ready')),field);
assert.ok(CENTRAL_COMPONENT_LIBRARY.length>=12,'central catalog retained');

const read=(p:string)=>readFileSync(p,'utf8');
const stack=read('src/components/PageEditorStack.tsx');
const scope=read('src/maintenance/MaintenanceRuntime.tsx');
const inspector=read('src/maintenance/InspectableTarget.tsx');
const dock=read('src/maintenance/MaintenanceWorkbench.tsx');
const quotes=read('src/components/HoldingQuoteCollection.tsx');
const metric=read('src/components/MetricTile.tsx');
const home=read('src/screens/HomeScreen.tsx');
const portfolio=read('src/screens/PortfolioScreen.tsx');
assert.ok(stack.includes('decorateContent(item.element.props.children,frame)'),'works even after engineer OFF so saved styling persists');
assert.ok(stack.includes('child.type===MetricTile')&&stack.includes('child.type===Text'));
assert.ok(inspector.includes("onPress={()=>engineer.selectTarget(target)}")&&inspector.includes("onPress={()=>engineer.enterTarget(target,frame.frameConfig,frame.displayConfig)}"));
assert.ok(quotes.includes("id:'quote:'+item.symbol")&&quotes.includes("kind:'wall'"));
assert.ok(metric.includes('editorStyle?.useProfitColor===false'),'profit-color state remains an explicit visual toggle');
assert.ok(scope.includes('getTargetOverride:')&&scope.includes('draftTargets:')&&scope.includes('patchDisplay:'));
assert.ok(scope.includes('schema:2,instances:nextSaved,targets:nextTargets'),'instance and appearance persisted together');
assert.ok(scope.includes("previous??{")&&scope.includes("scope:'target'"));
assert.ok(scope.includes('cancel:()=>{setSession(null);setSelection(null);}'),'discard all pending work');
assert.ok(dock.includes('<HoldingMarketWallEditor')&&dock.includes('<EtfBadgeEditor')&&dock.includes('<PortfolioListEditor'));
assert.ok(dock.includes('useSafeAreaInsets')&&dock.includes('Math.max(12,insets.bottom)'));
assert.ok(home.includes('maintenance.session?.page')&&portfolio.includes('maintenance.session?.page'));
assert.ok(!read('src/maintenance/inspectionModel.ts').includes("import {useFinance}"));
console.log('V3.0.2 live tap inspector, true-settings skill reuse, scoped overrides, clean mode and safe-area contracts: PASS');
