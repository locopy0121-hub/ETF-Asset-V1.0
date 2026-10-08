import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAGE_FRAMES} from '../src/domain/frameRegistry';
import {EDITOR_FRAMES} from '../src/domain/editorFrameRegistry';
import {makePageConfig,mergeEditorState,normalizeEditorConfig} from '../src/editor/editorModel';

// Simulate a persisted V4.0.14 settings snapshot before page-header existed.
const oldSettings={...makePageConfig('settings')};
delete oldSettings['page-header'];
assert.equal(oldSettings['page-header'],undefined);
oldSettings['system']={...oldSettings['system']!,visible:false,backgroundColor:'#123456'};
oldSettings['display']={...oldSettings['display']!,titleFontSize:21};
const migrated=mergeEditorState({settings:oldSettings}).settings;
assert.ok(migrated['page-header'],'missing settings header must be restored on hydration');
assert.equal(migrated['page-header']!.visible,true);
assert.equal(migrated['system']!.visible,false,'preserve a hidden section');
assert.equal(migrated['system']!.backgroundColor,'#123456','preserve user colors');
assert.equal(migrated['display']!.titleFontSize,21,'preserve editor overrides');
assert.deepEqual(Object.keys(migrated).sort(),EDITOR_FRAMES.settings.map(f=>f.key).sort());
assert.equal(PAGE_FRAMES.settings.length,10,'protected settings screen still has ten sections');
assert.deepEqual(normalizeEditorConfig('settings',migrated),migrated);
const settingsSource=readFileSync('src/screens/SettingsScreen.tsx','utf8');
const appSource=readFileSync('App.tsx','utf8');
const shellSource=readFileSync('src/components/PageShell.tsx','utf8');
assert.match(settingsSource,/<PageShell pageKey="settings"/);
assert.match(appSource,/case 'settings': return <SettingsScreen\/>/);
assert.match(shellSource,/makePageConfig\(pageKey\?\?'home'\)\[headerFrameKey\]/);
console.log('V4.0.16 settings navigation old preferences regression PASS');
