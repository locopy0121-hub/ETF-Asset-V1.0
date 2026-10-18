import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PAGE_FRAMES} from '../src/domain/frameRegistry';
import {EDITOR_FRAMES} from '../src/domain/editorFrameRegistry';
import {makePageConfig,mergeEditorState,normalizeEditorConfig} from '../src/editor/editorModel';

const blobSha=(source:string)=>{const content=Buffer.from(source,'utf8');return createHash('sha1').update('blob '+content.length+'\0').update(content).digest('hex');};
const screen=readFileSync('src/screens/SettingsScreen.tsx','utf8');
const release=JSON.parse(readFileSync('app.json','utf8')).expo as {version:string;android:{versionCode:number}};
// V4.0.50: the user explicitly approved relocating the existing schedule here.
// Strip only that exact addition; all other protected content retains its original hash.
// User-authorized 2026-10-19 exception: ONLY the version-note import and the
// two pre-existing release-information panels may change. Restore exact
// historic bytes before hashing; every unrelated Settings byte stays protected.
const originalUpdates="      <ChildButton label=\"更新資訊\" summary=\"V3.2.49 成交價同步修護\" active={appPanel==='updates'} onPress={()=>setAppPanel(toggleExclusivePanel(appPanel,'updates'))}/>\n      {appPanel==='updates'?<Panel title=\"V3.2.49 更新資訊\">\n        <Text style={styles.infoText}>成交價同步修護：持股主卡 currentPrice 僅接受成交型價格。TWSE MIS 僅採 z；pz、bid、ask、y 不再進入主價格、損益與市值。z 缺值時改由零成本 Yahoo backup realtime 接手；TWSE trade 與 Yahoo backup realtime 同為成交型來源時，以較新的 source timestamp 為準，同時間才由來源品質決勝。SQLite V8 清除舊 bid/ask 主價。</Text>\n      </Panel>:null}";
const currentUpdates="      <ChildButton label=\"更新資訊\" summary={'V'+VERSION+' '+APP_RELEASE_NOTES.headline} active={appPanel==='updates'} onPress={()=>setAppPanel(toggleExclusivePanel(appPanel,'updates'))}/>\n      {appPanel==='updates'?<Panel title={'V'+VERSION+' 更新資訊'}>\n        {APP_RELEASE_NOTES.changes.map((item,index)=><Text key={item.id} style={styles.infoText}>{index+1}. {item.title}：{item.detail}</Text>)}\n        <Text style={styles.note}>{APP_RELEASE_NOTES.notice}</Text>\n      </Panel>:null}";
const protectedBaseline=screen
  .replace("import {APP_RELEASE_NOTES} from '../settings/appReleaseNotes';\n",'')
  .replace("        <Text style={styles.rowTitle}>本版更新內容</Text>\n        {APP_RELEASE_NOTES.changes.map((item,index)=><Text key={item.id} style={styles.infoText}>{index+1}. {item.title}：{item.detail}</Text>)}\n        <Text style={styles.note}>{APP_RELEASE_NOTES.notice}</Text>\n",'')
  .replace(currentUpdates,originalUpdates)
  .replace("import {ConnectedMonitorControlPanel as MonitorControlPanel} from '../components/monitor/ConnectedMonitorControlPanel';","import { MonitorControlPanel } from '../components/monitor/MonitorControlPanel';")
  .replace("import {MarketUpdateSchedulePanel} from '../components/MarketUpdateSchedulePanel';\n",'')
  .replace("type SystemPanel=null|'engineer'|'permissions'|'diagnostics'|'logs'|'schedule';","type SystemPanel=null|'engineer'|'permissions'|'diagnostics'|'logs';")
  .replace('      <ChildButton label="行情更新排程" summary="交易星期、盤中開始／結束時間" active={systemPanel===\'schedule\'} onPress={()=>setSystemPanel(systemPanel===\'schedule\'?null:\'schedule\')}/>\n      {systemPanel===\'schedule\'?<MarketUpdateSchedulePanel/>:null}\n','')
  .replace("const VERSION='"+release.version+"';","const VERSION='4.0.14';")
  .replace("const BUILD='"+String(release.android.versionCode)+"';","const BUILD='40014';");
assert.equal(blobSha(protectedBaseline),'ec360bf7adf599136f06fd8724283d7b148311c0','SettingsScreen must match V4.0.14 byte-for-byte except release metadata');
const protectedSubcomponents=[
  ['src/components/EtfHoldingsApiSettings.tsx','e5734da68b3cf49381a35aba82f08a3557761789'],
  ['src/components/DiagnosticLogPanel.tsx','db3718d192b7c610cf458669023ec298c84e5f60'],
  ['src/components/MarketComparisonPanel.tsx','c0c1d0b49c9726c35d50fa7a3e723de9a10ace1b'],
  // V4.0.65: user explicitly authorized fixed-size wall columns and direct count input in this Monitor child.
  // All other Settings shell/child hashes remain unchanged.
  // Only this Monitor child baseline changes; Settings shell and all other children remain locked.
  ['src/components/monitor/MonitorControlPanel.tsx','2b7fb3f4c638f41387fd0eb375937a5bd347fd73'],
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
