import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {watchlistEditorCatalog,watchlistTargetByKind,watchlistTarget} from '../src/editor/watchlistEditorCatalog';
import {normalizeTargetOverride} from '../src/maintenance/inspectionModel';
const read=(path:string)=>readFileSync(path,'utf8');
const ids=watchlistEditorCatalog.map(t=>t.id);
assert.equal(new Set(ids).size,ids.length,'every selectable item needs its own persisted key');
for(const id of ['market:watchlist:item:price','market:watchlist:item:change','market:watchlist:item:changePercent',
  'market:watchlist:item:symbol','market:watchlist:item:name','market:watchlist:item:volume',
  'market:watchlist:item:previousClose','market:watchlist:item:source','market:watchlist:item:chart',
  ...['list','compact','wall','chart'].map(k=>'market:watchlist:mode:'+k),
  ...['compact','wall','chart'].map(k=>'market:watchlist:card:'+k)]){
 assert.ok(watchlistTarget(id),'missing target '+id);
}
assert.equal(watchlistTargetByKind('text').id,'market:watchlist:item:symbol');
assert.equal(watchlistTargetByKind('value').id,'market:watchlist:item:price');
const old={['market:watchlist:item:price']:{fontSize:22,textColor:'#FF0000',width:100}};
const persisted=normalizeTargetOverride(old['market:watchlist:item:price']);
assert.equal(persisted.fontSize,22);
assert.equal(persisted.textColor,'#FF0000');
assert.deepEqual(old['market:watchlist:item:price'],{fontSize:22,textColor:'#FF0000',width:100},'appearance editing must not mutate previous preferences');
const workbench=read('src/components/PageLayoutToolWorkbench.tsx');
const component=read('src/components/WatchlistPanel.tsx');
const surface=read('src/components/MarketEditableContent.tsx');
assert.match(workbench,/watchlistEditorCatalog\.map\(target=>/,'all content targets must be in the editor');
assert.match(workbench,/watchlistTargetByKind\(kind\)/,'toolbar must choose a meaningful content target');
for(const id of ids.filter(id=>id.startsWith('market:watchlist:item:'))){
 assert.ok(component.includes(id),'missing real rendered editable item '+id);
}
assert.match(surface,/nestedSelection==='children'/,'container must not intercept internal target taps');
assert.match(surface,/if\(nestedSelection==='card'\)return <Pressable/,'card inner items must receive taps');
assert.match(component,/nestedSelection="card" style=\{presentation\.mode==='wall'\?\{width:'48\.5%'/,
  'wall layout must retain two full-size columns after adding the edit wrapper');
assert.match(component,/presentation\.mode==='wall'\?\{width:'100%'/,
  'card body must fill the existing column without shrinking the quote cards');
assert.match(surface,/event\.stopPropagation\(\)/,'inner selection cannot bubble into outer card');
assert.match(component,/previewMode\?contentBody:<MarketPreviewActionGuard>/,
 'preview must allow editing clicks but production actions must retain legacy guarding');
assert.match(component,/disabled=\{previewMode\}/,'preview must never remove a watchlist holding');
assert.match(component,/if\(prefsReady&&!previewMode\)/,'preview must never persist display mode');
assert.match(read('src/screens/MarketResearchScreen.tsx'),/nestedSelection="children"/,'actual page must use same content keys');
assert.match(read('src/editor/watchlistEditorCatalog.ts'),/watchlistTargetByKind/);
assert.doesNotMatch(read('src/screens/SettingsScreen.tsx'),/PageEditorStack|PageLayoutToolWorkbench/);
console.log('V5.0.6 watchlist inner field catalog, persistence identifiers, nested tap path, action-isolated preview PASS');
