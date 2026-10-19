/**
 * Keep a TF Asset restore bounded to the backed-up namespace and reversible.
 * History and last external backup receipt are managed independently.
 */
export type BackupStoragePort={
  multiSet:(pairs:readonly [string,string][])=>Promise<unknown>;
  multiRemove:(keys:readonly string[])=>Promise<unknown>;
  multiGet:(keys:readonly string[])=>Promise<readonly (readonly [string,string|null])[]>;
};
export function restoreKeyPlan(before:Record<string,string>,incoming:Record<string,string>){
  const removed=Object.keys(before).filter(key=>!(key in incoming));
  return {removed,written:Object.entries(incoming)};
}
export async function applyBackupPayload(storage:BackupStoragePort,before:Record<string,string>,incoming:Record<string,string>){
  const plan=restoreKeyPlan(before,incoming);
  try{
    if(plan.removed.length)await storage.multiRemove(plan.removed);
    if(plan.written.length)await storage.multiSet(plan.written);
    const allKeys=[...new Set([...Object.keys(before),...Object.keys(incoming)])];
    const checked=new Map(await storage.multiGet(allKeys));
    for(const key of allKeys){
      if(checked.get(key)!==(Object.prototype.hasOwnProperty.call(incoming,key)?incoming[key]:null)){
        throw new Error('還原後驗證不一致：'+key);
      }
    }
  }catch(error){
    // Best effort rollback; expose failures rather than claiming restoration.
    const introduced=Object.keys(incoming).filter(key=>!(key in before));
    try{
      if(introduced.length)await storage.multiRemove(introduced);
      if(Object.keys(before).length)await storage.multiSet(Object.entries(before));
      const checked=new Map(await storage.multiGet([...new Set([...Object.keys(before),...introduced])]));
      if([...Object.entries(before)].some(([k,v])=>checked.get(k)!==v)||introduced.some(k=>checked.get(k)!==null)){
        throw new Error('回滾後校驗不一致');
      }
    }catch(rollbackError){
      throw new Error('還原失敗且回滾未證實：'+String(rollbackError)+'；原始錯誤：'+String(error));
    }
    throw new Error('還原失敗，已校驗回復原資料：'+String(error));
  }
}
