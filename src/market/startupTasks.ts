/** Local storage is the startup barrier. Native market work may finish later. */
export async function restoreMarketStartup<T>(local:()=>Promise<void>,native:()=>Promise<T>,apply:(value:T)=>void):Promise<void>{
 await local();
 void native().then(apply).catch(()=>{});
}
/** Serial, bounded latest-only writes; a slow disk cannot accumulate snapshots. */
export function createLatestWriter<T>(write:(value:T)=>Promise<unknown>,delayMs=5000){
 let pending:T|undefined,timer:ReturnType<typeof setTimeout>|undefined,running=false,disposed=false;
 const schedule=()=>{if(!disposed&&!running&&!timer&&pending!==undefined)timer=setTimeout(()=>{timer=undefined;void flush();},delayMs);};
 const flush=async()=>{if(disposed||pending===undefined)return;const value=pending;pending=undefined;running=true;try{await write(value);}catch{}finally{running=false;schedule();}};
 return {submit(value:T){if(disposed)return;pending=value;schedule();},dispose(){disposed=true;pending=undefined;if(timer)clearTimeout(timer);}};
}
