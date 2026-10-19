import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 ITEM_EFFECT_CATALOG,ITEM_ALL_EFFECT_KINDS,ITEM_EFFECT_GROUPS,DEFAULT_ITEM_EFFECT,
 itemEffectLabel,itemEffectGroup,
} from '../src/domain/displayItemContract';
import {createInitialEditorState,createInitialDisplayState,mergeEditorState,mergeDisplayState} from '../src/editor/editorModel';
import {APP_RELEASE_NOTES} from '../src/settings/appReleaseNotes';

const ids=ITEM_EFFECT_CATALOG.map(effect=>effect.id);
assert.equal(ids.length,42,'Exactly 42 effects are registered');
assert.equal(new Set(ids).size,42,'Every persisted animation ID must be unique');
assert.deepEqual(ids,ITEM_ALL_EFFECT_KINDS,'Picker matches core runtime');
for(const effect of ITEM_EFFECT_CATALOG){
 assert.ok(ITEM_EFFECT_GROUPS.some(group=>group.id===effect.group),'A visible animation category exists');
 assert.equal(itemEffectLabel(effect.id),effect.label);
 assert.equal(itemEffectGroup(effect.id),effect.group);
}
const frames=createInitialEditorState();
const original=frames.home['asset-dashboard']!;
const legacy=mergeEditorState({home:{'asset-dashboard':{...original,motion:undefined}}});
assert.equal(legacy.home['asset-dashboard']?.motion?.kind??'none','none');
assert.equal(legacy.home['asset-dashboard']?.order,original.order);
assert.equal(legacy.home['asset-dashboard']?.visible,original.visible);
const newer=mergeEditorState({home:{'asset-dashboard':{...original,motion:{...DEFAULT_ITEM_EFFECT,kind:'price-pop',durationMs:5000,strengthPercent:-3,loop:true}}}});
assert.equal(newer.home['asset-dashboard']?.motion?.kind,'price-pop');
assert.equal(newer.home['asset-dashboard']?.motion?.durationMs,1200);
assert.equal(newer.home['asset-dashboard']?.motion?.strengthPercent,0);
assert.equal(newer.home['asset-dashboard']?.motion?.loop,true);
const display=createInitialDisplayState();
const wall=display.home.holdingWall!;
const mutated={...wall,fields:wall.fields.map(field=>field.field==='price'?{...field,effect:{...field.effect,kind:'number-roll' as const}}:field)};
const migrated=mergeDisplayState({home:{holdingWall:mutated}});
assert.equal(migrated.home.holdingWall?.fields.find(field=>field.field==='price')?.effect.kind,'number-roll');
assert.equal(migrated.home.holdingWall?.style.backgroundColor,wall.style.backgroundColor);
const renderer=readFileSync('src/components/ItemMotion.tsx','utf8');
assert.match(renderer,/reduceMotionChanged/);
assert.match(renderer,/AppState\.addEventListener/);
assert.match(renderer,/Object\.is/);
assert.match(renderer,/useNativeDriver:true/);
assert.equal(APP_RELEASE_NOTES.version,'5.0.28');
assert.equal(APP_RELEASE_NOTES.androidVersionCode,50028);
assert.match(readFileSync('src/components/PageLayoutToolWorkbench.tsx','utf8'),/MotionControls/);
assert.match(readFileSync('src/components/HoldingQuoteModule.tsx','utf8'),/ItemMotionText/);
console.log('V5.0.28 motion regression PASS: 42 effects, frame and wall migration, runtime safeguards');
