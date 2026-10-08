import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PAGE_FRAMES} from '../src/domain/frameRegistry';
import {EDITOR_FRAMES} from '../src/domain/editorFrameRegistry';
import {makePageConfig,mergeEditorState,normalizeEditorConfig} from '../src/editor/editorModel';

const blobSha=(source:string)=>{const content=Buffer.from(source,'utf8');return createHash('sha1').update('blob '+content.length+'\0').update(content).digest('hex');};
const screen=readFileSync('src/screens/SettingsScreen.tsx','utf8');
const release=JSON.parse(readFileSync('app.json','utf8')).expo as {version:string;android:{versionCode:number}};
const protectedBaseline=screen.replace("const VERSION='"+release.version+"';","const VERSION='4.0.14';")
  .replace("const BUILD='"+String(release.android.versionCode)+"';","const BUILD='40014';");
assert.equal(blobSha(protectedBaseline),'ec360bf7adf599136f06fd8724283d7b148311c0','SettingsScreen must match V4.0.14 byte-for-byte except release metadata');
const protectedSubcomponents=[
  ['src/components/EtfHoldingsApiSettings.tsx','e5734da68b3cf49381a35aba82f08a3557761789'],
  ['src/components/DiagnosticLogPanel.tsx','db3718d192b7c610cf458669023ec298c84e5f60'],
  ['src/components/MarketComparisonPanel.tsx','c0c1d0b49c9726c35d50fa7a3e723de9a10ace1b'],
  ['src/components/monitor/MonitorControlPanel.tsx','dbb3115e8763d9b101f837682f0027312eb3875b'],
  ['src/components/widget/WidgetControlPanel.tsx','b0feb6515a283b5d471bdc3881345ef710fce2e4'],
] as const;
for(const [file,sha] of protectedSubcomponents)assert.equal(blobSha(readFileSync(file,'utf8')),sha,'protected settings child drifted: '+file);
assert.deepEqual(EDITOR_FRAMES.settings,PAGE_FRAMES.settings,'settings must not have any V4.0.15 editor-only frames');
assert.equal(EDITOR_FRAMES.settings.length,10);
assert.equal(screen.includes('PageEditorStack'),false,'protected settings page cannot be rebuilt by editor');
assert.equal(screen.includes('PageShell'),false,'protected settings header cannot be replaced');
assert.equal(screen.includes("from '../components/EditableNative'"),false,'protected settings must keep native controls');
const oldSettings={...makePageConfig('settings')};
oldSettings.system={...oldSettings.system!,visible:false,backgroundColor:'#123456'};
oldSettings.display={...oldSettings.display!,titleFontSize:21};
const migrated=mergeEditorState({settings:oldSettings}).settings;
assert.deepEqual(Object.keys(migrated).sort(),PAGE_FRAMES.settings.map(f=>f.key).sort());
assert.equal(migrated.system!.visible,false);
assert.equal(migrated.system!.backgroundColor,'#123456');
assert.equal(migrated.display!.titleFontSize,21);
assert.deepEqual(normalizeEditorConfig('settings',migrated),migrated);
assert.match(readFileSync('App.tsx','utf8'),/case 'settings': return <SettingsScreen\/>/);
console.log('V4.0.16 protected V4.0.14 settings page + navigation regression PASS');
