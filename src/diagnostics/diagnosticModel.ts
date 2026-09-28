/**
 * Local-only, bounded diagnostic journal. It never reads canonical finance data.
 * Entries use controlled event codes; raw exception messages are deliberately excluded.
 */
export const DIAGNOSTIC_STORAGE_KEY='@tf-asset/v3.1.3-diagnostic-journal';
export const DIAGNOSTIC_LIMIT=80;
export const DIAGNOSTIC_MAX_AGE_MS=14*24*60*60*1000;
export type DiagnosticLevel='info'|'warning'|'error'|'fatal';
export type DiagnosticEntry=Readonly<{
  id:string;at:number;level:DiagnosticLevel;code:string;screen:string;
  message:string;detail:string;
}>;
export type DiagnosticEvent=Readonly<{
  level:DiagnosticLevel;code:string;screen:string;message:string;detail?:string;
}>;
const validLevels:readonly DiagnosticLevel[]=['info','warning','error','fatal'];
const short=(v:unknown,length:number)=>typeof v==='string'?v.slice(0,length):'';
export function redactDiagnosticText(value:unknown,length=400):string{
  if(typeof value!=='string')return '';
  return value
    .replace(/(?:bearer\s+)[a-z0-9._~-]+/gi,'Bearer [redacted]')
    .replace(/(?:token|password|api[_-]?key|secret)\s*[:=]\s*[^\s,;}]+/gi,'credential=[redacted]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email]')
    .replace(/https?:\/\/[^\s)]+/gi,'[url]')
    .slice(0,length);
}
export function normalizeDiagnosticEntry(raw:unknown):DiagnosticEntry|null{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const value=raw as Record<string,unknown>;
  if(typeof value.at!=='number'||!Number.isFinite(value.at)||value.at<=0)return null;
  if(!validLevels.includes(value.level as DiagnosticLevel))return null;
  const code=short(value.code,56).replace(/[^A-Z0-9_]/g,'');
  const screen=short(value.screen,42).replace(/[^a-z0-9-]/g,'');
  const id=short(value.id,90).replace(/[^a-zA-Z0-9_-]/g,'');
  if(!id||!code||!screen)return null;
  return {id,at:value.at,level:value.level as DiagnosticLevel,code,screen,
    message:redactDiagnosticText(value.message,120),detail:redactDiagnosticText(value.detail,400)};
}
export function readDiagnosticEntries(raw:unknown):DiagnosticEntry[]{
  const source=Array.isArray(raw)?raw:[];
  return source.map(normalizeDiagnosticEntry).filter((entry):entry is DiagnosticEntry=>entry!==null);
}
export function appendDiagnosticEntries(
  current:readonly DiagnosticEntry[],incoming:readonly DiagnosticEntry[],now=Date.now(),
):DiagnosticEntry[]{
  const ids=new Set<string>();
  return [...incoming,...current]
    .filter(entry=>entry.at<=now+60_000&&entry.at>=now-DIAGNOSTIC_MAX_AGE_MS)
    .sort((a,b)=>b.at-a.at)
    .filter(entry=>{if(ids.has(entry.id))return false;ids.add(entry.id);return true;})
    .slice(0,DIAGNOSTIC_LIMIT);
}
export function createDiagnosticEntry(event:DiagnosticEvent,at:number,id:string):DiagnosticEntry{
  return normalizeDiagnosticEntry({...event,at,id,detail:event.detail??''})??{
    id,at,level:'error',code:'INVALID_EVENT',screen:'unknown',
    message:'診斷事件無效',detail:'',
  };
}
export function exportDiagnosticEntries(entries:readonly DiagnosticEntry[]):string{
  return JSON.stringify({schema:1,app:'TF Asset',version:'3.1.16',
    note:'僅含診斷事件與代碼，不含帳務紀錄；原生崩潰限 Java/Kotlin 可攔截範圍。',
    exportedAt:new Date().toISOString(),entries:entries.map(entry=>({...entry}))},null,2);
}
