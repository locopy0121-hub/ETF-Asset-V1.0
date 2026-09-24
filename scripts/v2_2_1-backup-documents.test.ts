import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildBackupDocument,parseBackupDocument,TF_LEDGER_KEY} from '../src/settings/backupDocumentFormat';

const ledger=JSON.stringify({schema:1,initialCash:123456,entries:[{id:'real-1',date:'2026-09-24',kind:'buy',symbol:'0050',
  name:'元大台灣50',shares:100,price:112.5,actualFee:1,actualTax:0}]});
const payload={[TF_LEDGER_KEY]:ledger,'@tf-asset/theme-runtime':'{"accent":"blue"}'};
const history=[{id:'b-1',createdAt:'2026-09-23T12:00:00Z',appVersion:'2.1.20',keys:2,bytes:123,payload}];
const exportedAt=new Date().toISOString();
const text=buildBackupDocument({payload,history,appVersion:'2.2.1',exportedAt});
const parsed=parseBackupDocument(text);
assert.equal(parsed.inspection.appVersion,'2.2.1');
assert.equal(parsed.inspection.ledgerEntries,1);
assert.equal(parsed.inspection.keys,2);
assert.equal(parsed.inspection.historyCount,1);
assert.deepEqual(parsed.payload,payload);
assert.deepEqual(parsed.history,history,'Export must include former internal backups');
const old=JSON.stringify({product:'TF Asset',version:1,appVersion:'2.1.21',exportedAt,payload});
assert.equal(parseBackupDocument(old).inspection.ledgerEntries,1,'Accept valid older v1 external exports');
for(const bad of [
  '', '{}',
  JSON.stringify({product:'TF Asset',version:1,appVersion:'2.1.21',exportedAt,payload:{}}),
  JSON.stringify({product:'TF Asset',version:1,appVersion:'2.1.21',exportedAt,payload:{...payload,[TF_LEDGER_KEY]:'broken'}}),
  JSON.stringify({product:'TF Asset',version:1,appVersion:'2.1.21',exportedAt,payload:{...payload,[TF_LEDGER_KEY]:JSON.stringify({schema:1,initialCash:123,entries:[{id:'dupe',date:'2026-09-24',kind:'other'},{id:'dupe',date:'2026-09-24',kind:'other'}]})}}),
]){
  assert.throws(()=>parseBackupDocument(bad),'Corrupt, incomplete or duplicate ledger cannot be imported');
}
const native=readFileSync('native/android/TfAssetNativeModule.kt','utf8');
const bridge=readFileSync('src/native/TfAssetNativeBridge.ts','utf8');
const ui=readFileSync('src/screens/SettingsScreen.tsx','utf8');
const service=readFileSync('src/settings/BackupService.ts','utf8');
assert.match(native,/Intent\.ACTION_CREATE_DOCUMENT/);
assert.match(native,/Intent\.ACTION_OPEN_DOCUMENT/);
assert.match(native,/bytes\.contentEquals\(copied\)/,'A file chooser launch is not proof of successful backup');
assert.match(native,/readBackupBytes\(uri\)/);
assert.match(bridge,/saveExternalBackup/);
assert.match(bridge,/chooseExternalBackup/);
assert.match(ui,/選擇儲存位置並建立 JSON 檔案/);
assert.match(ui,/選擇 JSON 備份檔案/);
assert.match(ui,/confirmedBackupImport|confirmBackupImport/);
assert.match(service,/parseBackupDocument\(text\)/,'Restore validates contents before writing');
assert.match(service,/await AsyncStorage\.multiGet\(Object\.keys\(incoming\)\)/,'Restore checks resulting storage');
console.log('V2.2.1 external document schema/history, old v1 migration, corruption rejection, SAF write/readback wiring and guarded import: PASS; Android picker DEVICE PENDING');
