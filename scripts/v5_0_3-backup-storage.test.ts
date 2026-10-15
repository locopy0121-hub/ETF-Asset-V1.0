import assert from 'node:assert/strict';
import {loadBackupHistory,saveBackupHistory,type BackupStorageAdapter} from '../src/settings/backupHistoryStorage';
import {TF_BACKUPS_KEY,type BackupHistoryEntry} from '../src/settings/backupDocumentFormat';

class MemorySqlite implements BackupStorageAdapter{
  rows=new Map<string,string>();
  constructor(readonly maxBytes:number){}
  async getItem(key:string){return this.rows.get(key)??null;}
  async getAllKeys(){return Array.from(this.rows.keys());}
  async multiGet(keys:string[]){return keys.map(key=>[key,this.rows.get(key)??null] as [string,string|null]);}
  async multiSet(items:[string,string][]){
    const next=new Map(this.rows);
    items.forEach(([key,value])=>next.set(key,value));
    const total=Array.from(next).reduce((n,[key,value])=>n+Buffer.byteLength(key)+Buffer.byteLength(value),0);
    if(total>this.maxBytes)throw new Error('database or disk is full (code 13 SQLITE_FULL)');
    this.rows=next;
  }
  async multiRemove(keys:string[]){keys.forEach(key=>this.rows.delete(key));}
}
function history(id:string,contents:string):BackupHistoryEntry{
  return {id,createdAt:'2026-10-15T12:30:27Z',appVersion:'4.0.64',keys:2,bytes:contents.length,
    payload:{'@tf-asset/v1.0.2-ledger':'{"schema":4,"entries":[],"initialCash":0}',
      '@tf-asset/market-runtime':contents}};
}
const sample=history('old','X'.repeat(1_850_000));
const legacy=new MemorySqlite(64*1024*1024);
legacy.rows.set(TF_BACKUPS_KEY,JSON.stringify([sample]));
assert.equal((await loadBackupHistory(legacy))[0].id,'old');
const newer=history('new','中'.repeat(800_000)+'🙂'.repeat(20_000));
await saveBackupHistory(legacy,[newer,sample]);
const index=legacy.rows.get(TF_BACKUPS_KEY)!;
assert.ok(index.length<1500,'Index must no longer contain entire backups');
const blobs=Array.from(legacy.rows).filter(([key])=>key.startsWith('@tf-backup-snapshot-v2/'));
assert.ok(blobs.length>4);
assert.ok(blobs.every(([,value])=>Buffer.byteLength(value)<1_000_000),'Every SQLite value must fit CursorWindow');
const loaded=await loadBackupHistory(legacy);
assert.deepEqual(loaded,[newer,sample],'Historical JSON and astral Unicode must survive lossless segmented roundtrip');
await saveBackupHistory(legacy,[newer]);
assert.deepEqual(await loadBackupHistory(legacy),[newer]);
assert.ok(Array.from(legacy.rows.keys()).filter(key=>key.startsWith('@tf-backup-snapshot-v2/')).length<blobs.length,
  'Unreferenced archived segments must be pruned only after commit');
const tiny=new MemorySqlite(1_000_000);
tiny.rows.set(TF_BACKUPS_KEY,JSON.stringify([history('safe','safe')]));
await assert.rejects(saveBackupHistory(tiny,[sample]),/SQLITE_FULL/);
assert.equal((await loadBackupHistory(tiny))[0].id,'safe','Quota failure must not overwrite backup index');
const many=Array.from({length:10},(_,i)=>history('snapshot-'+i,'X'.repeat(1_850_000)));
const roomy=new MemorySqlite(64*1024*1024);
await saveBackupHistory(roomy,many);
assert.equal((await loadBackupHistory(roomy)).length,10);
assert.ok(Array.from(roomy.rows).every(([key])=>!key.startsWith('@tf-asset/')||key===TF_BACKUPS_KEY),
  'Backup segments must never be included in exported app payload');
console.log('TF Asset V5.0.3 legacy migration, quota failure, segmented history, no recursive export and Unicode PASS');
