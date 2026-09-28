import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {appendDiagnosticEntries,createDiagnosticEntry,exportDiagnosticEntries,
  readDiagnosticEntries,redactDiagnosticText,DIAGNOSTIC_LIMIT,DIAGNOSTIC_MAX_AGE_MS} from '../src/diagnostics/diagnosticModel';
const now=2_000_000_000_000;
const make=(i:number,at=now-i)=>createDiagnosticEntry({
  level:i%2?'error':'info',code:'PORTFOLIO_TAP',screen:'portfolio',
  message:'按卡片',detail:'診斷代碼',
},at,'id-'+i);
assert.equal(redactDiagnosticText('email abc@xyz.com token=123 https://example.com/a?key=x'),
  'email [email] credential=[redacted] [url]');
const many=Array.from({length:100},(_,i)=>make(i));
const bounded=appendDiagnosticEntries([],many,now);
assert.equal(bounded.length,DIAGNOSTIC_LIMIT);
assert.equal(bounded[0]?.id,'id-0');
assert.equal(appendDiagnosticEntries(bounded,[make(0)],now).length,DIAGNOSTIC_LIMIT);
assert.equal(appendDiagnosticEntries(bounded,[make(99,now-DIAGNOSTIC_MAX_AGE_MS-1)],now).length,DIAGNOSTIC_LIMIT);
assert.equal(readDiagnosticEntries([{id:'oops',at:'not-number',level:'error'}]).length,0);
assert.equal(readDiagnosticEntries(JSON.parse(JSON.stringify(bounded))).length,DIAGNOSTIC_LIMIT);
assert.equal(JSON.parse(exportDiagnosticEntries(bounded)).version,'3.1.14');
for(const path of ['src/diagnostics/DiagnosticRuntime.tsx','src/components/DiagnosticLogPanel.tsx',
  'native/android/TfAssetNativeModule.kt','App.tsx','src/screens/PortfolioScreen.tsx',
  'src/screens/SettingsScreen.tsx','src/components/HoldingDetailBoundary.tsx']){
  assert.ok(readFileSync(path,'utf8').length>100,path);
}
const runtime=readFileSync('src/diagnostics/DiagnosticRuntime.tsx','utf8');
const native=readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const settings=readFileSync('src/screens/SettingsScreen.tsx','utf8');
const app=readFileSync('App.tsx','utf8');
assert.match(runtime,/setGlobalHandler/);
assert.match(runtime,/acknowledgeNativeCrashJournal/);
assert.match(native,/Thread\.setDefaultUncaughtExceptionHandler/);
assert.match(native,/pending_crash_journal/);
assert.match(settings,/錯誤紀錄 Log/);
assert.match(app,/DiagnosticsProvider/);
assert.match(app,/HOLDING_TAP/);
assert.match(readFileSync('src/components/PageFrameSettingsModal.tsx','utf8'),/PAGE_EDITOR_APPLY/);
assert.match(readFileSync('src/maintenance/MaintenanceRuntime.tsx','utf8'),/ENGINEER_APPLY/);
console.log('V3.1.3 bounded persisted diagnostic journal, privacy and UI/native wiring: PASS (device logcat remains separate)');
