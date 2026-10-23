import AsyncStorage from '@react-native-async-storage/async-storage';
import {loadBackupHistory,saveBackupHistory} from './backupHistoryStorage';
import {applyBackupPayload} from './backupStorageTransaction';
import {
  buildBackupDocument,parseBackupDocument,
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
const APP_VERSION='5.0.38';

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
  // Surface unreadable history instead of treating it as empty and overwriting it.
  return loadBackupHistory(AsyncStorage);
}

async function writeBackups(items:readonly BackupRecord[]){
  await saveBackupHistory(AsyncStorage,items);
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
  const before=await collectPayload();
  await createLocalBackup();
  await applyBackupPayload(AsyncStorage,before,sanitizeRestoredPayload(selected.payload));
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
  // Preserve the local safety snapshot even if imported history cannot be committed.
  const safetyHistory=await readBackups();
  await applyBackupPayload(AsyncStorage,before,incoming);
  try{
    if(parsed.history.length){
      const local=await readBackups();
      const merged=[...local,...parsed.history];
      const seen=new Set<string>();
      await writeBackups(merged.filter(row=>{
        if(seen.has(row.id))return false;
        seen.add(row.id);return true;
      }));
    }
  }catch(error){
    // Verify and, if needed, restore the safety history independently from live state.
    // Never claim rollback succeeded unless both namespaces have been verified.
    const failures:string[]=[];
    try{
      const current=await readBackups();
      if(JSON.stringify(current)!==JSON.stringify(safetyHistory)){
        await writeBackups(safetyHistory);
        const verified=await readBackups();
        if(JSON.stringify(verified)!==JSON.stringify(safetyHistory)){
          throw new Error('備份歷史回滾校驗不一致');
        }
      }
    }catch(historyError){failures.push('歷史備份：'+String(historyError));}
    try{await applyBackupPayload(AsyncStorage,incoming,before);}
    catch(payloadError){failures.push('使用中資料：'+String(payloadError));}
    if(failures.length){
      throw new Error('匯入失敗且回滾未完全證實：'+failures.join('；')+'；原始錯誤：'+String(error));
    }
    throw new Error('歷史備份寫入失敗，已校驗回復原本資料：'+String(error));
  }
  return Object.keys(incoming).length;
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
