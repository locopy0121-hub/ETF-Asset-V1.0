import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildBackupDocument,parseBackupDocument,validBackupPayload,
  TF_BACKUPS_KEY,TF_LAST_EXTERNAL_BACKUP_KEY,
  type BackupHistoryEntry,type InspectedBackup,
} from './backupDocumentFormat';

export type BackupRecord=BackupHistoryEntry;
export type VerifiedExternalBackup=Readonly<{
  fileName:string;uri:string;bytes:number;createdAt:string;ledgerEntries:number;verified:true;
}>;
const BACKUPS_KEY=TF_BACKUPS_KEY;
const LAST_EXTERNAL_BACKUP_KEY=TF_LAST_EXTERNAL_BACKUP_KEY;
const THEME_KEY='@tf-asset/theme-runtime';
const PREFIX='@tf-asset/';
const APP_VERSION='3.0.6';

const validPayload=validBackupPayload;

function sanitizeRestoredPayload(payload:Record<string,string>){
  const next={...payload};
  // An external URI from another installation is not proof that this device has that file.
  delete next[LAST_EXTERNAL_BACKUP_KEY];
  const raw=next[THEME_KEY];
  if(!raw)return next;
  try{
    const theme=JSON.parse(raw) as Record<string,unknown>;
    const clearExternalBackground=(snapshot:unknown)=>{
      if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))return;
      const item=snapshot as Record<string,unknown>;
      if(typeof item.customBackgroundUri==='string'&&item.customBackgroundUri.startsWith('content://'))item.customBackgroundUri=null;
    };
    clearExternalBackground(theme);
    if(Array.isArray(theme.customSlots))theme.customSlots.forEach(clearExternalBackground);
    next[THEME_KEY]=JSON.stringify(theme);
  }catch{}
  return next;
}

async function collectPayload(){
  const keys=(await AsyncStorage.getAllKeys()).filter(key=>key.startsWith(PREFIX)&&key!==BACKUPS_KEY&&key!==LAST_EXTERNAL_BACKUP_KEY);
  const rows=await AsyncStorage.multiGet(keys);
  return Object.fromEntries(rows.filter((row):row is [string,string]=>typeof row[1]==='string'));
}

async function readBackups():Promise<BackupRecord[]>{
  try{
    const raw=await AsyncStorage.getItem(BACKUPS_KEY);
    if(!raw)return [];
    const parsed=JSON.parse(raw) as unknown;
    if(!Array.isArray(parsed))return [];
    return parsed.filter((item):item is BackupRecord=>{
      if(!item||typeof item!=='object')return false;
      const row=item as Partial<BackupRecord>;
      return typeof row.id==='string'&&typeof row.createdAt==='string'&&validPayload(row.payload);
    });
  }catch{return [];}
}

async function writeBackups(items:readonly BackupRecord[]){
  await AsyncStorage.setItem(BACKUPS_KEY,JSON.stringify(items.slice(0,10)));
}

export async function listLocalBackups(){
  return readBackups();
}

export async function createLocalBackup():Promise<BackupRecord>{
  const payload=await collectPayload();
  // A collection of preferences without the Ledger is NOT a complete backup.
  buildBackupDocument({payload,history:[],appVersion:APP_VERSION,exportedAt:new Date().toISOString()});
  const serialized=JSON.stringify(payload);
  const record:BackupRecord={
    id:'backup-'+Date.now(),
    createdAt:new Date().toISOString(),
    appVersion:APP_VERSION,
    keys:Object.keys(payload).length,
    bytes:serialized.length,
    payload,
  };
  const existing=await readBackups();
  await writeBackups([record,...existing]);
  return record;
}

export async function restoreLocalBackup(id:string){
  const backups=await readBackups();
  const selected=backups.find(item=>item.id===id);
  if(!selected)throw new Error('找不到指定備份');
  buildBackupDocument({payload:selected.payload,history:[],appVersion:selected.appVersion,exportedAt:selected.createdAt});
  await createLocalBackup();
  await AsyncStorage.multiSet(Object.entries(sanitizeRestoredPayload(selected.payload)));
  return selected;
}

export function inspectTfAssetBackup(text:string):InspectedBackup{
  return parseBackupDocument(text).inspection;
}

export async function exportTfAssetData(){
  const payload=await collectPayload();
  return buildBackupDocument({
    payload,history:await readBackups(),appVersion:APP_VERSION,exportedAt:new Date().toISOString(),
  });
}

export async function importTfAssetData(text:string){
  // Reject corrupt, foreign or ledger-less data BEFORE writing a single live storage key.
  const parsed=parseBackupDocument(text);
  const incoming=sanitizeRestoredPayload(parsed.payload);
  const before=await collectPayload();
  await createLocalBackup();
  try{
    await AsyncStorage.multiSet(Object.entries(incoming));
    const verify=await AsyncStorage.multiGet(Object.keys(incoming));
    if(verify.some(([key,value])=>value!==incoming[key]))throw new Error('寫入後校驗不一致');
    if(parsed.history.length){
      const local=await readBackups();
      const merged=[...local,...parsed.history];
      const seen=new Set<string>();
      await writeBackups(merged.filter(row=>{
        if(seen.has(row.id))return false;
        seen.add(row.id);return true;
      }));
    }
    return Object.keys(incoming).length;
  }catch(error){
    // Best effort rollback when a storage failure interrupts import.
    const introduced=Object.keys(incoming).filter(key=>!(key in before));
    if(introduced.length)await AsyncStorage.multiRemove(introduced);
    if(Object.keys(before).length)await AsyncStorage.multiSet(Object.entries(before));
    throw new Error('匯入中止，已嘗試回復匯入前資料：'+(error instanceof Error?error.message:String(error)));
  }
}

/** This receipt is recorded ONLY after Android SAF has written AND byte-for-byte read back the external file. */
export async function recordVerifiedExternalBackup(receipt:{
  fileName:string;uri:string;bytes:number;verified:true;
},documentText:string){
  if(receipt.verified!==true)throw new Error('尚未核實備份文件寫入');
  const details=inspectTfAssetBackup(documentText);
  const record:VerifiedExternalBackup={
    fileName:receipt.fileName,uri:receipt.uri,bytes:receipt.bytes,
    createdAt:new Date().toISOString(),ledgerEntries:details.ledgerEntries,verified:true,
  };
  await AsyncStorage.setItem(LAST_EXTERNAL_BACKUP_KEY,JSON.stringify(record));
  return record;
}
export async function lastVerifiedExternalBackup():Promise<VerifiedExternalBackup|null>{
  try{
    const raw=await AsyncStorage.getItem(LAST_EXTERNAL_BACKUP_KEY);
    if(!raw)return null;
    const value=JSON.parse(raw) as VerifiedExternalBackup;
    return value?.verified===true&&typeof value.fileName==='string'&&typeof value.createdAt==='string'?value:null;
  }catch{return null;}
}

export async function clearFinanceStorage(){
  await AsyncStorage.removeItem('@tf-asset/v1.0.2-ledger');
}

export async function dataStorageSummary(){
  const payload=await collectPayload();
  return {
    keys:Object.keys(payload).length,
    bytes:JSON.stringify(payload).length,
  };
}

export { BACKUPS_KEY };
