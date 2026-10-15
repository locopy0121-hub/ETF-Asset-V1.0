import {TF_BACKUPS_KEY,validBackupPayload,type BackupHistoryEntry} from './backupDocumentFormat';

// Keep serialized snapshots outside @tf-asset/ so they cannot recursively enter exports.
const SNAPSHOT_PREFIX='@tf-backup-snapshot-v2/';
const MAX_HISTORY=10;
const CHUNK_LENGTH=160_000; // Strictly below Android's ~2MB CursorWindow entry limit.
type IndexItem=Readonly<{prefix:string;parts:number}>;
type BackupIndex=Readonly<{schema:2;items:IndexItem[]}>;
export type BackupStorageAdapter={
  getItem:(key:string)=>Promise<string|null>;
  getAllKeys:()=>Promise<readonly string[]>;
  multiGet:(keys:string[])=>Promise<readonly (readonly [string,string|null])[]>;
  multiSet:(items:[string,string][])=>Promise<void>;
  multiRemove:(keys:string[])=>Promise<void>;
};

function validRecord(value:unknown):value is BackupHistoryEntry{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Partial<BackupHistoryEntry>;
  return typeof row.id==='string'&&row.id.length>0
    &&typeof row.createdAt==='string'&&typeof row.appVersion==='string'
    &&typeof row.keys==='number'&&typeof row.bytes==='number'
    &&validBackupPayload(row.payload);
}
function splitRecord(serialized:string):string[]{
  const chunks:string[]=[];
  for(let start=0;start<serialized.length;){
    let end=Math.min(serialized.length,start+CHUNK_LENGTH);
    // Never split an astral Unicode character between SQLite rows.
    const last=serialized.charCodeAt(end-1);
    if(end<serialized.length&&last>=0xD800&&last<=0xDBFF)end--;
    chunks.push(serialized.slice(start,end));
    start=end;
  }
  return chunks;
}
export async function loadBackupHistory(store:BackupStorageAdapter):Promise<BackupHistoryEntry[]>{
  const raw=await store.getItem(TF_BACKUPS_KEY);
  if(!raw)return [];
  let parsed:unknown;
  try{parsed=JSON.parse(raw);}catch{throw new Error('本機備份索引損毀，禁止覆寫原備份');}
  if(Array.isArray(parsed)){
    // Read existing V4/V5 single-value history without erasing it.
    if(!parsed.every(validRecord))throw new Error('舊版備份歷史資料不完整，禁止覆寫');
    return parsed;
  }
  const index=parsed as Partial<BackupIndex>|null;
  if(!index||index.schema!==2||!Array.isArray(index.items)||index.items.length>MAX_HISTORY){
    throw new Error('本機備份索引格式錯誤，禁止覆寫');
  }
  const records:BackupHistoryEntry[]=[];
  for(const item of index.items){
    if(!item||typeof item.prefix!=='string'||!item.prefix.startsWith(SNAPSHOT_PREFIX)
      ||!Number.isInteger(item.parts)||item.parts<1||item.parts>512){
      throw new Error('本機備份分段索引不完整');
    }
    const keys=Array.from({length:item.parts},(_,i)=>item.prefix+i);
    const chunks=await store.multiGet(keys);
    if(chunks.length!==keys.length||chunks.some((pair,i)=>pair[0]!==keys[i]||typeof pair[1]!=='string')){
      throw new Error('本機備份分段遺失，禁止覆寫');
    }
    let record:unknown;
    try{record=JSON.parse(chunks.map(pair=>pair[1]).join(''));}catch{
      throw new Error('本機備份分段無法解析，禁止覆寫');
    }
    if(!validRecord(record))throw new Error('本機備份分段資料不完整，禁止覆寫');
    records.push(record);
  }
  return records;
}
export async function saveBackupHistory(store:BackupStorageAdapter,records:readonly BackupHistoryEntry[]):Promise<void>{
  // Fail closed before overwriting an unreadable legacy/history index.
  await loadBackupHistory(store);
  const snapshot=records.slice(0,MAX_HISTORY);
  const batch='b'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const entries:[string,string][]=[];
  const index:BackupIndex={schema:2,items:[]};
  for(let i=0;i<snapshot.length;i++){
    const record=snapshot[i];
    if(!validRecord(record))throw new Error('無效的本機備份，不可儲存');
    const prefix=SNAPSHOT_PREFIX+batch+'/'+i+'/';
    const parts=splitRecord(JSON.stringify(record));
    if(parts.length>512)throw new Error('本機備份超出單份分段上限');
    index.items.push({prefix,parts:parts.length});
    parts.forEach((content,j)=>entries.push([prefix+j,content]));
  }
  // SQLite multiSet is one transaction: index and every segment commit together.
  await store.multiSet([...entries,[TF_BACKUPS_KEY,JSON.stringify(index)]]);
  const liveKeys=new Set(entries.map(([key])=>key));
  try{
    const oldKeys=(await store.getAllKeys()).filter(key=>key.startsWith(SNAPSHOT_PREFIX)&&!liveKeys.has(key));
    if(oldKeys.length)await store.multiRemove(oldKeys);
  }catch{
    // Cleanup can be retried later; never mark a successfully committed history as failed.
  }
}
