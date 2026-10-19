import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  ITEM_EFFECT_CATALOG,ITEM_EFFECT_GROUPS,ITEM_EFFECT_KINDS,
  DEFAULT_ITEM_EFFECT,itemEffectGroup,itemEffectLabel,
} from '../src/domain/displayItemContract';
import {createInitialEditorState,createInitialDisplayState,mergeEditorState,mergeDisplayState} from '../src/editor/editorModel';

const ids=ITEM_EFFECT_CATALOG.map(x=>x.id);
assert.equal(ids.length,42,'All basic, entrance, exit, emphasis, numeric, visual, interaction and market effects must be present');
assert.equal(new Set(ids).size,ids.length,'Effect IDs must be unique for saved layout persistence');
assert.deepEqual(ids,ITEM_EFFECT_KINDS);
for(const item of ITEM_EFFECT_CATALOG){
  assert.ok(ITEM_EFFECT_GROUPS.some(group=>group.id===item.group));
  assert.equal(itemEffectGroup(item.id),item.group);
  assert.equal(itemEffectLabel(item.id),item.label);
}
for(const id of ['number-roll','count-up','count-down','numeric-tween','price-pop','change-flash','pnl-glow','volume-pulse','trend-draw','drag-snap'] as const)
  assert.ok(ITEM_EFFECT_KINDS.includes(id),id);

const oldFrames=createInitialEditorState();
const withoutMotion={...oldFrames.home['asset-dashboard']!,motion:undefined};
const migrated=mergeEditorState({home:{'asset-dashboard':withoutMotion}});
assert.equal(migrated.home['asset-dashboard']?.motion?.kind,'none','Old frame configs default to no motion');
assert.equal(migrated.home['asset-dashboard']?.visible,withoutMotion.visible,'Frame visibility is retained');
assert.equal(migrated.home['asset-dashboard']?.order,withoutMotion.order,'Frame order is retained');

const custom=mergeEditorState({home:{'asset-dashboard':{...withoutMotion,motion:{
  ...DEFAULT_ITEM_EFFECT,kind:'quote-flip',durationMs:9999,strengthPercent:-2,loop:true,
}}}});
assert.deepEqual(custom.home['asset-dashboard']?.motion?.kind,'quote-flip');
assert.equal(custom.home['asset-dashboard']?.motion?.durationMs,1200);
assert.equal(custom.home['asset-dashboard']?.motion?.strengthPercent,0);
assert.equal(custom.home['asset-dashboard']?.motion?.loop,true);

const display=createInitialDisplayState();
const original=display.home.holdingWall!;
const edited={...original,fields:original.fields.map(field=>field.field==='price'?{...field,effect:{...DEFAULT_ITEM_EFFECT,kind:'number-roll',trigger:'change'}}:field)};
const preserved=mergeDisplayState({home:{holdingWall:edited}});
assert.equal(preserved.home.holdingWall?.fields.find(x=>x.field==='price')?.effect.kind,'number-roll');
assert.equal(preserved.home.holdingWall?.fields.length,original.fields.length);
assert.equal(preserved.home.holdingWall?.style.backgroundColor,original.style.backgroundColor);

const source=readFileSync('src/components/ItemMotion.tsx','utf8');
assert.match(source,/useNativeDriver:true/,'UI transforms should use the native driver');
assert.match(source,/changed=!Object.is/,'Unchanged quote values should not restart animations');
assert.match(source,/reduceMotionChanged/,'Reduced-motion accessibility must be observed');
assert.match(source,/AppState.addEventListener/,'Background suspension must be handled');
const stack=readFileSync('src/components/PageEditorStack.tsx','utf8');
assert.match(stack,/pageKey!=='settings'/,'Protected Settings root must not be animated by frame editor');
console.log(`Motion contract checks passed: ${ids.length} effects, layout persistence and event safety`);
