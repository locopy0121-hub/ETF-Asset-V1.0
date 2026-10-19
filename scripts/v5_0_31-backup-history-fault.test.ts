import assert from 'node:assert/strict';
import {loadBackupHistory,saveBackupHistory,type BackupStorageAdapter} from '../src/settings/backupHistoryStorage';
import {TF_BACKUPS_KEY,type BackupHistoryEntry} from '../src/settings/backupDocumentFormat';

class MemoryHistory implements BackupStorageAdapter {
 data=new Map<string,string>();
 failWrite=false;
 async getItem(k:string){return this.data.get(k)??null;}
 async getAllKeys(){return [...this.data.keys()];}
 async multiGet(keys:string[]):Promise<readonly (readonly [string,string|null])[]>{
  return keys.map(k=>[k,this.data.get(k)??null] as const);
 }
 async multiSet(items:[string,string][]):Promise<void>{
  if(this.failWrite){this.failWrite=false;throw new Error('transaction rejected');}
  for(const [k,v] of items)this.data.set(k,v);
 }
 async multiRemove(keys:string[]):Promise<void>{for(const k of keys)this.data.delete(k);}
}
const entry=(id:string):BackupHistoryEntry=>({
 id,createdAt:'2026-10-19T00:00:00Z',appVersion:'5.0.30',
 keys:1,bytes:3,payload:{'@tf-asset/v1.0.2-ledger':'{}'},
});
async function main(){
 const storage=new MemoryHistory();
 await saveBackupHistory(storage,[entry('before')]);
 const snapshot=await loadBackupHistory(storage);
 assert.equal(snapshot[0]?.id,'before');
 const index=await storage.getItem(TF_BACKUPS_KEY);
 storage.failWrite=true;
 await assert.rejects(()=>saveBackupHistory(storage,[entry('after')]),/transaction rejected/);
 assert.equal(await storage.getItem(TF_BACKUPS_KEY),index,'failed atomic history write must preserve prior index');
 assert.deepEqual(await loadBackupHistory(storage),snapshot,'failed history write must preserve usable records');
 // Missing segment must fail closed; do not silently return empty snapshots.
 const keys=await storage.getAllKeys();
 const part=keys.find(k=>k.startsWith('@tf-backup-snapshot-v2/'));
 assert.ok(part);
 storage.data.delete(part);
 await assert.rejects(()=>loadBackupHistory(storage),/分段遺失/);
 console.log('M11 history integrity and failed-transaction behavior PASS');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
