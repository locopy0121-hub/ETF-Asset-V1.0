import AsyncStorage from '@react-native-async-storage/async-storage';

export type BackupRecord=Readonly<{
  id:string;
  createdAt:string;
  appVersion:string;
  keys:number;
  bytes:number;
  payload:Record<string,string>;
}>;

const BACKUPS_KEY='@tf-asset/local-backups';
const THEME_KEY='@tf-asset/theme-runtime';
const PREFIX='@tf-asset/';
const APP_VERSION='2.1.5';

function validPayload(value:unknown):value is Record<string,string>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  return Object.entries(value as Record<string,unknown>).every(([key,item])=>
    key.startsWith(PREFIX)&&key!==BACKUPS_KEY&&typeof item==='string'
  );
}

function sanitizeRestoredPayload(payload:Record<string,string>){
  const next={...payload};
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
  const keys=(await AsyncStorage.getAllKeys()).filter(key=>key.startsWith(PREFIX)&&key!==BACKUPS_KEY);
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
  await createLocalBackup();
  await AsyncStorage.multiSet(Object.entries(sanitizeRestoredPayload(selected.payload)));
  return selected;
}

export async function exportTfAssetData(){
  const payload=await collectPayload();
  return JSON.stringify({
    product:'TF Asset',
    version:1,
    appVersion:APP_VERSION,
    exportedAt:new Date().toISOString(),
    payload,
  },null,2);
}

export async function importTfAssetData(text:string){
  const parsed=JSON.parse(text) as {product?:unknown;version?:unknown;payload?:unknown};
  if(parsed.product!=='TF Asset'||parsed.version!==1||!validPayload(parsed.payload)){
    throw new Error('匯入格式或資料結構不符合 TF Asset 備份格式');
  }
  await createLocalBackup();
  await AsyncStorage.multiSet(Object.entries(sanitizeRestoredPayload(parsed.payload)));
  return Object.keys(parsed.payload).length;
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
