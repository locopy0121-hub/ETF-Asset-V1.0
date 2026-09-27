import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,useCallback,useContext,useEffect,useState,type PropsWithChildren} from 'react';
import {acknowledgeNativeCrashJournal,readPendingNativeCrashJournal,saveCriticalNativeDiagnostic} from '../native/TfAssetNativeBridge';
import {DIAGNOSTIC_STORAGE_KEY,appendDiagnosticEntries,createDiagnosticEntry,
  readDiagnosticEntries,type DiagnosticEntry,type DiagnosticEvent} from './diagnosticModel';

type Listener=(entries:DiagnosticEntry[])=>void;
const listeners=new Set<Listener>();
let queue:Promise<void>=Promise.resolve();
let serial=0;
let cache:DiagnosticEntry[]=[];
function emit(entries:DiagnosticEntry[]){
  cache=entries;
  listeners.forEach(listener=>listener(entries));
}
const parseStored=(raw:string|null):DiagnosticEntry[]=>{
  if(!raw)return [];
  try{return readDiagnosticEntries(JSON.parse(raw));}catch{return [];}
};
/** Serialized read-modify-write means concurrent UI taps do not erase crash entries. */
function enqueueWrite(event:DiagnosticEvent):Promise<void>{
  const now=Date.now();
  const entry=createDiagnosticEntry(event,now,String(now)+'-'+(++serial));
  queue=queue.catch(()=>{}).then(async()=>{
    const prior=parseStored(await AsyncStorage.getItem(DIAGNOSTIC_STORAGE_KEY));
    const next=appendDiagnosticEntries(prior,[entry]);
    await AsyncStorage.setItem(DIAGNOSTIC_STORAGE_KEY,JSON.stringify(next));
    emit(next);
  });
  return queue;
}
export function recordDiagnosticEvent(event:DiagnosticEvent):void{
  void enqueueWrite(event).catch(()=>{});
}
async function reloadEntries():Promise<DiagnosticEntry[]>{
  await queue.catch(()=>{});
  const result=appendDiagnosticEntries(parseStored(await AsyncStorage.getItem(DIAGNOSTIC_STORAGE_KEY)),[]);
  emit(result);
  return result;
}
async function clearEntries():Promise<void>{
  queue=queue.catch(()=>{}).then(async()=>{
    await AsyncStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
    emit([]);
  });
  await queue;
}
type DiagnosticContextValue=Readonly<{
  entries:readonly DiagnosticEntry[];
  reload:()=>Promise<void>;
  clear:()=>Promise<void>;
}>;
const DiagnosticContext=createContext<DiagnosticContextValue|null>(null);
type ErrorHandler=(error:Error,isFatal?:boolean)=>void;
type GlobalErrorUtils={getGlobalHandler?:()=>ErrorHandler;setGlobalHandler?:(handler:ErrorHandler)=>void};
function nativeCrashEvent(raw:string):DiagnosticEvent|null{
  try{
    const parsed=JSON.parse(raw) as Record<string,unknown>;
    const type=String(parsed.type??'unknown').replace(/[^a-zA-Z0-9_]/g,'').slice(0,70);
    const location=String(parsed.location??'unknown').replace(/[^a-zA-Z0-9_.:-]/g,'').slice(0,180);
    return {level:'fatal',code:'NATIVE_CRASH',screen:'android',message:'上次執行發生原生或全局致命異常',
      detail:'類型 '+type+'；位置 '+location+'；執行緒 '+String(parsed.thread??'unknown').slice(0,20)};
  }catch{return null;}
}
export function DiagnosticsProvider({children}:PropsWithChildren){
  const [entries,setEntries]=useState<DiagnosticEntry[]>(cache);
  useEffect(()=>{
    let alive=true;
    const listener:Listener=next=>{if(alive)setEntries(next);};
    listeners.add(listener);
    void reloadEntries().catch(()=>{});
    // Preserve the native fatal marker if AsyncStorage is full or unavailable.
    void readPendingNativeCrashJournal().then(async raw=>{
      if(!raw)return;
      const event=nativeCrashEvent(raw);
      if(!event)return;
      await enqueueWrite(event);
      await acknowledgeNativeCrashJournal();
    }).catch(()=>{});
    // React Native's global JS handler covers errors outside React render boundaries.
    // Always delegate to RN's previous handler so fatal errors are not swallowed.
    const globalObject=globalThis as typeof globalThis&{ErrorUtils?:GlobalErrorUtils};
    const errorUtils=globalObject.ErrorUtils;
    const previous=errorUtils?.getGlobalHandler?.();
    const handler:ErrorHandler=(error,isFatal)=>{
      const event:DiagnosticEvent={
        level:isFatal?'fatal':'error',code:isFatal?'JS_FATAL':'JS_UNHANDLED',screen:'app',
        message:'未攔截的 JavaScript 異常',
        detail:(error?.name??'Error')+' '+String(error?.stack??'').slice(0,300),
      };
      recordDiagnosticEvent(event);
      if(isFatal)saveCriticalNativeDiagnostic(event.code,event.screen);
      previous?.(error,isFatal);
    };
    if(errorUtils?.setGlobalHandler)errorUtils.setGlobalHandler(handler);
    return ()=>{
      alive=false;listeners.delete(listener);
      if(errorUtils?.setGlobalHandler&&previous)errorUtils.setGlobalHandler(previous);
    };
  },[]);
  const reload=useCallback(async()=>{await reloadEntries();},[]);
  const clear=useCallback(async()=>{await clearEntries();},[]);
  return <DiagnosticContext.Provider value={{entries,reload,clear}}>{children}</DiagnosticContext.Provider>;
}
export function useDiagnostics(){
  const context=useContext(DiagnosticContext);
  if(!context)throw new Error('useDiagnostics requires DiagnosticsProvider');
  return context;
}
