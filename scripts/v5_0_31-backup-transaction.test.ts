import assert from 'node:assert/strict';
import {applyBackupPayload,restoreKeyPlan,type BackupStoragePort} from '../src/settings/backupStorageTransaction';

class MemoryStore implements BackupStoragePort {
 data=new Map<string,string>();
 failNextSet=false;
 constructor(source:Record<string,string>){this.data=new Map(Object.entries(source));}
 async multiGet(keys:readonly string[]):Promise<readonly (readonly [string,string|null])[]>{
  return keys.map(k=>[k,this.data.get(k)??null] as const);
 }
 async multiSet(pairs:readonly [string,string][]){
  if(this.failNextSet){this.failNextSet=false;throw Error('simulated storage failure');}
  for(const [k,v] of pairs)this.data.set(k,v);
 }
 async multiRemove(keys:readonly string[]){for(const k of keys)this.data.delete(k);}
 snapshot(){return Object.fromEntries(this.data);}
}
async function main(){
 const before={'@tf-asset/ledger':'old','@tf-asset/removed':'stale','@tf-asset/theme':'dark'};
 const incoming={'@tf-asset/ledger':'new','@tf-asset/theme':'light'};
 assert.deepEqual(restoreKeyPlan(before,incoming).removed,['@tf-asset/removed']);
 const db=new MemoryStore(before);
 await applyBackupPayload(db,before,incoming);
 assert.deepEqual(db.snapshot(),incoming,'stale settings must not survive restore');
 const failure=new MemoryStore(before);
 failure.failNextSet=true;
 await assert.rejects(()=>applyBackupPayload(failure,before,incoming),/已校驗回復原資料/);
 assert.deepEqual(failure.snapshot(),before,'partial remove must rollback');
 const newKey={'@tf-asset/ledger':'new','@tf-asset/new-setting':'new'};
 const extra=new MemoryStore(before);
 extra.failNextSet=true;
 await assert.rejects(()=>applyBackupPayload(extra,before,newKey),/已校驗回復原資料/);
 assert.deepEqual(extra.snapshot(),before);
 console.log('M11 verified restore replacement + rollback PASS');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
