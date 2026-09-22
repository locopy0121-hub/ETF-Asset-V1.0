import assert from 'node:assert/strict';

import { DEFAULT_ITEM_EFFECT } from '../src/domain/displayItemContract';
import { mergeDisplayState } from '../src/editor/editorModel';
import { DEFAULT_HOLDING_WALL_CONFIG } from '../src/domain/uiModels';
import {
  DEFAULT_MONITOR_CONFIG,
  monitorItem,
  updateMiniColumn,
  updateMiniStatusItem,
  updateNormalItem,
} from '../src/monitor/monitorDomain';
import {
  DEFAULT_WIDGET_CONFIG,
  updateWidgetFieldVisual,
  widgetFieldStyle,
} from '../src/widget/widgetDomain';

const widgetBefore=DEFAULT_WIDGET_CONFIG;
const widgetAfter=updateWidgetFieldVisual(widgetBefore,'totalAssets',{
  fontScale:1.35,
  lineGap:18,
  textColor:'#123456',
  effect:{kind:'bounce',trigger:'refresh',speed:'fast',intensity:'strong'},
});
assert.equal(widgetFieldStyle(widgetAfter,'totalAssets').visual.lineGap,18);
assert.equal(widgetFieldStyle(widgetAfter,'totalAssets').visual.fontScale,1.35);
assert.equal(widgetFieldStyle(widgetAfter,'totalAssets').visual.effect.kind,'bounce');
assert.equal(widgetFieldStyle(widgetAfter,'price').visual.lineGap,null,'Widget B edit must not leak to another field');
assert.equal(widgetFieldStyle(widgetBefore,'totalAssets').visual.lineGap,null,'Widget update must be immutable');

const monitorItemBefore=monitorItem(DEFAULT_MONITOR_CONFIG,'pnl');
const monitorAfter=updateNormalItem(DEFAULT_MONITOR_CONFIG,'pnl',{
  visual:{...monitorItemBefore.visual,lineGap:14,textColor:'#ABCDEF',effect:{kind:'pulse',trigger:'gain',speed:'normal',intensity:'medium'}},
});
assert.equal(monitorItem(monitorAfter,'pnl').visual.lineGap,14);
assert.equal(monitorItem(monitorAfter,'price').visual.lineGap,null,'Monitor Normal B edit must stay per-item');
assert.equal(monitorItem(DEFAULT_MONITOR_CONFIG,'pnl').visual.lineGap,null,'Monitor Normal update must be immutable');

const miniAfter=updateMiniColumn(DEFAULT_MONITOR_CONFIG,'price',{
  lineGap:11,
  backgroundColor:'#112233',
  effect:{kind:'fade',trigger:'change',speed:'slow',intensity:'soft'},
});
assert.equal(miniAfter.miniColumns.find(x=>x.field==='price')?.lineGap,11);
assert.equal(miniAfter.miniColumns.find(x=>x.field==='changePercent')?.lineGap,null,'Mini B edit must not leak');

const statusAfter=updateMiniStatusItem(DEFAULT_MONITOR_CONFIG,'totalReturn',{
  fontScale:1.4,
  lineGap:9,
  effect:{kind:'flash-on-change',trigger:'loss',speed:'fast',intensity:'strong'},
});
assert.equal(statusAfter.miniStatusItems.find(x=>x.field==='totalReturn')?.fontScale,1.4);
assert.equal(statusAfter.miniStatusItems.find(x=>x.field==='marketValue')?.lineGap,null,'Mini status B edit must not leak');

const wallBefore=DEFAULT_HOLDING_WALL_CONFIG;
const wallAfter={
  ...wallBefore,
  fields:wallBefore.fields.map(field=>field.field==='pnl'
    ?{...field,lineGap:16,textColor:'#FEDCBA',effect:{...DEFAULT_ITEM_EFFECT,kind:'bounce' as const}}
    :field),
};
assert.equal(wallAfter.fields.find(x=>x.field==='pnl')?.lineGap,16);
assert.equal(wallAfter.fields.find(x=>x.field==='price')?.lineGap,null,'Market-wall B edit must not leak');
assert.equal(wallBefore.fields.find(x=>x.field==='pnl')?.lineGap,null,'Market-wall edit must be immutable');

const legacyHydrated=mergeDisplayState({home:{holdingWall:{
  header:{visible:true},
  fields:[{field:'pnl',enabled:true,label:'損益',fontScale:1,useProfitColor:true}],
  style:{},
}}});
const legacyWall=legacyHydrated.home.holdingWall!;
const legacyPnl=legacyWall.fields.find(x=>x.field==='pnl')!;
assert.deepEqual(legacyWall.header.effect,DEFAULT_ITEM_EFFECT,'Legacy header without effect must hydrate a complete default effect');
assert.deepEqual(legacyPnl.effect,DEFAULT_ITEM_EFFECT,'Legacy field without effect must hydrate a complete default effect');
assert.equal(legacyPnl.align,DEFAULT_HOLDING_WALL_CONFIG.fields.find(x=>x.field==='pnl')!.align,'Legacy field must keep its original alignment default');
assert.equal(legacyPnl.textColor,null);
assert.equal(legacyPnl.backgroundColor,null);

const savedEffect={kind:'bounce' as const,trigger:'gain' as const,speed:'fast' as const,intensity:'strong' as const};
const savedHydrated=mergeDisplayState({home:{holdingWall:{
  header:{...DEFAULT_HOLDING_WALL_CONFIG.header,effect:savedEffect},
  fields:DEFAULT_HOLDING_WALL_CONFIG.fields.map(field=>field.field==='pnl'?{...field,textColor:'#abcdef',backgroundColor:'#123456',lineGap:13,paddingY:4,effect:savedEffect}:field),
  style:DEFAULT_HOLDING_WALL_CONFIG.style,
}}});
const savedWall=savedHydrated.home.holdingWall!;
const savedPnl=savedWall.fields.find(x=>x.field==='pnl')!;
assert.deepEqual(savedWall.header.effect,savedEffect,'Saved header effect must survive hydration');
assert.deepEqual(savedPnl.effect,savedEffect,'Saved field effect must survive hydration');
assert.equal(savedPnl.textColor,'#ABCDEF','Saved field text color must survive hydration');
assert.equal(savedPnl.backgroundColor,'#123456','Saved field background color must survive hydration');
assert.equal(savedPnl.lineGap,13,'Saved field line gap must survive hydration');
assert.equal(savedPnl.paddingY,4,'Saved field padding must survive hydration');

console.log('V1.1.2 A-B behavior isolation: PASS');
